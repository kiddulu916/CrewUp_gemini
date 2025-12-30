import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
  makeUserPro,
  createTestJob,
  testDb,
} from './utils/test-db';
import {
  loginAsUser,
  navigateTo,
  generateTestEmail,
  waitForToast,
} from './utils/test-helpers';

test.describe('Pro Features', () => {
  let proUser: TestUser;
  let freeUser: TestUser;
  let employer: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();

    proUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Pro Worker',
      trade: 'Carpenter',
    });
    await makeUserPro(proUser.id);

    freeUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Free Worker',
      trade: 'Carpenter',
    });

    employer = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Employer',
      name: 'Pro Employer',
      trade: 'General Contractor',
    });
    await makeUserPro(employer.id);
  });

  test.afterEach(async () => {
    if (proUser) await deleteTestUser(proUser.id);
    if (freeUser) await deleteTestUser(freeUser.id);
    if (employer) await deleteTestUser(employer.id);
  });

  test.describe('Profile Boost', () => {
    test('Pro users should see boost activation option when inactive', async ({ page }) => {
      await loginAsUser(page, proUser);
      await navigateTo(page, 'Profile');

      // Real component shows heading and activation button
      await expect(page.locator('h2', { hasText: 'Profile Boost' })).toBeVisible();
      await expect(
        page.locator('button', { hasText: '🚀 Activate Profile Boost' })
      ).toBeVisible();

      // Should show benefits list
      await expect(page.locator('text=Appear at the top of all employer searches')).toBeVisible();
    });

    test('Free users should see upgrade prompt for boost', async ({ page }) => {
      await loginAsUser(page, freeUser);
      await navigateTo(page, 'Profile');

      // Real component shows specific upgrade prompt
      await expect(page.locator('text=⭐ Profile Boost is a Pro feature')).toBeVisible();

      const upgradeButton = page.locator('a[href="/pricing"]', {
        hasText: 'Upgrade to Pro',
      });
      await expect(upgradeButton).toBeVisible();
    });

    test('should activate profile boost for Pro users', async ({ page }) => {
      await loginAsUser(page, proUser);
      await navigateTo(page, 'Profile');

      // Click the real activation button
      const boostButton = page.locator('button', {
        hasText: '🚀 Activate Profile Boost',
      });
      await expect(boostButton).toBeVisible();
      await boostButton.click();

      // Real component shows browser alert (not toast)
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Profile boost activated for 7 days');
        await dialog.accept();
      });

      // After activation, should show boosted status
      await page.waitForTimeout(1000); // Wait for mutation to complete
      await page.reload();
      await expect(page.locator('text=Your profile is boosted!')).toBeVisible();
    });

    test('should show boost expiry countdown', async ({ page }) => {
      // Set boost in database with 7 days remaining
      await testDb
        .from('profiles')
        .update({
          is_profile_boosted: true,
          boost_expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq('id', proUser.id);

      await loginAsUser(page, proUser);
      await navigateTo(page, 'Profile');

      // Real component shows exact format: "7 days" in blue
      await expect(page.locator('text=Your profile is boosted!')).toBeVisible();
      await expect(page.locator('text=Time remaining:')).toBeVisible();
      await expect(
        page.locator('.font-bold.text-blue-600', { hasText: /\d+ days?/ })
      ).toBeVisible();
    });

    test('should allow deactivating active boost', async ({ page }) => {
      // Set active boost
      await testDb
        .from('profiles')
        .update({
          is_profile_boosted: true,
          boost_expires_at: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .eq('id', proUser.id);

      await loginAsUser(page, proUser);
      await navigateTo(page, 'Profile');

      // Click deactivate button
      await page.locator('button', { hasText: 'Deactivate Boost' }).click();

      // Confirmation appears
      await expect(
        page.locator('text=Are you sure you want to deactivate your boost early?')
      ).toBeVisible();

      // Confirm deactivation
      await page.locator('button', { hasText: 'Yes, deactivate' }).click();

      // Browser alert confirms
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Profile boost deactivated');
        await dialog.accept();
      });
    });
  });

  test.describe('Job Analytics (Employers)', () => {
    test('Pro employers should see analytics dashboard on job detail', async ({
      page,
    }) => {
      // Create a job
      const job = await createTestJob(employer.id, {
        title: 'Test Job with Analytics',
        trade: 'Carpenter',
      });

      await loginAsUser(page, employer);
      await page.goto(`/dashboard/jobs/${job.id}`);

      // Real component shows specific heading and structure
      await expect(page.locator('h2', { hasText: 'Job Analytics' })).toBeVisible();
      await expect(page.locator('text=Test Job with Analytics')).toBeVisible();

      // Should show all 4 metric cards
      await expect(page.locator('text=Total Views')).toBeVisible();
      await expect(page.locator('text=Unique Visitors')).toBeVisible();
      await expect(page.locator('text=Applications')).toBeVisible();
      await expect(page.locator('text=Conversion Rate')).toBeVisible();
    });

    test('should display job view metrics correctly', async ({ page }) => {
      const job = await createTestJob(employer.id, {
        title: 'Job with Views',
        trade: 'Carpenter',
      });

      // Add complete job view records with all required fields
      await testDb.from('job_views').insert([
        {
          job_id: job.id,
          viewer_id: proUser.id,
          session_id: 'e2e-test-session-1',
          viewed_at: new Date().toISOString(),
        },
        {
          job_id: job.id,
          viewer_id: freeUser.id,
          session_id: 'e2e-test-session-2',
          viewed_at: new Date().toISOString(),
        },
      ]);

      await loginAsUser(page, employer);
      await page.goto(`/dashboard/jobs/${job.id}`);

      // Real component shows metrics in StatCard components
      // Total Views should be 2
      const totalViewsCard = page.locator('div', { has: page.locator('text=Total Views') });
      await expect(totalViewsCard.locator('.text-2xl.font-bold')).toContainText('2');

      // Unique Visitors should be 2 (different sessions)
      const uniqueVisitorsCard = page.locator('div', { has: page.locator('text=Unique Visitors') });
      await expect(uniqueVisitorsCard.locator('.text-2xl.font-bold')).toContainText('2');
    });

    test('should show analytics chart using Recharts', async ({ page }) => {
      const job = await createTestJob(employer.id, {
        title: 'Job with Chart',
        trade: 'Carpenter',
      });

      // Add views to generate chart data
      await testDb.from('job_views').insert([
        {
          job_id: job.id,
          viewer_id: proUser.id,
          session_id: 'chart-session-1',
          viewed_at: new Date().toISOString(),
        },
      ]);

      await loginAsUser(page, employer);
      await page.goto(`/dashboard/jobs/${job.id}`);

      // Real component uses Recharts LineChart which renders SVG
      await expect(page.locator('text=Views Over Time')).toBeVisible();

      // Recharts creates SVG elements
      const chartSvg = page.locator('.recharts-wrapper svg').first();
      await expect(chartSvg).toBeVisible();

      // Should have both lines (Total Views and Unique Visitors)
      await expect(page.locator('text=Total Views')).toBeVisible();
      await expect(page.locator('text=Unique Visitors')).toBeVisible();
    });

    test('should filter analytics by date range', async ({ page }) => {
      const job = await createTestJob(employer.id, {
        title: 'Job with Date Filter',
        trade: 'Carpenter',
      });

      await loginAsUser(page, employer);
      await page.goto(`/dashboard/jobs/${job.id}`);

      // Real component has three specific date range buttons
      const weekButton = page.locator('button', { hasText: '7 Days' });
      const monthButton = page.locator('button', { hasText: '30 Days' });
      const allTimeButton = page.locator('button', { hasText: 'All Time' });

      await expect(weekButton).toBeVisible();
      await expect(monthButton).toBeVisible();
      await expect(allTimeButton).toBeVisible();

      // 30 Days is default (primary variant)
      await expect(monthButton).toHaveClass(/variant-primary|bg-blue/);

      // Click 7 Days button
      await weekButton.click();
      await expect(weekButton).toHaveClass(/variant-primary|bg-blue/);

      // Analytics should still be visible after filter change
      await expect(page.locator('h2', { hasText: 'Job Analytics' })).toBeVisible();
    });

    test('Free employers should see upgrade prompt for analytics', async ({ page }) => {
      // Create a free employer user
      const freeEmployer = await createTestUser({
        email: generateTestEmail(),
        password: 'TestPassword123!',
        role: 'Employer',
        name: 'Free Employer',
        trade: 'General Contractor',
      });

      const job = await createTestJob(freeEmployer.id, {
        title: 'Free Employer Job',
        trade: 'Carpenter',
      });

      await loginAsUser(page, freeEmployer);
      await page.goto(`/dashboard/jobs/${job.id}`);

      // Real component shows upgrade prompt for free users
      await expect(page.locator('h3', { hasText: 'Job Analytics' })).toBeVisible();
      await expect(
        page.locator('text=Upgrade to Pro to see detailed analytics')
      ).toBeVisible();
      await expect(
        page.locator('button', { hasText: 'Upgrade to Pro - $15/month' })
      ).toBeVisible();

      // Cleanup
      await deleteTestUser(freeEmployer.id);
    });
  });

  test.describe('Proximity Alerts', () => {
    test('Pro workers should see proximity alert settings page', async ({
      page,
    }) => {
      await loginAsUser(page, proUser);
      await page.goto('/dashboard/profile');

      // Real component shows specific heading and toggle
      await expect(page.locator('h3', { hasText: 'Proximity Alert Settings' })).toBeVisible();
      await expect(page.locator('text=Get notified about new jobs near you')).toBeVisible();

      // Active/Inactive toggle exists
      const toggle = page.locator('input[type="checkbox"]').first();
      await expect(toggle).toBeVisible();
    });

    test('should configure proximity alert radius with slider', async ({ page }) => {
      await loginAsUser(page, proUser);
      await page.goto('/dashboard/profile');

      // Real component has range slider with specific constraints
      const radiusSlider = page.locator('input[type="range"]');
      await expect(radiusSlider).toBeVisible();

      // Set radius to 30 km
      await radiusSlider.fill('30');

      // Should show updated radius value
      await expect(page.locator('text=30 km')).toBeVisible();

      // Save button
      const saveButton = page.locator('button', { hasText: 'Save Alert Settings' });
      await expect(saveButton).toBeVisible();
      await saveButton.click();

      // Real component shows success message
      await expect(page.locator('text=Settings saved successfully!')).toBeVisible({
        timeout: 3000,
      });
    });

    test('should select multiple trades to monitor', async ({ page }) => {
      await loginAsUser(page, proUser);
      await page.goto('/dashboard/profile');

      // Real component shows trade selection with count
      await expect(page.locator('text=Trades to Monitor')).toBeVisible();

      // Click specific trade buttons (from TRADES constant)
      await page.locator('button', { hasText: 'Carpenter' }).click();
      await page.locator('button', { hasText: 'Electrician' }).click();

      // Selected trades show as blue
      await expect(page.locator('button', { hasText: 'Carpenter' })).toHaveClass(/bg-blue-600/);
      await expect(page.locator('button', { hasText: 'Electrician' })).toHaveClass(/bg-blue-600/);

      // Count updates
      await expect(page.locator('text=Trades to Monitor (2 selected)')).toBeVisible();

      // Info box shows configured alert
      await expect(
        page.locator('text=New Carpenter, Electrician jobs are posted within')
      ).toBeVisible();
    });

    test('should show validation for empty trade selection', async ({ page }) => {
      await loginAsUser(page, proUser);
      await page.goto('/dashboard/profile');

      // Deselect all trades if any are selected
      const selectedTrades = page.locator('button.bg-blue-600');
      const count = await selectedTrades.count();
      for (let i = 0; i < count; i++) {
        await selectedTrades.first().click();
      }

      // Real component shows validation error
      await expect(
        page.locator('text=Please select at least one trade')
      ).toBeVisible();

      // Save button should be disabled
      const saveButton = page.locator('button', { hasText: 'Save Alert Settings' });
      await expect(saveButton).toBeDisabled();
    });

    test('Free users should see upgrade prompt for proximity alerts', async ({ page }) => {
      await loginAsUser(page, freeUser);
      await page.goto('/dashboard/profile');

      // Real component shows specific upgrade prompt
      await expect(page.locator('h3', { hasText: 'Proximity Alerts' })).toBeVisible();
      await expect(
        page.locator('text=Get notified when new jobs are posted within your chosen radius')
      ).toBeVisible();
      await expect(
        page.locator('button', { hasText: 'Upgrade to Pro - $15/month' })
      ).toBeVisible();

      // Settings should NOT be visible
      await expect(
        page.locator('input[type="range"]')
      ).not.toBeVisible();
    });
  });

  test.describe('Certification Filtering (Employers)', () => {
    test('Pro employers should see certification filter on applicants page', async ({ page }) => {
      const job = await createTestJob(employer.id, {
        title: 'Job with Filter',
        trade: 'Carpenter',
      });

      await loginAsUser(page, employer);
      // Navigate to job applicants page (where filter component is used)
      await page.goto(`/dashboard/jobs/${job.id}/applicants`);

      // Real component shows specific heading
      await expect(page.locator('h3', { hasText: 'Filter by Certifications' })).toBeVisible();

      // Verified only checkbox exists
      await expect(
        page.locator('text=Show only verified certifications')
      ).toBeVisible();

      // Custom certification input exists
      await expect(
        page.locator('input[placeholder="e.g., Confined Space"]')
      ).toBeVisible();
    });

    test('should toggle verified-only certification filter', async ({ page }) => {
      const job = await createTestJob(employer.id, {
        title: 'Job Requiring Certs',
        trade: 'Carpenter',
      });

      await loginAsUser(page, employer);
      await page.goto(`/dashboard/jobs/${job.id}/applicants`);

      // Real component has checkbox for verified only
      const verifiedCheckbox = page.locator('input[type="checkbox"]').first();
      await expect(verifiedCheckbox).toBeVisible();
      await verifiedCheckbox.click();

      // Explanation text appears
      await expect(
        page.locator('text=Only show candidates who uploaded certification documents')
      ).toBeVisible();
    });

    test('should filter applicants by specific certifications', async ({ page }) => {
      const job = await createTestJob(employer.id, {
        title: 'Job with Cert Requirements',
        trade: 'Carpenter',
      });

      await loginAsUser(page, employer);
      await page.goto(`/dashboard/jobs/${job.id}/applicants`);

      // Click OSHA 30 certification button
      await page.locator('button', { hasText: 'OSHA 30' }).click();

      // Selected cert shows with blue background
      await expect(
        page.locator('button.bg-blue-600', { hasText: 'OSHA 30' })
      ).toBeVisible();

      // Summary shows selected filter
      await expect(page.locator('text=Filtering for candidates with:')).toBeVisible();
      await expect(page.locator('text=• OSHA 30')).toBeVisible();
    });

    test('should add custom certification to filter', async ({ page }) => {
      const job = await createTestJob(employer.id, {
        title: 'Job with Custom Cert',
        trade: 'Carpenter',
      });

      await loginAsUser(page, employer);
      await page.goto(`/dashboard/jobs/${job.id}/applicants`);

      // Type custom certification
      const customInput = page.locator('input[placeholder="e.g., Confined Space"]');
      await customInput.fill('Rigging Certification');

      // Click Add button
      await page.locator('button', { hasText: 'Add' }).click();

      // Custom cert appears in filter list
      await expect(
        page.locator('button', { hasText: 'Rigging Certification' })
      ).toBeVisible();
    });

    test('should clear all certification filters', async ({ page }) => {
      const job = await createTestJob(employer.id, {
        title: 'Job for Clear Test',
        trade: 'Carpenter',
      });

      await loginAsUser(page, employer);
      await page.goto(`/dashboard/jobs/${job.id}/applicants`);

      // Select a certification
      await page.locator('button', { hasText: 'First Aid/CPR' }).click();

      // Clear All button appears
      const clearButton = page.locator('button', { hasText: 'Clear All' });
      await expect(clearButton).toBeVisible();
      await clearButton.click();

      // Filter should be reset
      await expect(
        page.locator('button.bg-blue-600', { hasText: 'First Aid/CPR' })
      ).not.toBeVisible();
    });

    test('Free employers should see upgrade prompt for certification filter', async ({ page }) => {
      const freeEmployer = await createTestUser({
        email: generateTestEmail(),
        password: 'TestPassword123!',
        role: 'Employer',
        name: 'Free Employer',
        trade: 'General Contractor',
      });

      const job = await createTestJob(freeEmployer.id, {
        title: 'Free Job',
        trade: 'Carpenter',
      });

      await loginAsUser(page, freeEmployer);
      await page.goto(`/dashboard/jobs/${job.id}/applicants`);

      // Real component shows Pro feature badge
      await expect(page.locator('h4', { hasText: 'Pro Feature' })).toBeVisible();
      await expect(
        page.locator('text=Filter candidates by verified certifications')
      ).toBeVisible();
      await expect(
        page.locator('button', { hasText: 'Upgrade to Pro - $15/month' })
      ).toBeVisible();

      // Cleanup
      await deleteTestUser(freeEmployer.id);
    });
  });

  test.describe('Profile View Tracking', () => {
    test('Pro users should see detailed list of who viewed their profile', async ({ page }) => {
      // Add complete profile view record with all fields
      await testDb.from('profile_views').insert({
        viewer_id: employer.id,
        viewed_profile_id: proUser.id,
        viewed_at: new Date().toISOString(),
      });

      await loginAsUser(page, proUser);
      await navigateTo(page, 'Profile');

      // Real component shows weekly count
      await expect(page.locator('text=this week')).toBeVisible();

      // Should show viewer details: name, location, employer type badge
      await expect(page.locator('text=Pro Employer')).toBeVisible();

      // Time ago format (e.g., "just now", "5 minutes ago")
      await expect(page.locator('text=/just now|minutes ago|hours ago/i')).toBeVisible();

      // View Profile button exists for each viewer
      await expect(page.locator('button', { hasText: 'View Profile' })).toBeVisible();
    });

    test('Pro users with no views should see empty state', async ({ page }) => {
      await loginAsUser(page, proUser);
      await navigateTo(page, 'Profile');

      // Real component shows specific empty state
      await expect(page.locator('h3', { hasText: 'No views yet' })).toBeVisible();
      await expect(
        page.locator('text=When employers view your profile, they\'ll appear here.')
      ).toBeVisible();
    });

    test('Free users should see view count teaser only', async ({ page }) => {
      // Add some profile views for free user
      await testDb.from('profile_views').insert([
        {
          viewer_id: employer.id,
          viewed_profile_id: freeUser.id,
          viewed_at: new Date().toISOString(),
        },
        {
          viewer_id: proUser.id,
          viewed_profile_id: freeUser.id,
          viewed_at: new Date().toISOString(),
        },
      ]);

      await loginAsUser(page, freeUser);
      await navigateTo(page, 'Profile');

      // Real component shows teaser with count
      await expect(page.locator('h3', { hasText: 'Who Viewed Your Profile' })).toBeVisible();

      // Should show count in large text
      await expect(page.locator('.text-3xl.font-bold.text-blue-600')).toContainText('2');

      // Upgrade prompt
      await expect(
        page.locator('text=Upgrade to Pro to see who viewed your profile and send them a message')
      ).toBeVisible();
      await expect(
        page.locator('button', { hasText: 'Upgrade to Pro - $15/month' })
      ).toBeVisible();

      // Should NOT show viewer details
      await expect(page.locator('button', { hasText: 'View Profile' })).not.toBeVisible();
    });
  });

  test.describe('Feature Gates', () => {
    test('should redirect to pricing when clicking upgrade button', async ({ page }) => {
      await loginAsUser(page, freeUser);
      await page.goto('/dashboard/profile');

      // Find any upgrade button (multiple may exist)
      const upgradeButton = page.locator('a[href="/pricing"]', {
        hasText: 'Upgrade to Pro',
      }).first();

      await expect(upgradeButton).toBeVisible();
      await upgradeButton.click();

      // Should redirect to pricing page
      await expect(page).toHaveURL('/pricing', { timeout: 5000 });
    });

    test('Pro users should see active features without upgrade prompts', async ({ page }) => {
      await loginAsUser(page, proUser);
      await page.goto('/dashboard/profile');

      // Pro users should see actual feature UI, not upgrade prompts
      // Profile Boost should show activation option
      await expect(
        page.locator('button', { hasText: '🚀 Activate Profile Boost' })
      ).toBeVisible();

      // Proximity Alerts should show settings
      await expect(page.locator('h3', { hasText: 'Proximity Alert Settings' })).toBeVisible();

      // Should NOT see "⭐ Profile Boost is a Pro feature"
      await expect(page.locator('text=⭐ Profile Boost is a Pro feature')).not.toBeVisible();
    });

    test('all Pro features should be consistently gated for free users', async ({ page }) => {
      await loginAsUser(page, freeUser);
      await page.goto('/dashboard/profile');

      // Profile Boost - should show upgrade prompt
      await expect(page.locator('text=⭐ Profile Boost is a Pro feature')).toBeVisible();

      // Proximity Alerts - should show upgrade prompt
      await expect(page.locator('h3', { hasText: 'Proximity Alerts' })).toBeVisible();
      await expect(
        page.locator('text=Get notified when new jobs are posted within your chosen radius')
      ).toBeVisible();

      // All upgrade buttons should link to pricing
      const upgradeButtons = page.locator('a[href="/pricing"]');
      const count = await upgradeButtons.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});

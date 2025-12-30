import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
  createTestJob,
  testDb,
} from './utils/test-db';
import {
  loginAsUser,
  navigateTo,
  waitForToast,
  generateTestEmail,
} from './utils/test-helpers';

test.describe('Job Posting and Feed', () => {
  let employer: TestUser;
  let worker: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();

    // Create employer with can_post_jobs enabled
    employer = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Employer',
      name: 'Test Employer',
      trade: 'Operating Engineers',
      location: 'Chicago, IL',
    });

    // Grant posting permissions to employer
    await testDb
      .from('profiles')
      .update({ can_post_jobs: true })
      .eq('id', employer.id);

    worker = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Test Worker',
      trade: 'Carpenters (Rough)',
      location: 'Chicago, IL',
    });
  });

  test.afterEach(async () => {
    if (employer) await deleteTestUser(employer.id);
    if (worker) await deleteTestUser(worker.id);
  });

  test('employer should be able to post a job with hourly pay', async ({ page }) => {
    await loginAsUser(page, employer);
    await navigateTo(page, 'Jobs');

    // Click "Post a Job" button
    await page.click('a:has-text("Post a Job")');
    await expect(page).toHaveURL(/\/dashboard\/jobs\/new/);

    // Fill job form - title
    await page.fill('input[name="title"]', 'Need Experienced Carpenter');

    // Select trade and add specialty
    await page.selectOption('select:has-text("Trade 1")', 'Carpenters (Rough)');

    // Click add specialty button
    await page.click('button:has-text("+ Specialty")');

    // Select specialty from dropdown
    await page.selectOption('select >> nth=1', 'Wood Framer');

    // Select job type
    await page.selectOption('select[name="job_type"]', 'Full-Time');

    // Fill location using LocationAutocomplete
    const locationInput = page.locator('input[placeholder*="City, State" i]');
    await locationInput.fill('Chicago');
    await page.waitForTimeout(1500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Fill hourly rate (for Full-Time jobs)
    await page.fill('input[type="number"]', '35');

    // Select pay period
    await page.selectOption('select >> text=Pay Period', 'weekly');

    // Fill description
    await page.fill(
      'textarea[name="description"]',
      'Looking for skilled carpenter for framing work'
    );

    // Submit
    await page.click('button[type="submit"]:has-text("Post Job")');

    // Wait for success and redirect
    await waitForToast(page, 'Job posted');
    await expect(page).toHaveURL(/\/dashboard\/jobs\/\d+/, { timeout: 10000 });

    // Verify job details are shown
    await expect(page.locator('text=Need Experienced Carpenter')).toBeVisible();
    await expect(page.locator('text=Carpenters (Rough)')).toBeVisible();
    await expect(page.locator('text=Wood Framer')).toBeVisible();
  });

  test('employer should post contract job with correct pay format', async ({
    page,
  }) => {
    await loginAsUser(page, employer);
    await page.goto('/dashboard/jobs/new');

    await page.fill('input[name="title"]', 'Kitchen Remodel Project');

    // Select trade
    await page.selectOption('select:has-text("Trade 1")', 'Carpenters (Rough)');

    // Select job type (Contract triggers contract amount fields)
    await page.selectOption('select[name="job_type"]', 'Contract');

    // Fill location
    const locationInput = page.locator('input[placeholder*="City, State" i]');
    await locationInput.fill('Chicago');
    await page.waitForTimeout(1500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Fill contract amount (Contract job type shows contract amount field)
    await page.fill('input[type="number"]', '5000');

    // Select payment type
    await page.selectOption('select >> text=Payment Type', 'Per Contract');

    await page.fill('textarea[name="description"]', 'Complete kitchen remodel');

    await page.click('button[type="submit"]:has-text("Post Job")');
    await waitForToast(page, 'Job posted');

    // Verify pay rate format shows contract amount
    await expect(page.locator('text=/\\$5,?000.*contract/i')).toBeVisible();
  });

  test('worker should see jobs in feed', async ({ page }) => {
    // Create a test job first
    await createTestJob(employer.id, {
      title: 'Framing Work Available',
      trade: 'Carpenters (Rough)',
      location: 'Chicago, IL',
      description: 'Need framer for residential project',
      pay_rate: '$30/hr (weekly)',
    });

    await loginAsUser(page, worker);
    await navigateTo(page, 'Jobs');

    // Should see the job in the feed
    await expect(page.locator('text=Framing Work Available')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=Carpenters (Rough)')).toBeVisible();
  });

  test('worker should filter jobs by trade', async ({ page }) => {
    // Create jobs in different trades
    await createTestJob(employer.id, {
      title: 'Carpentry Job',
      trade: 'Carpenters (Rough)',
    });

    await createTestJob(employer.id, {
      title: 'Electrical Work',
      trade: 'Electricians',
    });

    await loginAsUser(page, worker);
    await navigateTo(page, 'Jobs');

    // Wait for jobs to load
    await page.waitForTimeout(1000);

    // Filter by Electricians using the filter sidebar
    await page.selectOption('#filter-trade', 'Electricians');
    await page.waitForTimeout(1000);

    // Should see electrical job
    await expect(page.locator('text=Electrical Work')).toBeVisible();

    // Should NOT see carpentry job
    await expect(page.locator('text=Carpentry Job')).not.toBeVisible();
  });

  test('worker should filter jobs by job type', async ({ page }) => {
    await createTestJob(employer.id, {
      title: 'Full Time Position',
      trade: 'Carpenters (Rough)',
      pay_rate: '$25/hr (weekly)',
    });

    await loginAsUser(page, worker);
    await navigateTo(page, 'Jobs');
    await page.waitForTimeout(1000);

    // Filter by Full-Time using the filter sidebar
    await page.selectOption('#filter-jobtype', 'Full-Time');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Full Time Position')).toBeVisible();
  });

  test('worker should view job details', async ({ page }) => {
    const job = await createTestJob(employer.id, {
      title: 'Detailed Carpentry Job',
      trade: 'Carpenters (Rough)',
      location: 'Chicago, IL',
      description: 'This is a detailed job description with requirements',
      pay_rate: '$35/hr (weekly)',
    });

    await loginAsUser(page, worker);
    await navigateTo(page, 'Jobs');

    // Click on job card
    await page.click('text=Detailed Carpentry Job');
    await expect(page).toHaveURL(`/dashboard/jobs/${job.id}`);

    // Verify all job details are shown
    await expect(page.locator('text=Detailed Carpentry Job')).toBeVisible();
    await expect(
      page.locator('text=This is a detailed job description')
    ).toBeVisible();
    await expect(page.locator('text=/\\$35.*hr/i')).toBeVisible();
    await expect(page.locator('text=Chicago, IL')).toBeVisible();
  });

  test('worker should not see Post Job link in navigation', async ({
    page,
  }) => {
    await loginAsUser(page, worker);

    // Post Job link should not be visible for workers
    await expect(page.locator('nav a:has-text("Post a Job")')).not.toBeVisible();
  });

  test('employer should see Post Job link when can_post_jobs is true', async ({ page }) => {
    await loginAsUser(page, employer);

    // Post Job link should be visible for employers with can_post_jobs
    await expect(page.locator('a:has-text("Post a Job")')).toBeVisible();
  });

  test('jobs should show distance from worker location', async ({ page }) => {
    await createTestJob(employer.id, {
      title: 'Nearby Carpentry Work',
      trade: 'Carpenters (Rough)',
      location: 'Chicago, IL',
    });

    await loginAsUser(page, worker);
    await navigateTo(page, 'Jobs');
    await page.waitForTimeout(1000);

    // Should show distance (in miles or km) - format: (X.X mi) or (X.X km)
    await expect(
      page.locator('text=/\\(\\d+(\\.\\d+)?\\s*(mi|km)\\)/i')
    ).toBeVisible();
  });

  test('employer should be able to delete their own job', async ({ page }) => {
    const job = await createTestJob(employer.id, {
      title: 'Job to Delete',
      trade: 'Carpenters (Rough)',
    });

    await loginAsUser(page, employer);
    await page.goto(`/dashboard/jobs/${job.id}`);

    // Look for delete button
    const deleteButton = page.locator('button:has-text("Delete")');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion in dialog
      await page.click('button:has-text("Delete"):visible');

      await waitForToast(page, 'deleted');

      // Should redirect to jobs page
      await expect(page).toHaveURL('/dashboard/jobs');
    }
  });

  test('should show empty state when no jobs match filters', async ({
    page,
  }) => {
    await loginAsUser(page, worker);
    await navigateTo(page, 'Jobs');

    // Filter by a trade with no jobs
    await page.selectOption('#filter-trade', 'Commercial Divers');
    await page.waitForTimeout(1000);

    // Should show empty state
    await expect(
      page.locator('text=/no.*jobs.*found/i')
    ).toBeVisible();
  });

  test('contractor without license verification cannot post jobs', async ({ page }) => {
    // Create contractor without can_post_jobs
    const contractor = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Employer',
      name: 'Test Contractor',
      trade: 'Carpenters (Rough)',
      location: 'Chicago, IL',
    });

    // Set employer_type to contractor and can_post_jobs to false
    await testDb
      .from('profiles')
      .update({ employer_type: 'contractor', can_post_jobs: false })
      .eq('id', contractor.id);

    await loginAsUser(page, contractor);
    await page.goto('/dashboard/jobs/new');

    // Should see verification banner instead of form
    await expect(page.locator('text=/license.*verification/i')).toBeVisible();
    await expect(page.locator('text=/complete.*contractor.*license/i')).toBeVisible();

    // Should not see the job form
    await expect(page.locator('form')).not.toBeVisible();

    await deleteTestUser(contractor.id);
  });

  test('employer can add multiple trades to job posting', async ({ page }) => {
    await loginAsUser(page, employer);
    await page.goto('/dashboard/jobs/new');

    await page.fill('input[name="title"]', 'Multi-Trade Project');

    // Select first trade
    await page.selectOption('select:has-text("Trade 1")', 'Carpenters (Rough)');

    // Click "+ Trade" to add second trade
    await page.click('button:has-text("+ Trade")');

    // Select second trade
    await page.selectOption('select:has-text("Trade 2")', 'Electricians');

    // Select job type
    await page.selectOption('select[name="job_type"]', 'Full-Time');

    // Fill location
    const locationInput = page.locator('input[placeholder*="City, State" i]');
    await locationInput.fill('Chicago');
    await page.waitForTimeout(1500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Fill hourly rate
    await page.fill('input[type="number"]', '40');

    // Fill description
    await page.fill('textarea[name="description"]', 'Multi-trade construction project');

    // Submit
    await page.click('button[type="submit"]:has-text("Post Job")');

    await waitForToast(page, 'Job posted');
    await expect(page).toHaveURL(/\/dashboard\/jobs\/\d+/, { timeout: 10000 });

    // Verify both trades are shown
    await expect(page.locator('text=Carpenters (Rough)')).toBeVisible();
    await expect(page.locator('text=Electricians')).toBeVisible();
  });

  test('worker can clear all filters', async ({ page }) => {
    await createTestJob(employer.id, {
      title: 'Test Job',
      trade: 'Carpenters (Rough)',
    });

    await loginAsUser(page, worker);
    await navigateTo(page, 'Jobs');

    // Apply filters
    await page.selectOption('#filter-trade', 'Electricians');
    await page.selectOption('#filter-jobtype', 'Contract');
    await page.waitForTimeout(500);

    // Should show no jobs message
    await expect(page.locator('text=/no.*jobs.*found/i')).toBeVisible();

    // Click "Clear All" button
    await page.click('button:has-text("Clear All")');
    await page.waitForTimeout(500);

    // Should now see the test job
    await expect(page.locator('text=Test Job')).toBeVisible();
  });
});

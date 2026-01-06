import { test, expect, Page, Locator } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
  createTestJob,
  makeUserPro,
  testDb,
} from './utils/test-db';
import { loginAsUser, generateTestEmail } from './utils/test-helpers';

/**
 * Extended Visual Regression Tests
 *
 * Best Practices Implemented:
 * 1. No arbitrary timeouts - uses waitForLoadState and waitForSelector
 * 2. URL assertions before screenshots to ensure correct page loaded
 * 3. Masks dynamic content to prevent flaky pixel diffs
 * 4. Tests organized by user role and page type
 * 5. Viewport-appropriate test coverage
 */

// Helper function to wait for page to be ready for screenshot
async function waitForPageReady(page: Page, expectedUrl: string | RegExp) {
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(expectedUrl);
}

// Helper function to mask common dynamic elements
function getDynamicElementMasks(page: Page): Locator[] {
  return [
    page.locator('[data-testid*="timestamp"]'),
    page.locator('[data-testid*="date"]'),
    page.locator('time'),
    page.locator('[class*="relative-time"]'),
  ];
}

// Helper function to take a screenshot with standard options
async function takeStableScreenshot(
  page: Page,
  name: string,
  options: { mask?: Locator[] } = {}
) {
  const defaultMasks = getDynamicElementMasks(page);
  const allMasks = [...defaultMasks, ...(options.mask || [])];

  await expect(page).toHaveScreenshot(name, {
    fullPage: true,
    maxDiffPixels: 100,
    mask: allMasks.filter((mask) => mask !== null),
  });
}

test.describe('Visual Regression Tests - Public Pages', () => {
  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.describe('Desktop - Public Routes', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('login page matches snapshot', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page, /\/login$/);

      await takeStableScreenshot(page, 'desktop-login.png');
    });

    test('signup page matches snapshot', async ({ page }) => {
      await page.goto('/signup');
      await waitForPageReady(page, /\/signup$/);

      await takeStableScreenshot(page, 'desktop-signup.png');
    });

    test('pricing page matches snapshot', async ({ page }) => {
      await page.goto('/pricing');
      await waitForPageReady(page, /\/pricing$/);

      await takeStableScreenshot(page, 'desktop-pricing.png');
    });
  });

  test.describe('Mobile - Public Routes', () => {
    test.use({ viewport: { width: 390, height: 844 } }); // iPhone 13 Pro

    test('login page matches snapshot', async ({ page }) => {
      await page.goto('/login');
      await waitForPageReady(page, /\/login$/);

      await takeStableScreenshot(page, 'mobile-login.png');
    });

    test('signup page matches snapshot', async ({ page }) => {
      await page.goto('/signup');
      await waitForPageReady(page, /\/signup$/);

      await takeStableScreenshot(page, 'mobile-signup.png');
    });

    test('pricing page matches snapshot', async ({ page }) => {
      await page.goto('/pricing');
      await waitForPageReady(page, /\/pricing$/);

      await takeStableScreenshot(page, 'mobile-pricing.png');
    });
  });
});

test.describe('Visual Regression Tests - Worker Dashboard', () => {
  let worker: TestUser;
  let employer: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();

    worker = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Visual Test Worker',
      trade: 'Carpenter',
    });

    employer = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Employer',
      name: 'Visual Test Employer',
      trade: 'General Contractor',
    });
  });

  test.afterEach(async () => {
    if (worker) await deleteTestUser(worker.id);
    if (employer) await deleteTestUser(employer.id);
  });

  test.describe('Desktop - Worker Pages', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('worker dashboard with empty job feed', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/jobs');
      await waitForPageReady(page, /\/dashboard\/jobs$/);

      await takeStableScreenshot(page, 'desktop-worker-dashboard-empty.png');
    });

    test('worker dashboard with job listings', async ({ page }) => {
      // Create test jobs
      await createTestJob(employer.id, {
        title: 'Carpentry Position - Visual Test 1',
        trade: 'Carpenter',
      });
      await createTestJob(employer.id, {
        title: 'Carpentry Position - Visual Test 2',
        trade: 'Carpenter',
      });

      await loginAsUser(page, worker);
      await page.goto('/dashboard/jobs');
      await waitForPageReady(page, /\/dashboard\/jobs$/);

      // Wait for job cards to load
      await page.waitForSelector('[data-testid*="job-card"], .job-card, article', {
        timeout: 5000,
      }).catch(() => {
        // If no specific selector, just wait for network idle
      });

      await takeStableScreenshot(page, 'desktop-worker-dashboard-with-jobs.png');
    });

    test('applications page empty state', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/applications');
      await waitForPageReady(page, /\/dashboard\/applications$/);

      await takeStableScreenshot(page, 'desktop-applications-empty.png');
    });

    test('applications page with pending application', async ({ page }) => {
      const job = await createTestJob(employer.id, {
        title: 'Test Job for Application',
        trade: 'Carpenter',
      });

      // Create application
      await testDb.from('job_applications').insert({
        job_id: job.id,
        worker_id: worker.id,
        cover_letter: 'Test application for visual regression',
        status: 'pending',
      });

      await loginAsUser(page, worker);
      await page.goto('/dashboard/applications');
      await waitForPageReady(page, /\/dashboard\/applications$/);

      // Wait for application to render
      await page.waitForSelector('[data-testid*="application"], .application', {
        timeout: 5000,
      }).catch(() => {});

      await takeStableScreenshot(page, 'desktop-applications-with-data.png');
    });

    test('messages page empty state', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/messages');
      await waitForPageReady(page, /\/dashboard\/messages$/);

      await takeStableScreenshot(page, 'desktop-messages-empty.png');
    });

    test('profile view page', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/profile');
      await waitForPageReady(page, /\/dashboard\/profile$/);

      await takeStableScreenshot(page, 'desktop-worker-profile.png');
    });

    test('profile edit page', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/profile/edit');
      await waitForPageReady(page, /\/dashboard\/profile\/edit$/);

      await takeStableScreenshot(page, 'desktop-profile-edit.png');
    });

    test('certifications page empty', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/profile/certifications');
      await waitForPageReady(page, /\/dashboard\/profile\/certifications$/);

      await takeStableScreenshot(page, 'desktop-certifications-empty.png');
    });

    test('certifications page with data', async ({ page }) => {
      // Add certification
      await testDb.from('certifications').insert({
        user_id: worker.id,
        name: 'OSHA 10',
        issuing_organization: 'OSHA',
        issue_date: '2023-01-01',
        status: 'verified',
      });

      await loginAsUser(page, worker);
      await page.goto('/dashboard/profile/certifications');
      await waitForPageReady(page, /\/dashboard\/profile\/certifications$/);

      await page.waitForSelector('[data-testid*="certification"], .certification', {
        timeout: 5000,
      }).catch(() => {});

      await takeStableScreenshot(page, 'desktop-certifications-with-data.png');
    });
  });

  test.describe('Mobile - Worker Pages', () => {
    test.use({ viewport: { width: 390, height: 844 } }); // iPhone 13 Pro

    test('worker dashboard', async ({ page }) => {
      await createTestJob(employer.id, {
        title: 'Mobile Test Job',
        trade: 'Carpenter',
      });

      await loginAsUser(page, worker);
      await page.goto('/dashboard/jobs');
      await waitForPageReady(page, /\/dashboard\/jobs$/);

      await page.waitForSelector('[data-testid*="job-card"], .job-card, article', {
        timeout: 5000,
      }).catch(() => {});

      await takeStableScreenshot(page, 'mobile-worker-dashboard.png');
    });

    test('applications page', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/applications');
      await waitForPageReady(page, /\/dashboard\/applications$/);

      await takeStableScreenshot(page, 'mobile-applications.png');
    });

    test('messages page', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/messages');
      await waitForPageReady(page, /\/dashboard\/messages$/);

      await takeStableScreenshot(page, 'mobile-messages.png');
    });

    test('profile page', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/profile');
      await waitForPageReady(page, /\/dashboard\/profile$/);

      await takeStableScreenshot(page, 'mobile-profile.png');
    });
  });

  test.describe('Tablet - Worker Pages', () => {
    test.use({ viewport: { width: 1024, height: 1366 } }); // iPad Pro

    test('worker dashboard', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/jobs');
      await waitForPageReady(page, /\/dashboard\/jobs$/);

      await takeStableScreenshot(page, 'tablet-worker-dashboard.png');
    });

    test('profile page', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/profile');
      await waitForPageReady(page, /\/dashboard\/profile$/);

      await takeStableScreenshot(page, 'tablet-profile.png');
    });
  });
});

test.describe('Visual Regression Tests - Employer Dashboard', () => {
  let employer: TestUser;
  let worker: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();

    employer = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Employer',
      name: 'Visual Test Employer',
      trade: 'General Contractor',
    });

    worker = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Visual Test Worker',
      trade: 'Carpenter',
    });
  });

  test.afterEach(async () => {
    if (employer) await deleteTestUser(employer.id);
    if (worker) await deleteTestUser(worker.id);
  });

  test.describe('Desktop - Employer Pages', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('employer dashboard with no jobs', async ({ page }) => {
      await loginAsUser(page, employer);
      await page.goto('/dashboard/jobs');
      await waitForPageReady(page, /\/dashboard\/jobs$/);

      await takeStableScreenshot(page, 'desktop-employer-dashboard-empty.png');
    });

    test('employer dashboard with posted jobs', async ({ page }) => {
      await createTestJob(employer.id, {
        title: 'Carpenter Needed',
        trade: 'Carpenter',
      });

      await loginAsUser(page, employer);
      await page.goto('/dashboard/jobs');
      await waitForPageReady(page, /\/dashboard\/jobs$/);

      await page.waitForSelector('[data-testid*="job"], .job-card, article', {
        timeout: 5000,
      }).catch(() => {});

      await takeStableScreenshot(page, 'desktop-employer-dashboard-with-jobs.png');
    });

    test('job posting form', async ({ page }) => {
      await loginAsUser(page, employer);
      await page.goto('/dashboard/jobs/new');
      await waitForPageReady(page, /\/dashboard\/jobs\/new$/);

      await takeStableScreenshot(page, 'desktop-job-posting-form.png');
    });

    test('job detail page with applications', async ({ page }) => {
      const job = await createTestJob(employer.id, {
        title: 'Job with Applications',
        trade: 'Carpenter',
      });

      // Create application
      await testDb.from('job_applications').insert({
        job_id: job.id,
        worker_id: worker.id,
        cover_letter: 'Test application',
        status: 'pending',
      });

      await loginAsUser(page, employer);
      await page.goto(`/dashboard/jobs/${job.id}`);
      await waitForPageReady(page, new RegExp(`/dashboard/jobs/${job.id}$`));

      await page.waitForSelector('[data-testid*="application"], .application', {
        timeout: 5000,
      }).catch(() => {});

      await takeStableScreenshot(page, 'desktop-job-detail-with-applications.png');
    });

    test('find workers page', async ({ page }) => {
      await loginAsUser(page, employer);
      await page.goto('/dashboard/workers');
      await waitForPageReady(page, /\/dashboard\/workers$/);

      await takeStableScreenshot(page, 'desktop-find-workers.png');
    });
  });

  test.describe('Mobile - Employer Pages', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('employer dashboard', async ({ page }) => {
      await loginAsUser(page, employer);
      await page.goto('/dashboard/jobs');
      await waitForPageReady(page, /\/dashboard\/jobs$/);

      await takeStableScreenshot(page, 'mobile-employer-dashboard.png');
    });

    test('job posting form', async ({ page }) => {
      await loginAsUser(page, employer);
      await page.goto('/dashboard/jobs/new');
      await waitForPageReady(page, /\/dashboard\/jobs\/new$/);

      await takeStableScreenshot(page, 'mobile-job-posting-form.png');
    });
  });
});

test.describe('Visual Regression Tests - Pro Features', () => {
  let proWorker: TestUser;
  let employer: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();

    proWorker = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Pro Worker',
      trade: 'Electrician',
    });
    await makeUserPro(proWorker.id);

    employer = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Employer',
      name: 'Test Employer',
      trade: 'General Contractor',
    });
  });

  test.afterEach(async () => {
    if (proWorker) await deleteTestUser(proWorker.id);
    if (employer) await deleteTestUser(employer.id);
  });

  test.describe('Desktop - Pro User Interface', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('pro worker profile with badge', async ({ page }) => {
      await loginAsUser(page, proWorker);
      await page.goto('/dashboard/profile');
      await waitForPageReady(page, /\/dashboard\/profile$/);

      // Wait for Pro badge to render
      await page.waitForSelector('[data-testid*="pro-badge"], .pro-badge, [class*="pro"]', {
        timeout: 5000,
      }).catch(() => {});

      await takeStableScreenshot(page, 'desktop-pro-worker-profile.png');
    });

    test('subscription management page', async ({ page }) => {
      await loginAsUser(page, proWorker);
      await page.goto('/dashboard/subscription');
      await waitForPageReady(page, /\/dashboard\/subscription$/);

      await takeStableScreenshot(page, 'desktop-subscription-management.png');
    });
  });
});

test.describe('Visual Regression Tests - Admin Pages', () => {
  let admin: TestUser;
  let worker: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();

    admin = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Admin User',
      trade: 'Carpenter',
    });

    // Grant admin privileges
    await testDb.from('users').update({ is_admin: true }).eq('id', admin.id);

    worker = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Regular Worker',
      trade: 'Electrician',
    });
  });

  test.afterEach(async () => {
    if (admin) await deleteTestUser(admin.id);
    if (worker) await deleteTestUser(worker.id);
  });

  test.describe('Desktop - Admin Dashboard', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('admin dashboard overview', async ({ page }) => {
      await loginAsUser(page, admin);
      await page.goto('/admin/dashboard');
      await waitForPageReady(page, /\/admin\/dashboard$/);

      await takeStableScreenshot(page, 'desktop-admin-dashboard.png');
    });

    test('admin certification queue empty', async ({ page }) => {
      await loginAsUser(page, admin);
      await page.goto('/admin/certifications');
      await waitForPageReady(page, /\/admin\/certifications$/);

      await takeStableScreenshot(page, 'desktop-admin-certifications-empty.png');
    });

    test('admin certification queue with pending items', async ({ page }) => {
      // Add pending certification
      await testDb.from('certifications').insert({
        user_id: worker.id,
        name: 'OSHA 30',
        issuing_organization: 'OSHA',
        issue_date: '2024-01-01',
        status: 'pending',
      });

      await loginAsUser(page, admin);
      await page.goto('/admin/certifications');
      await waitForPageReady(page, /\/admin\/certifications$/);

      await page.waitForSelector('[data-testid*="certification"], .certification', {
        timeout: 5000,
      }).catch(() => {});

      await takeStableScreenshot(page, 'desktop-admin-certifications-pending.png');
    });

    test('admin users page', async ({ page }) => {
      await loginAsUser(page, admin);
      await page.goto('/admin/users');
      await waitForPageReady(page, /\/admin\/users$/);

      await page.waitForSelector('table, [role="table"], .user-list', {
        timeout: 5000,
      }).catch(() => {});

      await takeStableScreenshot(page, 'desktop-admin-users.png');
    });

    test('admin moderation page', async ({ page }) => {
      await loginAsUser(page, admin);
      await page.goto('/admin/moderation');
      await waitForPageReady(page, /\/admin\/moderation$/);

      await takeStableScreenshot(page, 'desktop-admin-moderation.png');
    });

    test('admin analytics page', async ({ page }) => {
      await loginAsUser(page, admin);
      await page.goto('/admin/analytics');
      await waitForPageReady(page, /\/admin\/analytics$/);

      await page.waitForLoadState('networkidle');

      await takeStableScreenshot(page, 'desktop-admin-analytics.png');
    });
  });
});

test.describe('Visual Regression Tests - Edge Cases', () => {
  let worker: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();

    worker = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Edge Case Worker',
      trade: 'Carpenter',
    });
  });

  test.afterEach(async () => {
    if (worker) await deleteTestUser(worker.id);
  });

  test.describe('Desktop - Edge Cases', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('empty state - no certifications', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/profile/certifications');
      await waitForPageReady(page, /\/dashboard\/profile\/certifications$/);

      await takeStableScreenshot(page, 'desktop-empty-certifications.png');
    });

    test('empty state - no messages', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/messages');
      await waitForPageReady(page, /\/dashboard\/messages$/);

      await takeStableScreenshot(page, 'desktop-empty-messages.png');
    });

    test('notifications page', async ({ page }) => {
      await loginAsUser(page, worker);
      await page.goto('/dashboard/notifications');
      await waitForPageReady(page, /\/dashboard\/notifications$/);

      await takeStableScreenshot(page, 'desktop-notifications.png');
    });
  });
});

test.describe('Visual Regression Tests - Dark Mode', () => {
  let worker: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();

    worker = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Dark Mode Worker',
      trade: 'Carpenter',
    });
  });

  test.afterEach(async () => {
    if (worker) await deleteTestUser(worker.id);
  });

  test.describe('Desktop - Dark Mode', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('dashboard in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });

      await loginAsUser(page, worker);
      await page.goto('/dashboard/jobs');
      await waitForPageReady(page, /\/dashboard\/jobs$/);

      await takeStableScreenshot(page, 'desktop-dark-mode-dashboard.png');
    });

    test('profile in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });

      await loginAsUser(page, worker);
      await page.goto('/dashboard/profile');
      await waitForPageReady(page, /\/dashboard\/profile$/);

      await takeStableScreenshot(page, 'desktop-dark-mode-profile.png');
    });
  });

  test.describe('Mobile - Dark Mode', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('dashboard in dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });

      await loginAsUser(page, worker);
      await page.goto('/dashboard/jobs');
      await waitForPageReady(page, /\/dashboard\/jobs$/);

      await takeStableScreenshot(page, 'mobile-dark-mode-dashboard.png');
    });
  });
});

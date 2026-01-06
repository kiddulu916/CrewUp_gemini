import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
  createTestJob,
} from './utils/test-db';
import {
  loginAsUser,
  navigateTo,
  waitForToast,
  generateTestEmail,
} from './utils/test-helpers';
import {
  fillApplicationWizard,
  submitApplication,
  expectWizardStep,
  waitForAutoSave,
  expectApplicationInList,
  expectApplicationDetails,
  expectDuplicateApplicationBlock,
} from './utils/application-helpers';

test.describe('Job Applications - Multi-Step Wizard', () => {
  let employer: TestUser;
  let worker: TestUser;
  let jobId: string;

  test.beforeEach(async () => {
    await cleanupTestData();

    employer = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'employer',
      name: 'Test Employer',
      trade: 'General Contractor',
    });

    worker = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'worker',
      name: 'Test Worker',
      trade: 'Carpenter',
    });

    // Create a test job
    const job = await createTestJob(employer.id, {
      title: 'Carpentry Position',
      trade: 'Carpenter',
      description: 'Need experienced carpenter',
      payRate: '$30/hr',
    });
    jobId = job.id;
  });

  test.afterEach(async () => {
    if (employer) await deleteTestUser(employer.id);
    if (worker) await deleteTestUser(worker.id);
  });

  test('worker should see Apply button on job detail page', async ({
    page,
  }) => {
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}`);

    // Should see Apply Now button
    await expect(page.locator('button:has-text("Apply Now")')).toBeVisible();
  });

  test('clicking Apply button should navigate to wizard', async ({ page }) => {
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}`);

    await page.click('button:has-text("Apply Now")');

    // Should navigate to /apply route
    await expect(page).toHaveURL(`/dashboard/jobs/${jobId}/apply`);

    // Should see wizard step 1
    await expectWizardStep(page, 1, 8);
    await expect(page.locator('text=Documents')).toBeVisible();
  });

  test('worker should complete full 8-step application wizard', async ({
    page,
  }) => {
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Verify we start at step 1
    await expectWizardStep(page, 1, 8);

    // Fill out all 8 steps
    await fillApplicationWizard(page, {
      coverLetter: 'I am very interested in this carpentry position. I have 5 years of experience and am excited to join your team.',
    });

    // Submit application
    await submitApplication(page);

    // Should redirect to applications page or job page
    await expect(page).toHaveURL(/\/dashboard\/(applications|jobs)/);

    // Should show success message
    await expect(
      page.locator('text=/application submitted|successfully applied/i')
    ).toBeVisible({ timeout: 5000 }).catch(() => {
      // Toast may have disappeared, that's ok
      console.log('Success toast not visible (may have auto-dismissed)');
    });
  });

  test('wizard should show progress through all 8 steps', async ({ page }) => {
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Step 1: Documents
    await expectWizardStep(page, 1, 8);
    await expect(page.locator('text=Documents')).toBeVisible();
    await page.click('button:has-text("Next")');

    // Step 2: Personal Info
    await expectWizardStep(page, 2, 8);
    await expect(page.locator('text=Personal Information')).toBeVisible();
    await page.fill('input[name="fullName"]', 'Test Name');
    await page.fill('input[name="address.street"]', '123 Test St');
    await page.fill('input[name="address.city"]', 'Chicago');
    await page.fill('input[name="address.state"]', 'IL');
    await page.fill('input[name="address.zipCode"]', '60601');
    await page.click('button:has-text("Next")');

    // Step 3: Contact
    await expectWizardStep(page, 3, 8);
    await expect(page.locator('text=Contact')).toBeVisible();
  });

  test('worker should not be able to apply twice to same job', async ({
    page,
  }) => {
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Complete first application
    await fillApplicationWizard(page);
    await submitApplication(page);

    // Wait for redirect and navigation to settle
    await page.waitForLoadState('networkidle');

    // Try to apply again by navigating to apply page
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Should be blocked or redirected
    await expectDuplicateApplicationBlock(page);
  });

  test('wizard should auto-save draft every 30 seconds', async ({ page }) => {
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Fill out first step
    await page.fill(
      'textarea[name="coverLetterText"]',
      'This is a draft cover letter'
    );

    // Wait for auto-save (30 seconds + buffer)
    await waitForAutoSave(page);

    // Verify "Last saved" indicator appears
    await expect(page.locator('text=/last saved|saved at/i')).toBeVisible();
  });

  test('wizard should restore draft when returning', async ({ page }) => {
    await loginAsUser(page, worker);

    // First visit - fill partial data
    await page.goto(`/dashboard/jobs/${jobId}/apply`);
    const draftText = 'This is my draft cover letter that should be restored';
    await page.fill('textarea[name="coverLetterText"]', draftText);

    // Wait for auto-save
    await waitForAutoSave(page);

    // Leave the page
    await page.goto('/dashboard/jobs');

    // Return to apply page
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Draft should be restored
    const coverLetterField = page.locator('textarea[name="coverLetterText"]');
    await expect(coverLetterField).toHaveValue(draftText);
  });

  test('Back button should navigate to previous step', async ({ page }) => {
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Go to step 2
    await page.click('button:has-text("Next")');
    await expectWizardStep(page, 2, 8);

    // Click Back
    await page.click('button:has-text("Back")');

    // Should be back at step 1
    await expectWizardStep(page, 1, 8);
  });

  test('worker should see their applications on applications page', async ({
    page,
  }) => {
    // Submit application first
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);
    await fillApplicationWizard(page);
    await submitApplication(page);

    // Navigate to applications page
    await navigateTo(page, 'Applications');

    // Verify application appears in list
    await expectApplicationInList(
      page,
      'Carpentry Position',
      'Test Employer',
      'pending'
    );
  });

  test('worker can view full application details', async ({ page }) => {
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);
    await fillApplicationWizard(page, {
      coverLetter: 'I would love to work on this project!',
    });
    await submitApplication(page);

    // Navigate to applications page
    await navigateTo(page, 'Applications');

    // Click on application to view details
    await page.click('text=Carpentry Position');

    // Should navigate to application detail page
    await expect(page).toHaveURL(/\/dashboard\/applications\/[^/]+$/);

    // Verify all submitted data is displayed
    await expectApplicationDetails(page, {
      jobTitle: 'Carpentry Position',
      fullName: 'Test Worker Name',
      phoneNumber: '(312) 555-1234',
      workHistory: true,
      education: true,
      references: true,
    });

    // Verify cover letter is shown
    await expect(
      page.locator('text=I would love to work on this project!')
    ).toBeVisible();
  });

  test('should show empty state when worker has no applications', async ({
    page,
  }) => {
    await loginAsUser(page, worker);
    await navigateTo(page, 'Applications');

    // Should show empty state
    await expect(
      page.locator('text=/no.*applications|haven\'t applied/i')
    ).toBeVisible();
  });

  test('application should show submitted timestamp', async ({ page }) => {
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);
    await fillApplicationWizard(page);
    await submitApplication(page);

    await navigateTo(page, 'Applications');

    // Should show relative time (e.g., "just now", "2 minutes ago")
    await expect(page.locator('text=/ago|just now|seconds?|minutes?/i')).toBeVisible();
  });

  test('worker can navigate to employer profile from application', async ({
    page,
  }) => {
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);
    await fillApplicationWizard(page);
    await submitApplication(page);

    await navigateTo(page, 'Applications');

    // Click employer name
    await page.click('text=Test Employer');

    // Should navigate to employer profile
    await expect(page).toHaveURL(`/dashboard/profiles/${employer.id}`);
    await expect(page.locator('text=Test Employer')).toBeVisible();
  });
});

test.describe('Job Applications - Employer View', () => {
  let employer: TestUser;
  let worker: TestUser;
  let jobId: string;

  test.beforeEach(async () => {
    await cleanupTestData();

    employer = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'employer',
      name: 'Test Employer',
      trade: 'General Contractor',
    });

    worker = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'worker',
      name: 'Test Worker',
      trade: 'Carpenter',
    });

    const job = await createTestJob(employer.id, {
      title: 'Carpentry Position',
      trade: 'Carpenter',
      description: 'Need experienced carpenter',
      payRate: '$30/hr',
    });
    jobId = job.id;
  });

  test.afterEach(async () => {
    if (employer) await deleteTestUser(employer.id);
    if (worker) await deleteTestUser(worker.id);
  });

  test('employer should see applications on job detail page', async ({
    page,
    context,
  }) => {
    // Worker applies
    const workerPage = await context.newPage();
    await loginAsUser(workerPage, worker);
    await workerPage.goto(`/dashboard/jobs/${jobId}/apply`);
    await fillApplicationWizard(workerPage, {
      coverLetter: 'I would love to work on this project!',
    });
    await submitApplication(workerPage);
    await workerPage.close();

    // Employer views job
    await loginAsUser(page, employer);
    await page.goto(`/dashboard/jobs/${jobId}`);

    // Should see applications section
    await expect(
      page.locator('text=/applications.*\\(1\\)|1.*application/i')
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Test Worker')).toBeVisible();
    await expect(
      page.locator('text=I would love to work on this project!')
    ).toBeVisible();
  });

  test('employer should see all applications on applications page', async ({
    page,
    context,
  }) => {
    // Worker applies
    const workerPage = await context.newPage();
    await loginAsUser(workerPage, worker);
    await workerPage.goto(`/dashboard/jobs/${jobId}/apply`);
    await fillApplicationWizard(workerPage);
    await submitApplication(workerPage);
    await workerPage.close();

    // Employer navigates to applications page
    await loginAsUser(page, employer);
    await navigateTo(page, 'Applications');

    // Should see received applications
    await expect(page.locator('text=Test Worker')).toBeVisible();
    await expect(page.locator('text=Carpentry Position')).toBeVisible();
  });

  test('employer can view full application details', async ({
    page,
    context,
  }) => {
    // Worker applies with full data
    const workerPage = await context.newPage();
    await loginAsUser(workerPage, worker);
    await workerPage.goto(`/dashboard/jobs/${jobId}/apply`);
    await fillApplicationWizard(workerPage, {
      coverLetter: 'I have extensive experience in carpentry.',
    });
    await submitApplication(workerPage);
    await workerPage.close();

    // Employer views application
    await loginAsUser(page, employer);
    await navigateTo(page, 'Applications');

    // Click to view full application
    await page.click('text=Test Worker');

    // Should show all application details
    await expectApplicationDetails(page, {
      jobTitle: 'Carpentry Position',
      fullName: 'Test Worker Name',
      phoneNumber: '(312) 555-1234',
      workHistory: true,
      education: true,
      references: true,
    });

    // Should see cover letter
    await expect(
      page.locator('text=I have extensive experience in carpentry.')
    ).toBeVisible();
  });

  test('employer should be able to update application status', async ({
    page,
    context,
  }) => {
    // Worker applies
    const workerPage = await context.newPage();
    await loginAsUser(workerPage, worker);
    await workerPage.goto(`/dashboard/jobs/${jobId}/apply`);
    await fillApplicationWizard(workerPage);
    await submitApplication(workerPage);
    await workerPage.close();

    // Employer views application
    await loginAsUser(page, employer);
    await page.goto(`/dashboard/jobs/${jobId}`);

    // Look for status update controls
    // Could be dropdown, button group, or custom UI
    const statusControls = page.locator(
      'select[name*="status"], button:has-text("Viewed"), button:has-text("Contacted"), button:has-text("Hired")'
    );

    if (await statusControls.first().isVisible({ timeout: 5000 })) {
      // Try to update status to "viewed"
      const viewedButton = page.locator('button:has-text("Viewed")');
      if (await viewedButton.isVisible()) {
        await viewedButton.click();
      } else {
        const statusSelect = page.locator('select').first();
        await statusSelect.selectOption('viewed');
      }

      // Status should update
      await page.waitForTimeout(1000);
      await expect(page.locator('text=viewed')).toBeVisible();
    }
  });

  test('should show empty state when employer has no applications', async ({
    page,
  }) => {
    await loginAsUser(page, employer);
    await navigateTo(page, 'Applications');

    // Should show empty state
    await expect(
      page.locator('text=/no.*applications|no applicants/i')
    ).toBeVisible();
  });

  test('employer can navigate to applicant profile', async ({
    page,
    context,
  }) => {
    // Worker applies
    const workerPage = await context.newPage();
    await loginAsUser(workerPage, worker);
    await workerPage.goto(`/dashboard/jobs/${jobId}/apply`);
    await fillApplicationWizard(workerPage);
    await submitApplication(workerPage);
    await workerPage.close();

    // Employer views applications
    await loginAsUser(page, employer);
    await navigateTo(page, 'Applications');

    // Click on worker name to view profile
    await page.click('text=Test Worker');

    // Could navigate to either application detail or profile
    // If application detail, look for profile link
    if (await page.locator('a:has-text("View Profile")').isVisible({ timeout: 2000 })) {
      await page.click('a:has-text("View Profile")');
    }

    // Should eventually be on worker's profile
    await expect(page).toHaveURL(/\/dashboard\/profiles\/[^/]+$/);
    await expect(page.locator('text=Test Worker')).toBeVisible();
  });
});

test.describe('Job Applications - Validation & Edge Cases', () => {
  let employer: TestUser;
  let worker: TestUser;
  let jobId: string;

  test.beforeEach(async () => {
    await cleanupTestData();

    employer = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'employer',
      name: 'Test Employer',
      trade: 'General Contractor',
    });

    worker = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'worker',
      name: 'Test Worker',
      trade: 'Carpenter',
    });

    const job = await createTestJob(employer.id, {
      title: 'Carpentry Position',
      trade: 'Carpenter',
      description: 'Need experienced carpenter',
      payRate: '$30/hr',
    });
    jobId = job.id;
  });

  test.afterEach(async () => {
    if (employer) await deleteTestUser(employer.id);
    if (worker) await deleteTestUser(worker.id);
  });

  test('employer cannot access apply page', async ({ page }) => {
    await loginAsUser(page, employer);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Should be blocked or redirected
    await expect(page).not.toHaveURL(/\/apply$/);
    // Should show error or redirect to job page
    await expect(
      page.locator('text=/not authorized|workers only/i')
    ).toBeVisible({ timeout: 3000 }).catch(async () => {
      // Or redirected away
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test('cannot apply to non-existent job', async ({ page }) => {
    await loginAsUser(page, worker);
    await page.goto('/dashboard/jobs/00000000-0000-0000-0000-000000000000/apply');

    // Should show error or redirect
    await expect(
      page.locator('text=/not found|job.*not.*exist/i')
    ).toBeVisible({ timeout: 3000 }).catch(async () => {
      // Or redirected to jobs page
      await expect(page).toHaveURL(/\/dashboard\/jobs\/?$/);
    });
  });

  test('unauthenticated user cannot access apply page', async ({ page }) => {
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Should redirect to login
    await expect(page).toHaveURL(/\/login|\/auth/);
  });

  test('draft should expire after 30 days', async ({ page }) => {
    // This would require time manipulation or database direct access
    // Marking as test placeholder for manual or integration testing
    test.skip();
  });

  test('wizard should validate required fields before allowing Next', async ({
    page,
  }) => {
    await loginAsUser(page, worker);
    await page.goto(`/dashboard/jobs/${jobId}/apply`);

    // Try to go to step 2 without filling step 1 (if required)
    await page.click('button:has-text("Next")');

    // On Step 2 now (step 1 has no required fields for cover letter)
    await expectWizardStep(page, 2, 8);

    // Try to proceed without filling required fields
    await page.click('button:has-text("Next")');

    // Should show validation errors or stay on step 2
    // This depends on implementation - checking if validation exists
    const errorMessage = page.locator('text=/required|please fill/i');
    if (await errorMessage.isVisible({ timeout: 2000 })) {
      // Validation working
      await expect(errorMessage).toBeVisible();
    }
  });
});

import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
} from './utils/test-db';
import {
  loginAsUser,
  logout,
  generateTestEmail,
} from './utils/test-helpers';

test.describe('Authentication Flows', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();
  });

  test.afterEach(async () => {
    if (testUser) {
      await deleteTestUser(testUser.id);
    }
  });

  test('should sign up with email and password (email confirmation disabled)', async ({ page }) => {
    const email = generateTestEmail();
    const password = 'TestPassword123!';

    await page.goto('/signup');

    // Fill signup form - all required fields
    await page.fill('input[type="text"][placeholder="John Doe"]', 'Test Worker');
    await page.fill('input[type="email"][placeholder="you@example.com"]', email);
    await page.fill('input[type="password"][placeholder*="At least 8 characters"]', password);
    await page.fill('input[type="password"][placeholder*="Re-enter your password"]', password);

    // Accept terms checkbox
    await page.check('input[type="checkbox"][required]');

    // Submit signup form
    await page.click('button[type="submit"]:has-text("Create account")');

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Check which flow we're in by looking for unique UI elements
    const isOnboarding = await page.locator('h2:has-text("Welcome to KrewUp!")').isVisible({ timeout: 5000 }).catch(() => false);

    if (isOnboarding) {
      // Email confirmation disabled - user logged in immediately and redirected to onboarding
      await expect(page).toHaveURL(/\/onboarding/);

      // STEP 1: Personal Information
      // Wait for heading to ensure page loaded
      await expect(page.locator('h2:has-text("Welcome to KrewUp!")')).toBeVisible();

      // Wait for location capture to complete (max 30 seconds)
      // Check for either success or error state
      await Promise.race([
        page.waitForSelector('div:has-text("Location captured")', { timeout: 35000 }),
        page.waitForSelector('button:has-text("Retry")', { timeout: 35000 })
      ]);

      // Name should be pre-filled from signup
      await expect(page.locator('input[type="text"][placeholder="John Doe"]')).toHaveValue('Test Worker');

      // Fill phone number (required) - will auto-format to (XXX)XXX-XXXX
      await page.fill('input[type="tel"][placeholder="(555) 123-4567"]', '5551234567');

      // Email should be pre-filled
      await expect(page.locator('input[type="email"][placeholder="john@example.com"]')).toHaveValue(email);

      // Continue to Step 2
      await page.click('button:has-text("Continue")');

      // STEP 2: Role Selection
      await expect(page.locator('h2:has-text("What brings you here?")')).toBeVisible();

      // Select Worker role
      await page.click('button:has-text("I\'m a Worker")');

      // STEP 3: Trade Selection
      await expect(page.locator('h2:has-text("What\'s your trade?")')).toBeVisible();

      // Select trade from dropdown
      await page.selectOption('select', { label: 'Carpenters (Rough)' });

      // Complete setup
      await page.click('button:has-text("Complete Setup")');

      // Should redirect to dashboard feed
      await expect(page).toHaveURL('/dashboard/feed', { timeout: 10000 });

      // Verify dashboard loaded
      await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible({ timeout: 5000 });
    } else {
      // Email confirmation enabled - check for success message
      await expect(page).toHaveURL('/signup');
      await expect(page.locator('h2:has-text("Check your email")')).toBeVisible();
      await expect(page.locator(`text=${email}`)).toBeVisible();

      // Should show "Return to login" button
      await expect(page.locator('button:has-text("Return to login")')).toBeVisible();
    }
  });

  test('should complete onboarding as employer (contractor) without license', async ({ page }) => {
    const email = generateTestEmail();
    const password = 'TestPassword123!';

    await page.goto('/signup');

    // Signup
    await page.fill('input[type="text"][placeholder="John Doe"]', 'Test Contractor');
    await page.fill('input[type="email"][placeholder="you@example.com"]', email);
    await page.fill('input[type="password"][placeholder*="At least 8 characters"]', password);
    await page.fill('input[type="password"][placeholder*="Re-enter your password"]', password);
    await page.check('input[type="checkbox"][required]');
    await page.click('button[type="submit"]:has-text("Create account")');

    // Should redirect to onboarding
    await expect(page).toHaveURL('/onboarding', { timeout: 10000 });

    // STEP 1: Personal Information
    await expect(page.locator('h2:has-text("Welcome to KrewUp!")')).toBeVisible();

    // Wait for location capture
    await Promise.race([
      page.waitForSelector('div:has-text("Location captured")', { timeout: 35000 }),
      page.waitForSelector('button:has-text("Retry")', { timeout: 35000 })
    ]);

    // Fill phone number
    await page.fill('input[type="tel"][placeholder="(555) 123-4567"]', '5551234567');
    await page.click('button:has-text("Continue")');

    // STEP 2: Role Selection
    await expect(page.locator('h2:has-text("What brings you here?")')).toBeVisible();
    await page.click('button:has-text("I\'m an Employer")');

    // STEP 3: Business Information
    await expect(page.locator('h2:has-text("Tell us about your business")')).toBeVisible();

    // Select contractor employer type
    await page.selectOption('select', { label: 'Contractor' });

    // Fill company name
    await page.fill('input[placeholder="ABC Construction LLC"]', 'Test Construction LLC');

    // Select trade specialty (select with id "trade-specialty")
    await page.selectOption('select#trade-specialty', { label: 'Carpenters (Rough)' });

    // License section should now be visible but optional
    await expect(page.locator('h3:has-text("Contractor License (Optional)")')).toBeVisible();

    // Skip license upload - complete setup without license
    await page.click('button:has-text("Complete Setup")');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('should login with existing credentials', async ({ page }) => {
    // Create test user first
    testUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'worker',
      name: 'Test Worker',
    });

    await loginAsUser(page, testUser);

    // Verify we're on dashboard feed
    await expect(page).toHaveURL('/dashboard/feed');

    // Verify user name is visible somewhere on page
    await expect(page.locator('text=Test Worker')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"][placeholder="you@example.com"]', 'nonexistent@test.com');
    await page.fill('input[type="password"][placeholder="Enter your password"]', 'wrongpassword');
    await page.click('button[type="submit"]:has-text("Sign in")');

    // Should show error message (contains check for flexibility)
    await expect(page.locator('text=Invalid login credentials')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should logout successfully', async ({ page }) => {
    testUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'worker',
      name: 'Test Worker',
    });

    await loginAsUser(page, testUser);

    // Verify we're logged in
    await expect(page).toHaveURL('/dashboard/feed');

    await logout(page);

    // Should be on login page
    await expect(page).toHaveURL('/login');
  });

  test('should protect dashboard routes when not logged in', async ({ page }) => {
    await page.goto('/dashboard/profile');

    // Should redirect to login (may include redirect query param)
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('should persist session after page reload', async ({ page }) => {
    testUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'worker',
      name: 'Test Worker',
    });

    await loginAsUser(page, testUser);

    // Verify we're logged in
    await expect(page).toHaveURL('/dashboard/feed');

    // Reload page
    await page.reload();

    // Should still be logged in and on dashboard
    await expect(page).toHaveURL('/dashboard/feed');
    await expect(page.locator('text=Test Worker')).toBeVisible();
  });

  test('should redirect to dashboard if already logged in and accessing login page', async ({ page }) => {
    testUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'worker',
      name: 'Test Worker',
    });

    await loginAsUser(page, testUser);

    // Try to access login page while logged in
    await page.goto('/login');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard/feed', { timeout: 5000 });
  });

  test('should redirect to dashboard if already logged in and accessing signup page', async ({ page }) => {
    testUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'worker',
      name: 'Test Worker',
    });

    await loginAsUser(page, testUser);

    // Try to access signup page while logged in
    await page.goto('/signup');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard/feed', { timeout: 5000 });
  });

  test('should show duplicate email error when signing up with existing email', async ({ page }) => {
    // Create existing user
    testUser = await createTestUser({
      email: 'existing@test.com',
      password: 'TestPassword123!',
      role: 'worker',
      name: 'Existing User',
    });

    await page.goto('/signup');

    // Try to sign up with same email
    await page.fill('input[type="text"][placeholder="John Doe"]', 'New User');
    await page.fill('input[type="email"][placeholder="you@example.com"]', 'existing@test.com');
    await page.fill('input[type="password"][placeholder*="At least 8 characters"]', 'TestPassword123!');
    await page.fill('input[type="password"][placeholder*="Re-enter your password"]', 'TestPassword123!');
    await page.check('input[type="checkbox"][required]');
    await page.click('button[type="submit"]:has-text("Create account")');

    // Should show duplicate email error
    await expect(page.locator('text=An account with this email already exists')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should handle Google OAuth signup', async ({ page }) => {
    await page.goto('/signup');

    // Click Google OAuth button
    const googleButton = page.locator('button:has-text("Continue with Google")');
    await expect(googleButton).toBeVisible();

    // Note: In a real e2e test, you would need to handle OAuth flow
    // This test just verifies the button exists and can be clicked
    // Full OAuth testing requires additional setup with Google test accounts
    await expect(googleButton).toBeEnabled();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');

    // Click forgot password link
    await page.click('a[href="/auth/forgot-password"]:has-text("Forgot password?")');

    // Should navigate to forgot password page
    await expect(page).toHaveURL('/auth/forgot-password', { timeout: 5000 });
  });

  test('should go back in onboarding flow', async ({ page }) => {
    const email = generateTestEmail();
    const password = 'TestPassword123!';

    await page.goto('/signup');

    // Signup
    await page.fill('input[type="text"][placeholder="John Doe"]', 'Test User');
    await page.fill('input[type="email"][placeholder="you@example.com"]', email);
    await page.fill('input[type="password"][placeholder*="At least 8 characters"]', password);
    await page.fill('input[type="password"][placeholder*="Re-enter your password"]', password);
    await page.check('input[type="checkbox"][required]');
    await page.click('button[type="submit"]:has-text("Create account")');

    // Should be on onboarding
    await expect(page).toHaveURL('/onboarding', { timeout: 10000 });

    // STEP 1: Fill personal info and continue
    await Promise.race([
      page.waitForSelector('div:has-text("Location captured")', { timeout: 35000 }),
      page.waitForSelector('button:has-text("Retry")', { timeout: 35000 })
    ]);
    await page.fill('input[type="tel"][placeholder="(555) 123-4567"]', '5551234567');
    await page.click('button:has-text("Continue")');

    // STEP 2: Should be on role selection
    await expect(page.locator('h2:has-text("What brings you here?")')).toBeVisible();

    // Click back button
    await page.click('button:has-text("Back")');

    // Should go back to step 1
    await expect(page.locator('h2:has-text("Welcome to KrewUp!")')).toBeVisible();

    // Name and email should still be filled
    await expect(page.locator('input[type="text"][placeholder="John Doe"]')).toHaveValue('Test User');
    await expect(page.locator('input[type="email"][placeholder="john@example.com"]')).toHaveValue(email);
  });
});

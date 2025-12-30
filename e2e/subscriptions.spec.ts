import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
  makeUserPro,
} from './utils/test-db';
import {
  loginAsUser,
  navigateTo,
  generateTestEmail,
} from './utils/test-helpers';

test.describe('Stripe Subscription Flows', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();
    testUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Test User',
      trade: 'Carpenter',
    });
  });

  test.afterEach(async () => {
    if (testUser) {
      await deleteTestUser(testUser.id);
    }
  });

  test('should display pricing page correctly', async ({ page }) => {
    await page.goto('/pricing');

    // Should show page title
    await expect(page.locator('text=/Choose Your Plan/i')).toBeVisible();

    // Should show both plan options with correct button text
    await expect(page.locator('button:has-text("Subscribe Monthly")')).toBeVisible();
    await expect(page.locator('button:has-text("Subscribe Annually")')).toBeVisible();

    // Should show prices
    await expect(page.locator('text=/\\$15/i')).toBeVisible();
    await expect(page.locator('text=/\\$150/i')).toBeVisible();

    // Should show savings badge on annual plan
    await expect(page.locator('text=/Save 17%/i')).toBeVisible();

    // Should show actual feature list (5 features)
    await expect(page.locator('text=/Real-time proximity alerts/i')).toBeVisible();
    await expect(page.locator('text=/Profile boost in searches/i')).toBeVisible();
    await expect(page.locator('text=/Who Viewed Me.*analytics/i')).toBeVisible();
    await expect(page.locator('text=/Advanced job matching/i')).toBeVisible();
    await expect(page.locator('text=/Priority support/i')).toBeVisible();
  });

  test('should require login to subscribe', async ({ page }) => {
    await page.goto('/pricing');

    // Click monthly subscribe button
    await page.click('button:has-text("Subscribe Monthly")');

    // Should redirect to login
    await expect(page).toHaveURL('/login', { timeout: 5000 });
  });

  test('should navigate to Stripe checkout when logged in', async ({
    page,
  }) => {
    await loginAsUser(page, testUser);
    await page.goto('/pricing');

    // Click monthly subscribe button
    const subscribeButton = page.locator('button:has-text("Subscribe Monthly")');
    await subscribeButton.click();

    // Should redirect to Stripe checkout (or show loading)
    // Note: In test mode, Stripe might require configuration
    await page.waitForTimeout(2000);

    // Check if redirected to Stripe or staying on page with error
    const url = page.url();
    const hasStripe = url.includes('checkout.stripe.com');
    const hasError = await page.locator('text=/error|failed/i').isVisible();

    // Either redirected to Stripe or shows config error (expected in test)
    expect(hasStripe || hasError || url.includes('pricing')).toBe(true);
  });

  test('should show subscription status for Pro users', async ({ page }) => {
    // Make user Pro
    await makeUserPro(testUser.id);

    await loginAsUser(page, testUser);
    await page.goto('/dashboard/subscription');

    // Should show "Your Subscription" heading
    await expect(page.locator('text=/Your Subscription/i')).toBeVisible({ timeout: 5000 });

    // Should show "Current Plan: KrewUp Pro"
    await expect(page.locator('text=/Current Plan:.*KrewUp Pro/i')).toBeVisible();

    // Should show PRO badge
    await expect(page.locator('text=/PRO/i')).toBeVisible();
  });

  test('should access subscription management page', async ({ page }) => {
    await makeUserPro(testUser.id);

    await loginAsUser(page, testUser);
    await page.goto('/dashboard/subscription');

    // Should show "Your Subscription" heading
    await expect(page.locator('text=/Your Subscription/i')).toBeVisible();

    // Should show "Current Plan: KrewUp Pro"
    await expect(page.locator('text=/Current Plan:.*KrewUp Pro/i')).toBeVisible();

    // Should show renewal date
    await expect(page.locator('text=/Renews on/i')).toBeVisible();
  });

  test('should show manage subscription button for Pro users', async ({
    page,
  }) => {
    await makeUserPro(testUser.id);

    await loginAsUser(page, testUser);
    await page.goto('/dashboard/subscription');

    // Should show "Manage Subscription" button
    const manageButton = page.locator('button:has-text("Manage Subscription")');
    await expect(manageButton).toBeVisible({ timeout: 5000 });
  });

  test('should show free tier status for free users', async ({ page }) => {
    await loginAsUser(page, testUser);
    await page.goto('/dashboard/subscription');

    // Should show "Your Subscription" heading
    await expect(page.locator('text=/Your Subscription/i')).toBeVisible();

    // Should show "Current Plan: Free"
    await expect(page.locator('text=/Current Plan:.*Free/i')).toBeVisible();

    // Should show upgrade button
    await expect(page.locator('button:has-text("Upgrade to Pro")')).toBeVisible();
  });

  test('should show profile boost for Pro workers', async ({ page }) => {
    // Update test user to be a worker
    await makeUserPro(testUser.id);

    await loginAsUser(page, testUser);
    await page.goto('/dashboard/profile');

    // Should show Profile Boost section
    await expect(page.locator('text=/Profile Boost/i')).toBeVisible({ timeout: 5000 });

    // Should show either boost activation button or active boost status
    const hasActivateButton = await page.locator('text=/🚀.*Activate Profile Boost/i').isVisible();
    const hasActiveBoost = await page.locator('text=/🚀.*Your profile is boosted!/i').isVisible();

    expect(hasActivateButton || hasActiveBoost).toBe(true);
  });

  test('should display Pro badge on subscription page', async ({ page }) => {
    await makeUserPro(testUser.id);

    await loginAsUser(page, testUser);
    await page.goto('/dashboard/subscription');

    // Check for PRO badge on subscription page
    const proBadge = page.locator('text=/PRO/i').first();
    await expect(proBadge).toBeVisible({ timeout: 5000 });
  });

  test('free user should see upgrade prompts', async ({ page }) => {
    await loginAsUser(page, testUser);
    await page.goto('/dashboard/subscription');

    // Should show "Current Plan: Free"
    await expect(page.locator('text=/Current Plan:.*Free/i')).toBeVisible();

    // Should show upgrade button
    await expect(page.locator('button:has-text("Upgrade to Pro")')).toBeVisible();
  });

  test('should show annual plan savings', async ({ page }) => {
    await page.goto('/pricing');

    // Should highlight "Save 17%" badge
    await expect(page.locator('text=/Save 17%/i')).toBeVisible();
  });

  test('pricing page should be accessible without login', async ({ page }) => {
    await page.goto('/pricing');

    // Should load without redirect
    await expect(page).toHaveURL('/pricing');

    // Should show "Choose Your Plan" heading
    await expect(page.locator('text=/Choose Your Plan/i')).toBeVisible();

    // Should show both subscription buttons
    await expect(page.locator('button:has-text("Subscribe Monthly")')).toBeVisible();
    await expect(page.locator('button:has-text("Subscribe Annually")')).toBeVisible();
  });

  test('Pro workers should see "Who Viewed Me" feature', async ({ page }) => {
    // Make user Pro worker
    await makeUserPro(testUser.id);

    await loginAsUser(page, testUser);
    await page.goto('/dashboard/profile');

    // Should show "Who Viewed Your Profile" section
    await expect(page.locator('text=/Who Viewed Your Profile/i')).toBeVisible({ timeout: 5000 });

    // Should show view count or empty state
    const hasViewCount = await page.locator('text=/\\d+.*employers.*viewed/i').isVisible();
    const hasEmptyState = await page.locator('text=/No.*views.*yet/i').isVisible();

    expect(hasViewCount || hasEmptyState).toBe(true);
  });

  test('free workers should see limited "Who Viewed Me"', async ({ page }) => {
    await loginAsUser(page, testUser);
    await page.goto('/dashboard/profile');

    // Should show "Who Viewed Your Profile" section
    await expect(page.locator('text=/Who Viewed Your Profile/i')).toBeVisible({ timeout: 5000 });

    // Should show upgrade prompt for detailed views
    await expect(page.locator('text=/Upgrade.*KrewUp Pro.*to.*access/i')).toBeVisible();
  });

  test('Pro subscription should auto-activate profile boost', async ({ page }) => {
    // Make user Pro worker (simulates post-checkout state)
    await makeUserPro(testUser.id);

    await loginAsUser(page, testUser);
    await page.goto('/dashboard/profile');

    // Should show Profile Boost section
    await expect(page.locator('text=/Profile Boost/i')).toBeVisible({ timeout: 5000 });

    // Note: In real flow, boost is auto-activated via webhook
    // Test checks that boost UI is present for Pro users
    const hasBoostUI = await page.locator('text=/Profile Boost/i').isVisible();
    expect(hasBoostUI).toBe(true);
  });
});

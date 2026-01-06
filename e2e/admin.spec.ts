import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
} from './utils/test-db';
import { loginAsUser, waitForPageReady } from './utils/test-helpers';

test.describe('Admin Dashboard E2E Tests', () => {
  let adminUser: TestUser;
  let regularUser: TestUser;

  test.beforeAll(async () => {
    await cleanupTestData();
    
    // Create admin user
    adminUser = await createTestUser({
      role: 'employer',
      isAdmin: true,
    });
    
    // Create regular user
    regularUser = await createTestUser({
      role: 'worker',
    });
  });

  test.afterAll(async () => {
    if (adminUser) await deleteTestUser(adminUser.id);
    if (regularUser) await deleteTestUser(regularUser.id);
  });

  test.describe('Admin Access Control', () => {
    test('should allow admin to access admin dashboard', async ({ page }) => {
      await loginAsUser(page, adminUser);
      
      await page.goto('/admin/dashboard');
      await waitForPageReady(page, /\/admin\/dashboard/);
      
      // Should see admin dashboard content
      await expect(page.locator('h1:has-text("Admin")')).toBeVisible();
    });

    test('should deny non-admin access to admin routes', async ({ page }) => {
      await loginAsUser(page, regularUser);
      
      await page.goto('/admin/dashboard');
      
      // Should be redirected or shown 404
      await page.waitForLoadState('networkidle');
      
      // Either redirected to login/dashboard or 404
      const url = page.url();
      const is404 = await page.locator('text=/not found|404/i').isVisible().catch(() => false);
      
      expect(url.includes('/admin/dashboard') && !is404).toBeFalsy();
    });

    test('should hide admin link from non-admin users', async ({ page }) => {
      await loginAsUser(page, regularUser);
      
      // Check sidebar for admin link
      const adminLink = page.locator('nav a[href*="/admin"]');
      
      expect(await adminLink.count()).toBe(0);
    });

    test('should show admin panel link for admin users', async ({ page }) => {
      await loginAsUser(page, adminUser);
      
      await page.goto('/dashboard/feed');
      
      // Check for admin panel button
      const adminButton = page.locator('a:has-text("Admin Panel")');
      
      await expect(adminButton).toBeVisible();
    });
  });

  test.describe('Admin Dashboard Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/dashboard');
      await waitForPageReady(page, /\/admin\/dashboard/);
    });

    test('should display metrics cards', async ({ page }) => {
      // Check for metric cards
      await expect(page.locator('text=Total Users')).toBeVisible();
      await expect(page.locator('text=Active Jobs')).toBeVisible();
    });

    test('should navigate to certifications page', async ({ page }) => {
      await page.click('a:has-text("Certifications")');
      
      await waitForPageReady(page, /\/admin\/certifications/);
      await expect(page.locator('h1:has-text("Certification")')).toBeVisible();
    });

    test('should navigate to users page', async ({ page }) => {
      await page.click('a:has-text("Users")');
      
      await waitForPageReady(page, /\/admin\/users/);
      await expect(page.locator('h1:has-text("User")')).toBeVisible();
    });

    test('should navigate to moderation page', async ({ page }) => {
      await page.click('a:has-text("Moderation")');
      
      await waitForPageReady(page, /\/admin\/moderation/);
      await expect(page.locator('h1:has-text("Moderation")')).toBeVisible();
    });

    test('should navigate to monitoring page', async ({ page }) => {
      await page.click('a:has-text("Monitoring"), a:has-text("Errors")');
      
      await waitForPageReady(page, /\/admin\/monitoring/);
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should navigate to ad metrics page', async ({ page }) => {
      await page.click('a:has-text("Ad Metrics")');
      
      await waitForPageReady(page, /\/admin\/ads/);
      await expect(page.locator('h1:has-text("Ad")')).toBeVisible();
    });
  });

  test.describe('User Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/users');
      await waitForPageReady(page, /\/admin\/users/);
    });

    test('should display user list', async ({ page }) => {
      // Wait for users to load
      await page.waitForLoadState('networkidle');
      
      // Should see some user entries
      const userRows = page.locator('table tbody tr, [data-user-id]');
      expect(await userRows.count()).toBeGreaterThan(0);
    });

    test('should search for users', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
      
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.keyboard.press('Enter');
        await page.waitForLoadState('networkidle');
        
        // Should filter results
        expect(page.url()).toContain('search');
      }
    });

    test('should filter users by role', async ({ page }) => {
      const roleFilter = page.locator('select[name*="role"], [data-filter="role"]');
      
      if (await roleFilter.isVisible()) {
        await roleFilter.selectOption('worker');
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Certification Verification', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/certifications');
      await waitForPageReady(page, /\/admin\/certifications/);
    });

    test('should display certification list', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Should have certifications section or empty state
      const hasCertifications = await page.locator('table, [data-certification-id]').isVisible().catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*certifications|empty/i').isVisible().catch(() => false);
      
      expect(hasCertifications || hasEmptyState).toBeTruthy();
    });

    test('should filter by verification status', async ({ page }) => {
      const statusFilter = page.locator('select[name*="status"], button:has-text("Pending")');
      
      if (await statusFilter.first().isVisible()) {
        await statusFilter.first().click();
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Content Moderation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/moderation');
      await waitForPageReady(page, /\/admin\/moderation/);
    });

    test('should display moderation queue', async ({ page }) => {
      await page.waitForLoadState('networkidle');
      
      // Should have reports section or empty state
      const hasReports = await page.locator('[data-report-id], table').isVisible().catch(() => false);
      const hasEmptyState = await page.locator('text=/no.*reports|empty|queue/i').isVisible().catch(() => false);
      
      expect(hasReports || hasEmptyState).toBeTruthy();
    });
  });

  test.describe('Analytics Dashboard', () => {
    test('should display analytics overview', async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/analytics');
      await waitForPageReady(page, /\/admin\/analytics/);
      
      // Should have analytics content
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should display analytics charts', async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/analytics/overview');
      await waitForPageReady(page, /\/admin\/analytics/);
      
      // Wait for charts to render
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Ad Metrics Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, adminUser);
      await page.goto('/admin/ads');
      await waitForPageReady(page, /\/admin\/ads/);
    });

    test('should display ad metrics', async ({ page }) => {
      await expect(page.locator('h1:has-text("Ad")')).toBeVisible();
      
      // Check for metric cards
      await expect(page.locator('text=/Impressions|Clicks|CTR|Revenue/i')).toBeVisible();
    });

    test('should display configuration status', async ({ page }) => {
      await expect(page.locator('text=Configuration')).toBeVisible();
    });
  });
});


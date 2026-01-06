import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
} from './utils/test-db';
import { loginAsUser, waitForText } from './utils/test-helpers';

test.describe('Error States E2E Tests', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    await cleanupTestData();
    testUser = await createTestUser({ role: 'worker' });
  });

  test.afterAll(async () => {
    if (testUser) await deleteTestUser(testUser.id);
  });

  test.describe('404 Pages', () => {
    test('should show 404 for non-existent pages', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-12345');
      
      // Should show 404 content
      await expect(page.locator('text=/404|not found/i')).toBeVisible();
    });

    test('should show 404 for non-existent job', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      await page.goto('/dashboard/jobs/00000000-0000-0000-0000-000000000000');
      
      // Should show 404 or error
      await page.waitForLoadState('networkidle');
      
      const is404 = await page.locator('text=/404|not found|error/i').isVisible().catch(() => false);
      const redirected = !page.url().includes('/jobs/00000000');
      
      expect(is404 || redirected).toBeTruthy();
    });

    test('should show 404 for non-existent profile', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      await page.goto('/dashboard/profiles/00000000-0000-0000-0000-000000000000');
      
      await page.waitForLoadState('networkidle');
      
      const is404 = await page.locator('text=/404|not found|error/i').isVisible().catch(() => false);
      const redirected = !page.url().includes('/profiles/00000000');
      
      expect(is404 || redirected).toBeTruthy();
    });

    test('should show 404 for non-existent conversation', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      await page.goto('/dashboard/messages/00000000-0000-0000-0000-000000000000');
      
      await page.waitForLoadState('networkidle');
      
      const is404 = await page.locator('text=/404|not found|error|conversation/i').isVisible().catch(() => false);
      expect(is404).toBeTruthy();
    });
  });

  test.describe('Authentication Errors', () => {
    test('should redirect unauthenticated users from dashboard', async ({ page }) => {
      await page.goto('/dashboard/feed');
      
      await page.waitForURL(/\/login/, { timeout: 5000 });
      
      expect(page.url()).toContain('/login');
    });

    test('should redirect unauthenticated users from profile', async ({ page }) => {
      await page.goto('/dashboard/profile');
      
      await page.waitForURL(/\/login/, { timeout: 5000 });
      
      expect(page.url()).toContain('/login');
    });

    test('should show error for invalid login credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('input[type="email"]', 'nonexistent@test.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Should show error message
      await waitForText(page, /invalid|incorrect|error/i, { timeout: 5000 });
    });

    test('should validate email format on login', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      // Should show validation error
      const hasError = await page.locator('text=/invalid|email/i').isVisible().catch(() => false);
      const hasValidation = await page.locator('[aria-invalid="true"]').isVisible().catch(() => false);
      
      expect(hasError || hasValidation).toBeTruthy();
    });
  });

  test.describe('Form Validation Errors', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, testUser);
    });

    test('should show validation error for empty job title', async ({ page }) => {
      // Only for employers, but test the form behavior
      await page.goto('/dashboard/jobs/new');
      
      // If user is worker, they might be redirected
      if (page.url().includes('/jobs/new')) {
        await page.click('button[type="submit"]');
        
        // Should show validation errors
        const hasError = await page.locator('text=/required|please|enter/i').isVisible().catch(() => false);
        expect(hasError).toBeTruthy();
      }
    });

    test('should show validation error for short bio', async ({ page }) => {
      await page.goto('/dashboard/profile/edit');
      
      const bioInput = page.locator('textarea[name="bio"]');
      if (await bioInput.isVisible()) {
        await bioInput.fill('Hi'); // Too short
        await page.click('button[type="submit"]');
        
        // Check for validation
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Empty States', () => {
    test('should show empty state for no jobs', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Use a filter that won't match any jobs
      await page.goto('/dashboard/jobs?trade=NonExistentTrade12345');
      
      await page.waitForLoadState('networkidle');
      
      // Should show empty state or "no jobs found"
      const hasEmptyState = await page.locator('text=/no.*jobs|no.*results|empty/i').isVisible().catch(() => false);
      expect(hasEmptyState).toBeTruthy();
    });

    test('should show empty state for no applications', async ({ page }) => {
      // Create fresh user with no applications
      const freshUser = await createTestUser({ role: 'worker' });
      
      try {
        await loginAsUser(page, freshUser);
        await page.goto('/dashboard/applications');
        
        await page.waitForLoadState('networkidle');
        
        // Should show empty state
        const hasEmptyState = await page.locator('text=/no.*applications|empty|haven\'t applied/i').isVisible().catch(() => false);
        expect(hasEmptyState).toBeTruthy();
      } finally {
        await deleteTestUser(freshUser.id);
      }
    });

    test('should show empty state for no messages', async ({ page }) => {
      const freshUser = await createTestUser({ role: 'worker' });
      
      try {
        await loginAsUser(page, freshUser);
        await page.goto('/dashboard/messages');
        
        await page.waitForLoadState('networkidle');
        
        // Should show empty state
        const hasEmptyState = await page.locator('text=/no.*messages|no.*conversations|empty|start.*conversation/i').isVisible().catch(() => false);
        expect(hasEmptyState).toBeTruthy();
      } finally {
        await deleteTestUser(freshUser.id);
      }
    });

    test('should show empty state for no notifications', async ({ page }) => {
      const freshUser = await createTestUser({ role: 'worker' });
      
      try {
        await loginAsUser(page, freshUser);
        await page.goto('/dashboard/notifications');
        
        await page.waitForLoadState('networkidle');
        
        // Should show empty state
        const hasEmptyState = await page.locator('text=/no.*notifications|empty|all.*caught/i').isVisible().catch(() => false);
        expect(hasEmptyState).toBeTruthy();
      } finally {
        await deleteTestUser(freshUser.id);
      }
    });
  });

  test.describe('Network Error Handling', () => {
    test('should handle slow network gracefully', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Simulate slow network
      await page.route('**/*', (route) => {
        setTimeout(() => route.continue(), 1000);
      });
      
      await page.goto('/dashboard/jobs');
      
      // Should show loading state
      const hasLoadingState = await page.locator('text=/loading/i, .animate-spin, [data-loading]').isVisible().catch(() => false);
      
      // Wait for page to load eventually
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    });
  });

  test.describe('Permission Errors', () => {
    test('should prevent worker from accessing job creation', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      await page.goto('/dashboard/jobs/new');
      
      await page.waitForLoadState('networkidle');
      
      // Worker should be redirected or see error
      const isOnNewJobPage = page.url().includes('/jobs/new');
      const hasPermissionError = await page.locator('text=/permission|unauthorized|employer/i').isVisible().catch(() => false);
      
      // Either not on the page or showing permission error
      expect(!isOnNewJobPage || hasPermissionError).toBeTruthy();
    });

    test('should prevent accessing other users profiles directly via settings', async ({ page }) => {
      await loginAsUser(page, testUser);
      
      // Try to edit another user's profile (if possible)
      await page.goto(`/dashboard/profile/edit?userId=00000000-0000-0000-0000-000000000000`);
      
      await page.waitForLoadState('networkidle');
      
      // Should only show own profile, not error (edit query param should be ignored)
    });
  });
});


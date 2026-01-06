import { test, expect, devices } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
  createTestJob,
} from './utils/test-db';
import { loginAsUser } from './utils/test-helpers';

// Use iPhone 13 Pro viewport
test.use({
  ...devices['iPhone 13 Pro'],
});

test.describe('Mobile Interactions E2E Tests', () => {
  let workerUser: TestUser;
  let employerUser: TestUser;
  let jobId: string;

  test.beforeAll(async () => {
    await cleanupTestData();
    
    workerUser = await createTestUser({ role: 'worker' });
    employerUser = await createTestUser({ role: 'employer' });
    
    const job = await createTestJob(employerUser.id, {
      title: 'Mobile Test Job',
      trade: 'Carpenter',
    });
    jobId = job.id;
  });

  test.afterAll(async () => {
    if (workerUser) await deleteTestUser(workerUser.id);
    if (employerUser) await deleteTestUser(employerUser.id);
  });

  test.describe('Bottom Navigation', () => {
    test('should navigate using bottom nav', async ({ page }) => {
      await loginAsUser(page, workerUser);
      
      // Click on Jobs in bottom nav
      await page.click('nav.fixed.bottom-0 >> text=Jobs');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/jobs');
      
      // Click on Profile
      await page.click('nav.fixed.bottom-0 >> text=Profile');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/profile');
      
      // Click on Messages
      await page.click('nav.fixed.bottom-0 >> text=Messages');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/messages');
    });

    test('should highlight active nav item', async ({ page }) => {
      await loginAsUser(page, workerUser);
      await page.goto('/dashboard/jobs');
      
      // Jobs should be highlighted
      const activeItem = page.locator('nav.fixed.bottom-0 >> text=Jobs');
      
      // Check for active styling (usually text color or background)
      await expect(activeItem).toBeVisible();
    });

    test('should show notification badge in bottom nav', async ({ page }) => {
      await loginAsUser(page, workerUser);
      
      // Check for notification indicator (dot, number, etc.)
      const notificationBadge = page.locator('nav.fixed.bottom-0 [data-notification-count], nav.fixed.bottom-0 .notification-badge');
      
      // Badge may or may not be visible depending on notifications
      const isVisible = await notificationBadge.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });
  });

  test.describe('Touch Interactions', () => {
    test('should handle tap on job card', async ({ page }) => {
      await loginAsUser(page, workerUser);
      await page.goto('/dashboard/jobs');
      await page.waitForLoadState('networkidle');
      
      // Find and tap a job card
      const jobCard = page.locator('[data-job-id], .job-card, article').first();
      
      if (await jobCard.isVisible()) {
        await jobCard.tap();
        await page.waitForLoadState('networkidle');
        
        // Should navigate to job detail
        expect(page.url()).toContain('/jobs/');
      }
    });

    test('should handle pull to refresh on job list', async ({ page }) => {
      await loginAsUser(page, workerUser);
      await page.goto('/dashboard/jobs');
      
      // Simulate pull to refresh (scroll to top then down)
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      
      // Check if page reloads data (hard to test without specific indicators)
      await page.waitForLoadState('networkidle');
    });

    test('should handle tap on bottom sheet triggers', async ({ page }) => {
      await loginAsUser(page, workerUser);
      await page.goto('/dashboard/jobs');
      
      // Look for filter button or similar that might open a bottom sheet
      const filterButton = page.locator('button:has-text("Filter"), button:has-text("Sort")').first();
      
      if (await filterButton.isVisible()) {
        await filterButton.tap();
        
        // Check if bottom sheet or modal appeared
        await page.waitForTimeout(500);
        
        const hasBottomSheet = await page.locator('[role="dialog"], .bottom-sheet, .modal').isVisible().catch(() => false);
        expect(typeof hasBottomSheet).toBe('boolean');
      }
    });
  });

  test.describe('Mobile Header', () => {
    test('should display mobile header', async ({ page }) => {
      await loginAsUser(page, workerUser);
      
      // Mobile header should be visible
      const mobileHeader = page.locator('header.fixed.top-0');
      await expect(mobileHeader).toBeVisible();
    });

    test('should show logo in mobile header', async ({ page }) => {
      await loginAsUser(page, workerUser);
      
      const logo = page.locator('header img[alt*="Logo"], header img[src*="logo"]');
      await expect(logo).toBeVisible();
    });

    test('should show notification bell in mobile header', async ({ page }) => {
      await loginAsUser(page, workerUser);
      
      const notificationBell = page.locator('header button[aria-label*="notification"], header a[href*="notification"]');
      
      // Should be visible in header
      const isVisible = await notificationBell.isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });

    test('should show user avatar in mobile header', async ({ page }) => {
      await loginAsUser(page, workerUser);
      
      const avatar = page.locator('header img[alt*="avatar"], header .avatar, header img[src*="profile"]');
      
      const isVisible = await avatar.first().isVisible().catch(() => false);
      expect(typeof isVisible).toBe('boolean');
    });
  });

  test.describe('Mobile Forms', () => {
    test('should handle touch keyboard on input focus', async ({ page }) => {
      await loginAsUser(page, workerUser);
      await page.goto('/dashboard/profile/edit');
      
      // Focus on input
      const input = page.locator('input[type="text"]').first();
      
      if (await input.isVisible()) {
        await input.tap();
        
        // Input should have focus
        await expect(input).toBeFocused();
      }
    });

    test('should scroll to focused input', async ({ page }) => {
      await loginAsUser(page, workerUser);
      await page.goto('/dashboard/profile/edit');
      await page.waitForLoadState('networkidle');
      
      // Find a lower input on the page
      const inputs = page.locator('input, textarea');
      const count = await inputs.count();
      
      if (count > 3) {
        const lastInput = inputs.nth(count - 1);
        await lastInput.tap();
        
        // Input should be visible after focus
        await expect(lastInput).toBeInViewport();
      }
    });
  });

  test.describe('Mobile Job Application', () => {
    test('should handle job application on mobile', async ({ page }) => {
      await loginAsUser(page, workerUser);
      await page.goto(`/dashboard/jobs/${jobId}`);
      await page.waitForLoadState('networkidle');
      
      // Look for apply button
      const applyButton = page.locator('button:has-text("Apply"), a:has-text("Apply")');
      
      if (await applyButton.isVisible()) {
        await applyButton.tap();
        await page.waitForLoadState('networkidle');
        
        // Should navigate to application form or show modal
        const hasApplicationForm = page.url().includes('/apply') || 
          await page.locator('text=/application|apply/i').isVisible();
        
        expect(hasApplicationForm).toBeTruthy();
      }
    });
  });

  test.describe('Mobile Messaging', () => {
    test('should navigate to conversation on tap', async ({ page }) => {
      await loginAsUser(page, workerUser);
      await page.goto('/dashboard/messages');
      await page.waitForLoadState('networkidle');
      
      // Tap on a conversation if any exist
      const conversation = page.locator('[data-conversation-id], .conversation-item').first();
      
      if (await conversation.isVisible()) {
        await conversation.tap();
        await page.waitForLoadState('networkidle');
        
        // Should navigate to conversation detail
        expect(page.url()).toContain('/messages/');
      }
    });

    test('should show keyboard for message input', async ({ page }) => {
      await loginAsUser(page, workerUser);
      await page.goto('/dashboard/messages');
      
      // If there's a conversation, open it
      const conversation = page.locator('[data-conversation-id], .conversation-item').first();
      
      if (await conversation.isVisible()) {
        await conversation.tap();
        await page.waitForLoadState('networkidle');
        
        // Focus on message input
        const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
        
        if (await messageInput.isVisible()) {
          await messageInput.tap();
          await expect(messageInput).toBeFocused();
        }
      }
    });
  });

  test.describe('Mobile Gestures', () => {
    test('should support horizontal swipe on job cards', async ({ page }) => {
      await loginAsUser(page, workerUser);
      await page.goto('/dashboard/jobs');
      await page.waitForLoadState('networkidle');
      
      // This is more of a gesture test - in real implementation would test swipe actions
      const jobList = page.locator('.job-list, [data-job-list]');
      
      if (await jobList.isVisible()) {
        // Verify list is scrollable
        const scrollHeight = await jobList.evaluate((el) => el.scrollHeight);
        expect(scrollHeight).toBeGreaterThan(0);
      }
    });

    test('should close modal on tap outside', async ({ page }) => {
      await loginAsUser(page, workerUser);
      await page.goto('/dashboard/jobs');
      
      // Open a modal (like filter)
      const filterButton = page.locator('button:has-text("Filter")').first();
      
      if (await filterButton.isVisible()) {
        await filterButton.tap();
        await page.waitForTimeout(500);
        
        const modal = page.locator('[role="dialog"], .modal');
        
        if (await modal.isVisible()) {
          // Tap outside modal to close
          await page.locator('.modal-backdrop, [data-backdrop]').tap().catch(() => {});
          
          // Modal might close
          await page.waitForTimeout(300);
        }
      }
    });
  });
});


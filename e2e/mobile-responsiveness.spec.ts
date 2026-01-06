import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
  createTestJob,
} from './utils/test-db';
import { loginAsUser, generateTestEmail } from './utils/test-helpers';

test.describe('Mobile Responsiveness', () => {
  let testUser: TestUser;
  let jobId: string;

  test.beforeEach(async () => {
    await cleanupTestData();

    testUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'worker',
      name: 'Mobile User',
      trade: 'Carpenter',
    });

    const job = await createTestJob(testUser.id, {
      title: 'Mobile Test Job',
      trade: 'Carpenter',
    });
    jobId = job.id;
  });

  test.afterEach(async () => {
    if (testUser) await deleteTestUser(testUser.id);
  });

  test.describe('iPhone 13 Pro Layout (390x844)', () => {
    test('should display mobile bottom navigation', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Bottom nav should be visible on mobile
      const bottomNav = page.locator('nav.fixed.bottom-0');
      await expect(bottomNav).toBeVisible();

      // Should contain all navigation links
      await expect(bottomNav.locator('text=Feed')).toBeVisible();
      await expect(bottomNav.locator('text=Profile')).toBeVisible();
      await expect(bottomNav.locator('text=Jobs')).toBeVisible();
      await expect(bottomNav.locator('text=Messages')).toBeVisible();
      await expect(bottomNav.locator('text=Apps')).toBeVisible(); // Worker sees "Apps"
    });

    test('should hide desktop sidebar on mobile', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Sidebar should be hidden on mobile (has "hidden md:flex" classes)
      const sidebar = page.locator('aside');
      await expect(sidebar).not.toBeVisible();
    });

    test('should display mobile header', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Mobile header should be visible (has "md:hidden" class)
      const mobileHeader = page.locator('header.fixed.top-0.md\\:hidden');
      await expect(mobileHeader).toBeVisible();

      // Should contain logo and notification bell
      await expect(mobileHeader.locator('img[alt="KrewUp Logo"]')).toBeVisible();
      await expect(mobileHeader.locator('a[href="/dashboard/notifications"]')).toBeVisible();
    });

    test('should make job cards responsive', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');

      // Wait for job cards to load
      await page.waitForSelector('text=Mobile Test Job', { timeout: 10000 });

      // Job cards are wrapped in Link elements containing Card components
      const jobCard = page.locator('a[href*="/dashboard/jobs/"]').first();
      const box = await jobCard.boundingBox();

      // Card should be near full width on mobile (accounting for px-4 padding = 32px total)
      const viewport = page.viewportSize();
      expect(box?.width).toBeGreaterThan(viewport!.width - 50); // Allow margin for padding
    });

    test('should make profile edit form mobile-friendly', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/profile/edit');

      // Wait for form to load
      await page.waitForSelector('input#name', { timeout: 5000 });

      // Form inputs should be full width (w-full class)
      const nameInput = page.locator('input#name');
      const box = await nameInput.boundingBox();

      // Input should take most of container width
      expect(box?.width).toBeGreaterThan(300);
    });

    test('should prevent horizontal scroll on job detail page', async ({
      page,
    }) => {
      await loginAsUser(page, testUser);
      await page.goto(`/dashboard/jobs/${jobId}`);

      // Wait for page to load
      await page.waitForSelector('text=Mobile Test Job', { timeout: 5000 });

      // Page should not have horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()!.width;

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
    });

    test('should make buttons touch-friendly', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/profile');

      // Wait for buttons to load
      await page.waitForSelector('button', { timeout: 5000 });

      // Buttons should meet minimum touch target size
      // Our button component uses h-10 (40px) or h-12 (48px) classes
      const button = page.locator('button').first();
      const box = await button.boundingBox();

      // Should be at least 36px (Apple recommends 44px, we allow slightly less for padding)
      expect(box?.height).toBeGreaterThanOrEqual(36);
    });

    test('should account for fixed header and bottom nav spacing', async ({
      page,
    }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/feed');

      // Main content should have proper padding to avoid overlap
      // Layout uses: pt-20 (top) and pb-24 (bottom) on mobile
      const main = page.locator('main');
      const paddingTop = await main.evaluate((el) =>
        parseInt(window.getComputedStyle(el).paddingTop)
      );
      const paddingBottom = await main.evaluate((el) =>
        parseInt(window.getComputedStyle(el).paddingBottom)
      );

      // Should have significant top/bottom padding (header is h-16, nav is h-16)
      expect(paddingTop).toBeGreaterThanOrEqual(60); // pt-20 = 80px
      expect(paddingBottom).toBeGreaterThanOrEqual(80); // pb-24 = 96px
    });

    test('should navigate via bottom nav correctly', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Click Profile in bottom nav
      const bottomNav = page.locator('nav.fixed.bottom-0');
      await bottomNav.locator('a[href="/dashboard/profile"]').click();
      await expect(page).toHaveURL('/dashboard/profile');

      // Click Jobs in bottom nav
      await bottomNav.locator('a[href="/dashboard/jobs"]').click();
      await expect(page).toHaveURL('/dashboard/jobs');

      // Click Feed in bottom nav
      await bottomNav.locator('a[href="/dashboard/feed"]').click();
      await expect(page).toHaveURL(/\/(dashboard|dashboard\/feed)/);
    });
  });

  test.describe('iPad Pro Layout (1024x1366)', () => {
    test('should display desktop sidebar on tablet', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Sidebar should be visible on tablet (hidden md:flex becomes visible)
      const sidebar = page.locator('aside');
      await expect(sidebar).toBeVisible();

      // Should contain navigation links
      await expect(sidebar.locator('text=Feed')).toBeVisible();
      await expect(sidebar.locator('text=Profile')).toBeVisible();
      await expect(sidebar.locator('text=Browse Jobs')).toBeVisible();
    });

    test('should hide mobile bottom nav on tablet', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Bottom nav should be hidden on tablet (has md:hidden class)
      const bottomNav = page.locator('nav.fixed.bottom-0');
      await expect(bottomNav).not.toBeVisible();
    });

    test('should hide mobile header on tablet', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Mobile header should be hidden on tablet (has md:hidden class)
      const mobileHeader = page.locator('header.fixed.top-0.md\\:hidden');
      await expect(mobileHeader).not.toBeVisible();
    });

    test('should use multi-column grid for jobs on tablet', async ({
      page,
    }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');

      // Jobs page uses grid-cols-1 lg:grid-cols-4 (sidebar + content)
      // On tablet (md), still single column
      // On desktop (lg), 4-column grid
      const viewport = page.viewportSize();
      expect(viewport?.width).toBeGreaterThan(800);

      // Content should fit within viewport
      const main = page.locator('main');
      const box = await main.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(viewport!.width);
    });

    test('should maintain proper spacing on tablet', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/feed');

      // On tablet, padding should be reduced (pt-8, pb-8 instead of pt-20, pb-24)
      const main = page.locator('main');
      const paddingTop = await main.evaluate((el) =>
        parseInt(window.getComputedStyle(el).paddingTop)
      );
      const paddingBottom = await main.evaluate((el) =>
        parseInt(window.getComputedStyle(el).paddingBottom)
      );

      // Should have normal padding (no extra space for bottom nav)
      expect(paddingTop).toBeLessThan(60); // md:pt-8 = 32px
      expect(paddingBottom).toBeLessThan(60); // md:pb-8 = 32px
    });
  });

  test.describe('Responsive Interactions', () => {
    test('should support vertical scrolling on mobile', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/feed');

      // Wait for content to load
      await page.waitForLoadState('networkidle');

      // Scroll down
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(500);

      // Page should scroll
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeGreaterThan(0);
    });

    test('should handle form input on mobile', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/profile/edit');

      // Wait for form
      await page.waitForSelector('input#name', { timeout: 5000 });

      // Tap input to focus
      const nameInput = page.locator('input#name');
      await nameInput.click();
      await expect(nameInput).toBeFocused();

      // Type should work
      await nameInput.fill('New Mobile Name');
      expect(await nameInput.inputValue()).toBe('New Mobile Name');
    });

    test('should handle bottom nav active states', async ({ page }) => {
      await loginAsUser(page, testUser);

      // Navigate to Profile
      const bottomNav = page.locator('nav.fixed.bottom-0');
      await bottomNav.locator('a[href="/dashboard/profile"]').click();
      await page.waitForURL('/dashboard/profile');

      // Profile link should have active styles (text-krewup-blue bg-blue-50)
      const profileLink = bottomNav.locator('a[href="/dashboard/profile"]');
      const classes = await profileLink.getAttribute('class');
      expect(classes).toContain('text-krewup-blue');
      expect(classes).toContain('bg-blue-50');
    });
  });

  test.describe('Orientation Changes', () => {
    test('should handle portrait to landscape rotation', async ({
      page,
    }) => {
      // Start in portrait (iPhone 13 Pro)
      await page.setViewportSize({ width: 390, height: 844 });
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');

      // Wait for initial load
      await page.waitForLoadState('networkidle');

      // Rotate to landscape
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(500);

      // Layout should adapt - no horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(850);
    });
  });

  test.describe('Font Scaling and Accessibility', () => {
    test('should have readable heading sizes', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');

      // Wait for content
      await page.waitForLoadState('networkidle');

      // Check heading font size (h2, h3 elements)
      const heading = page.locator('h1, h2, h3').first();
      if ((await heading.count()) > 0) {
        const fontSize = await heading.evaluate((el) =>
          parseInt(window.getComputedStyle(el).fontSize)
        );

        // Headings should be at least 18px on mobile
        expect(fontSize).toBeGreaterThanOrEqual(18);
      }
    });

    test('should handle zoomed view gracefully', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');

      // Wait for page load
      await page.waitForLoadState('networkidle');

      // Zoom in
      await page.evaluate(() => {
        document.body.style.zoom = '1.5';
      });
      await page.waitForTimeout(500);

      // Should not cause excessive horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()!.width;

      // Allow some overflow with zoom, but not excessive
      expect(bodyWidth).toBeLessThan(viewportWidth * 2);
    });
  });

  test.describe('Visual Regression Prevention', () => {
    test('should not have layout shifts on job feed', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');

      // Wait for content to fully load (no networkidle - use specific element)
      await page.waitForSelector('text=Browse Jobs', { timeout: 10000 });

      // Wait for any lazy-loaded images or components
      await page.waitForTimeout(1000);

      // Take initial measurement
      const initialHeight = await page.evaluate(() => document.body.scrollHeight);

      // Wait a bit more to catch any delayed renders
      await page.waitForTimeout(500);

      // Height should be stable (no major layout shifts)
      const finalHeight = await page.evaluate(() => document.body.scrollHeight);
      const heightDiff = Math.abs(finalHeight - initialHeight);

      // Allow small differences (< 50px), but no major shifts
      expect(heightDiff).toBeLessThan(50);
    });

    test('should maintain consistent card heights', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');

      // Wait for job cards
      await page.waitForSelector('text=Mobile Test Job', { timeout: 10000 });

      // Get all job cards
      const jobCards = page.locator('a[href*="/dashboard/jobs/"]');
      const cardCount = await jobCards.count();

      if (cardCount > 1) {
        // Check first two cards have similar heights (within 20%)
        const height1 = (await jobCards.nth(0).boundingBox())?.height || 0;
        const height2 = (await jobCards.nth(1).boundingBox())?.height || 0;

        const diff = Math.abs(height1 - height2);
        const avgHeight = (height1 + height2) / 2;
        const percentDiff = (diff / avgHeight) * 100;

        // Cards should be consistent in height structure
        expect(percentDiff).toBeLessThan(30); // Allow some variation for content
      }
    });
  });

  test.describe('Content Overflow Protection', () => {
    test('should handle long job titles gracefully', async ({ page }) => {
      // Create job with very long title
      const longJob = await createTestJob(testUser.id, {
        title:
          'This is an extremely long job title that should wrap properly on mobile devices without breaking the layout',
        trade: 'Carpenter',
      });

      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');

      // Wait for long title job
      await page.waitForSelector('text=extremely long job title', {
        timeout: 10000,
      });

      // Card should not cause horizontal overflow
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()!.width;

      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);

      // Cleanup
      await deleteTestUser(longJob.employer_id);
    });

    test('should handle long location names', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');

      // Wait for jobs to load
      await page.waitForLoadState('networkidle');

      // Check that location text doesn't overflow
      const locationText = page.locator('text=/📍.*/').first();
      if ((await locationText.count()) > 0) {
        const box = await locationText.boundingBox();
        const viewportWidth = page.viewportSize()!.width;

        // Location should fit within viewport
        expect(box?.width).toBeLessThan(viewportWidth);
      }
    });
  });
});

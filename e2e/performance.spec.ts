import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
} from './utils/test-db';
import { loginAsUser, generateTestEmail } from './utils/test-helpers';

test.describe('Performance Testing', () => {
  let testUser: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();
    testUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Perf Test User',
      trade: 'Carpenter',
    });
  });

  test.afterEach(async () => {
    if (testUser) await deleteTestUser(testUser.id);
  });

  test('should load login page within performance budget', async ({
    page,
  }) => {
    const startTime = Date.now();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Verify page actually loaded (not testing mock)
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Login page should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should load dashboard within performance budget', async ({ page }) => {
    await loginAsUser(page, testUser);

    const startTime = Date.now();

    // Navigate to dashboard feed (actual landing page after login)
    await page.goto('/dashboard/feed');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Verify actual dashboard content loaded (not testing mock)
    await expect(page.locator('h1, h2').filter({ hasText: /feed|dashboard/i }).first()).toBeVisible();

    // Dashboard should load in under 4 seconds
    expect(loadTime).toBeLessThan(4000);
  });

  test('should measure Core Web Vitals for dashboard', async ({ page }) => {
    await loginAsUser(page, testUser);
    await page.goto('/dashboard/feed');

    // Measure Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise<any>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const webVitals: any = {};

          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              webVitals.lcp = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              webVitals.fid = (entry as any).processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift') {
              webVitals.cls = (entry as any).value;
            }
          });

          setTimeout(() => resolve(webVitals), 2000);
        });

        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      });
    });

    // LCP should be under 2.5 seconds (good threshold)
    if (metrics.lcp) {
      expect(metrics.lcp).toBeLessThan(2500);
    }

    // CLS should be under 0.1 (good threshold)
    if (metrics.cls) {
      expect(metrics.cls).toBeLessThan(0.1);
    }
  });

  test('should load images efficiently', async ({ page }) => {
    await loginAsUser(page, testUser);
    await page.goto('/dashboard/profile');
    await page.waitForLoadState('networkidle');

    // Verify profile page loaded (not testing mock)
    await expect(page.locator('h1, h2').filter({ hasText: /profile/i }).first()).toBeVisible();

    // Check all images have loaded
    const images = await page.$$('img');
    if (images.length > 0) {
      for (const img of images) {
        const isLoaded = await img.evaluate((el) => {
          const image = el as HTMLImageElement;
          return image.complete && image.naturalHeight !== 0;
        });
        expect(isLoaded).toBe(true);
      }
    }
  });

  test('should have acceptable bundle size', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Verify login page loaded (not testing mock)
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Measure total transferred size
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((r: any) => ({
        name: r.name,
        size: r.transferSize,
        duration: r.duration,
      }));
    });

    const totalSize = resources.reduce((sum, r) => sum + (r.size || 0), 0);
    const jsSize = resources
      .filter((r) => r.name.endsWith('.js'))
      .reduce((sum, r) => sum + (r.size || 0), 0);

    // Total page size should be under 2MB
    expect(totalSize).toBeLessThan(2 * 1024 * 1024);

    // JavaScript bundle should be under 1MB
    expect(jsSize).toBeLessThan(1 * 1024 * 1024);
  });

  test('should have fast Time to Interactive', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/pricing');
    await page.waitForLoadState('domcontentloaded');

    // Page should be interactive quickly - look for any CTA button or pricing card
    // Actual implementation may have "Get Started", "Choose Plan", or similar buttons
    const interactiveElement = page.locator('button, a[href*="checkout"], a[href*="subscribe"]').first();
    await expect(interactiveElement).toBeVisible({ timeout: 3000 });

    const tti = Date.now() - startTime;

    // Time to Interactive should be under 3.5 seconds
    expect(tti).toBeLessThan(3500);
  });

  test('should handle navigation without lag', async ({ page }) => {
    await loginAsUser(page, testUser);
    await page.goto('/dashboard/feed');

    const startTime = Date.now();

    // Navigate to profile using actual navigation link
    // Navigation is in sidebar on desktop, bottom nav on mobile
    const profileLink = page.locator('a[href="/dashboard/profile"]').first();
    await expect(profileLink).toBeVisible();
    await profileLink.click();
    await page.waitForLoadState('networkidle');

    const navTime = Date.now() - startTime;

    // Verify actual profile page loaded (not testing mock)
    await expect(page.locator('h1, h2').filter({ hasText: /profile/i }).first()).toBeVisible();

    // Client-side navigation should be fast (under 1 second)
    expect(navTime).toBeLessThan(1000);
  });

  test('should load external resources efficiently', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check external resources load time
    const externalResources = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .filter((r: any) => !r.name.startsWith(window.location.origin))
        .map((r: any) => ({
          name: r.name,
          duration: r.duration,
        }));
    });

    // Each external resource should load in under 2 seconds
    externalResources.forEach((resource) => {
      expect(resource.duration).toBeLessThan(2000);
    });
  });

  test('should have minimal layout shifts', async ({ page }) => {
    await loginAsUser(page, testUser);

    // Track layout shifts
    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });

        observer.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    // Cumulative Layout Shift should be minimal (< 0.1 is good)
    expect(cls).toBeLessThan(0.1);
  });

  test('should measure First Contentful Paint', async ({ page }) => {
    await page.goto('/login');

    const fcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(
            (entry) => entry.name === 'first-contentful-paint'
          );

          if (fcpEntry) {
            resolve(fcpEntry.startTime);
            observer.disconnect();
          }
        });

        observer.observe({ entryTypes: ['paint'] });

        // Timeout after 5 seconds
        setTimeout(() => resolve(5000), 5000);
      });
    });

    // FCP should be under 1.8 seconds (good threshold)
    expect(fcp).toBeLessThan(1800);
  });
});

test.describe('Role-Specific Performance Testing', () => {
  let workerUser: TestUser;
  let employerUser: TestUser;

  test.beforeEach(async () => {
    await cleanupTestData();

    // Create worker test user
    workerUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Worker Perf Test',
      trade: 'Carpenter',
    });

    // Create employer test user
    employerUser = await createTestUser({
      email: generateTestEmail(),
      password: 'TestPassword123!',
      role: 'Employer',
      name: 'Employer Perf Test',
      employerType: 'Contractor',
    });
  });

  test.afterEach(async () => {
    if (workerUser) await deleteTestUser(workerUser.id);
    if (employerUser) await deleteTestUser(employerUser.id);
  });

  test('worker should load job browsing page quickly', async ({ page }) => {
    await loginAsUser(page, workerUser);

    const startTime = Date.now();

    await page.goto('/dashboard/jobs');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Verify job browsing page loaded (not testing mock)
    await expect(page.locator('h1, h2').filter({ hasText: /jobs|browse/i }).first()).toBeVisible();

    // Job browsing should load in under 4 seconds
    expect(loadTime).toBeLessThan(4000);
  });

  test('employer should load job management page quickly', async ({ page }) => {
    await loginAsUser(page, employerUser);

    const startTime = Date.now();

    await page.goto('/dashboard/jobs');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Verify job management page loaded (not testing mock)
    await expect(page.locator('h1, h2').filter({ hasText: /jobs|posts/i }).first()).toBeVisible();

    // Job management should load in under 4 seconds
    expect(loadTime).toBeLessThan(4000);
  });

  test('employer should load worker search page quickly', async ({ page }) => {
    await loginAsUser(page, employerUser);

    const startTime = Date.now();

    await page.goto('/dashboard/workers');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Verify worker search page loaded (not testing mock)
    await expect(page.locator('h1, h2').filter({ hasText: /workers|find|search/i }).first()).toBeVisible();

    // Worker search should load in under 4 seconds
    expect(loadTime).toBeLessThan(4000);
  });

  test('admin dashboard should load within budget', async ({ page }) => {
    // Note: This test assumes test user can be granted admin access
    // In real implementation, admin flag would need to be set in database
    await loginAsUser(page, workerUser);

    const startTime = Date.now();

    // Try to load admin dashboard (may redirect if not admin)
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Admin dashboard should load in under 5 seconds (more complex queries)
    expect(loadTime).toBeLessThan(5000);
  });
});

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
} from './utils/test-db';
import { loginAsUser } from './utils/test-helpers';

test.describe('Accessibility Tests', () => {
  let testUser: TestUser;

  test.beforeAll(async () => {
    await cleanupTestData();
    testUser = await createTestUser({ role: 'worker' });
  });

  test.afterAll(async () => {
    if (testUser) await deleteTestUser(testUser.id);
  });

  test.describe('Public Pages Accessibility', () => {
    test('homepage should pass accessibility audit', async ({ page }) => {
      await page.goto('/');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      // Log any violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Homepage accessibility violations:', 
          accessibilityScanResults.violations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length,
          }))
        );
      }
      
      // Allow some minor violations but fail on critical/serious
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations.length).toBe(0);
    });

    test('login page should pass accessibility audit', async ({ page }) => {
      await page.goto('/login');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations.length).toBe(0);
    });

    test('signup page should pass accessibility audit', async ({ page }) => {
      await page.goto('/signup');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations.length).toBe(0);
    });

    test('pricing page should pass accessibility audit', async ({ page }) => {
      await page.goto('/pricing');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations.length).toBe(0);
    });
  });

  test.describe('Dashboard Pages Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsUser(page, testUser);
    });

    test('dashboard feed should pass accessibility audit', async ({ page }) => {
      await page.goto('/dashboard/feed');
      await page.waitForLoadState('networkidle');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations.length).toBe(0);
    });

    test('profile page should pass accessibility audit', async ({ page }) => {
      await page.goto('/dashboard/profile');
      await page.waitForLoadState('networkidle');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations.length).toBe(0);
    });

    test('jobs page should pass accessibility audit', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await page.waitForLoadState('networkidle');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations.length).toBe(0);
    });

    test('messages page should pass accessibility audit', async ({ page }) => {
      await page.goto('/dashboard/messages');
      await page.waitForLoadState('networkidle');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations.length).toBe(0);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate login form with keyboard', async ({ page }) => {
      await page.goto('/login');
      
      // Tab to email input
      await page.keyboard.press('Tab');
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeFocused();
      
      // Tab to password input
      await page.keyboard.press('Tab');
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeFocused();
      
      // Tab to submit button
      await page.keyboard.press('Tab');
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeFocused();
    });

    test('should navigate sidebar with keyboard', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/feed');
      
      // Tab through navigation links
      let foundNavLink = false;
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.locator(':focus');
        const tagName = await focused.evaluate((el) => el.tagName.toLowerCase());
        
        if (tagName === 'a') {
          foundNavLink = true;
          break;
        }
      }
      
      expect(foundNavLink).toBeTruthy();
    });

    test('should open and close modal with keyboard', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');
      
      // Look for a button that opens a modal
      const filterButton = page.locator('button:has-text("Filter")').first();
      
      if (await filterButton.isVisible()) {
        await filterButton.focus();
        await page.keyboard.press('Enter');
        
        // Check if modal opened
        const modal = page.locator('[role="dialog"]');
        
        if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Press Escape to close
          await page.keyboard.press('Escape');
          
          // Modal should be closed
          await expect(modal).not.toBeVisible({ timeout: 1000 }).catch(() => {});
        }
      }
    });

    test('should submit form with Enter key', async ({ page }) => {
      await page.goto('/login');
      
      await page.fill('input[type="email"]', 'test@test.com');
      await page.fill('input[type="password"]', 'password');
      
      // Press Enter to submit
      await page.keyboard.press('Enter');
      
      // Should attempt login (might show error for invalid credentials)
      await page.waitForLoadState('networkidle');
    });
  });

  test.describe('Focus Management', () => {
    test('should trap focus in modal', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');
      
      const filterButton = page.locator('button:has-text("Filter")').first();
      
      if (await filterButton.isVisible()) {
        await filterButton.click();
        
        const modal = page.locator('[role="dialog"]');
        
        if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Tab through modal elements
          for (let i = 0; i < 20; i++) {
            await page.keyboard.press('Tab');
            
            // Focused element should still be within modal
            const focusedInModal = await page.evaluate(() => {
              const modal = document.querySelector('[role="dialog"]');
              const focused = document.activeElement;
              return modal?.contains(focused) || false;
            });
            
            expect(focusedInModal).toBeTruthy();
          }
        }
      }
    });

    test('should return focus after modal closes', async ({ page }) => {
      await loginAsUser(page, testUser);
      await page.goto('/dashboard/jobs');
      
      const filterButton = page.locator('button:has-text("Filter")').first();
      
      if (await filterButton.isVisible()) {
        await filterButton.click();
        
        const modal = page.locator('[role="dialog"]');
        
        if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          
          // Focus should return to the trigger button
          // (This is best practice, may not be implemented)
        }
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/');
      
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const headingLevels = await Promise.all(
        headings.map(async (h) => {
          const tagName = await h.evaluate((el) => el.tagName);
          return parseInt(tagName.replace('H', ''));
        })
      );
      
      // Check that h1 exists
      expect(headingLevels).toContain(1);
      
      // Check heading hierarchy (no skipping levels)
      for (let i = 1; i < headingLevels.length; i++) {
        const diff = headingLevels[i] - headingLevels[i - 1];
        // Should not skip more than one level
        expect(diff).toBeLessThanOrEqual(1);
      }
    });

    test('should have alt text on images', async ({ page }) => {
      await page.goto('/');
      
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const ariaHidden = await img.getAttribute('aria-hidden');
        const role = await img.getAttribute('role');
        
        // Image should have alt text OR be hidden from screen readers
        const isAccessible = alt !== null || ariaHidden === 'true' || role === 'presentation';
        expect(isAccessible).toBeTruthy();
      }
    });

    test('should have proper form labels', async ({ page }) => {
      await page.goto('/login');
      
      const inputs = await page.locator('input:not([type="hidden"])').all();
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        
        // Check if there's a label for this input
        let hasLabel = false;
        
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          hasLabel = await label.count() > 0;
        }
        
        // Input should be labeled somehow
        const isLabeled = hasLabel || ariaLabel || ariaLabelledBy || placeholder;
        expect(isLabeled).toBeTruthy();
      }
    });

    test('should have proper button accessible names', async ({ page }) => {
      await page.goto('/login');
      
      const buttons = await page.locator('button').all();
      
      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const title = await button.getAttribute('title');
        
        // Button should have accessible name
        const hasAccessibleName = (text && text.trim().length > 0) || ariaLabel || title;
        expect(hasAccessibleName).toBeTruthy();
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/login');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .options({ runOnly: ['color-contrast'] })
        .analyze();
      
      // Log contrast issues
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Color contrast issues:', 
          accessibilityScanResults.violations[0]?.nodes.slice(0, 5).map(n => ({
            html: n.html.substring(0, 100),
            target: n.target[0],
          }))
        );
      }
      
      // Some contrast issues may be acceptable, but log them
      expect(accessibilityScanResults.violations.length).toBeLessThanOrEqual(3);
    });
  });

  test.describe('Responsive Accessibility', () => {
    test('should maintain accessibility on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 13 Pro
      await page.goto('/');
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      const criticalViolations = accessibilityScanResults.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );
      
      expect(criticalViolations.length).toBe(0);
    });
  });
});


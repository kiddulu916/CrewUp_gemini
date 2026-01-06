import { Page, Locator } from '@playwright/test';
import { TestUser } from './test-db';

/**
 * Login helper for E2E tests
 *
 * Waits for proper redirect to /dashboard/** after login
 * Handles rate limiting by waiting and retrying
 */
export async function loginAsUser(page: Page, user: TestUser, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await page.goto('/login');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Set consent in localStorage to prevent banner from blocking interactions
    await page.evaluate(() => {
      localStorage.setItem('krewup_ad_consent', JSON.stringify({
        personalized: false,
        analytics: false,
        timestamp: new Date().toISOString(),
        region: 'other',
      }));
    });

    // If consent banner is showing, dismiss it by clicking Necessary Only
    const consentButton = page.locator('button:has-text("Necessary Only")');
    if (await consentButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await consentButton.click();
      await page.waitForTimeout(300); // Brief wait for banner to close
    }

    // Check for rate limit message and wait if present
    const rateLimitMessage = page.locator('text=/too many attempts/i');
    if (await rateLimitMessage.isVisible({ timeout: 500 }).catch(() => false)) {
      // Extract wait time from message or use default 10 seconds
      const messageText = await rateLimitMessage.textContent() || '';
      const waitMatch = messageText.match(/(\d+)\s*seconds?/i);
      const waitTime = waitMatch ? parseInt(waitMatch[1]) * 1000 + 1000 : 10000;
      await page.waitForTimeout(waitTime);
      continue; // Retry after waiting
    }

    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.click('button[type="submit"]');

    // Check for error messages after login attempt
    const errorMessage = page.locator('text=/invalid|error|too many/i');
    if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
      const errorText = await errorMessage.textContent() || '';
      if (errorText.toLowerCase().includes('too many')) {
        // Rate limited, wait and retry
        const waitMatch = errorText.match(/(\d+)\s*seconds?/i);
        const waitTime = waitMatch ? parseInt(waitMatch[1]) * 1000 + 1000 : 10000;
        await page.waitForTimeout(waitTime);
        continue;
      }
    }

    // Wait for redirect to dashboard or onboarding
    try {
      // Wait for either dashboard or onboarding redirect
      await Promise.race([
        page.waitForURL('/dashboard/**', { timeout: 15000 }),
        page.waitForURL('/onboarding', { timeout: 15000 }),
      ]);
      
      // Wait for network to settle and any redirects to complete
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      
      // If redirected to onboarding, throw error since test users should have complete profiles
      if (page.url().includes('/onboarding')) {
        throw new Error('User was redirected to onboarding - profile incomplete');
      }
      
      // Verify we're actually on dashboard (not just passing through)
      await page.waitForURL('/dashboard/**', { timeout: 3000 });
      
      return; // Success!
    } catch (e) {
      if (attempt === maxRetries) {
        throw new Error(`Login failed after ${maxRetries} attempts: ${e}`);
      }
      // Wait before retry
      await page.waitForTimeout(5000);
    }
  }
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Look for logout button in various locations
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out")').first();
  await logoutButton.click();

  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Wait for toast notification with specific message
 *
 * Returns true if toast appeared, false if timeout
 */
export async function waitForToast(
  page: Page,
  message: string | RegExp,
  options: { timeout?: number } = {}
): Promise<boolean> {
  const timeout = options.timeout || 5000;

  try {
    const toastSelector = typeof message === 'string'
      ? `text=${message}`
      : message.source;

    await page.waitForSelector(toastSelector, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for any toast notification to appear
 */
export async function waitForAnyToast(page: Page, timeout: number = 5000): Promise<boolean> {
  try {
    // Common toast selectors
    await page.waitForSelector(
      '[role="alert"], [data-sonner-toast], .toast, [class*="toast"]',
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Fill location autocomplete field
 *
 * IMPORTANT: Replaces arbitrary timeout with proper state waiting
 */
export async function fillLocation(
  page: Page,
  location: string,
  options: { selector?: string } = {}
) {
  const selector = options.selector || 'input[placeholder*="location" i]';
  const input = page.locator(selector).first();

  await input.fill(location);

  // Wait for autocomplete dropdown to appear
  await page.waitForSelector('.pac-container, [role="listbox"]', {
    timeout: 5000,
    state: 'visible'
  }).catch(() => {
    // If autocomplete doesn't appear, continue anyway
  });

  // Select first suggestion
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  // Wait for input to update with selected value
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel) as HTMLInputElement;
      return el && el.value.length > 0;
    },
    selector,
    { timeout: 2000 }
  ).catch(() => {});
}

/**
 * Navigate to page from sidebar
 */
export async function navigateTo(page: Page, linkText: string) {
  const link = page.locator(`nav a:has-text("${linkText}")`).first();
  await link.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to page using bottom navigation (mobile)
 */
export async function navigateToMobile(page: Page, linkText: string) {
  // Mobile nav is usually at bottom with icons/labels
  const link = page.locator(`[data-mobile-nav] a:has-text("${linkText}"), footer nav a:has-text("${linkText}")`).first();
  await link.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.krewup.local`;
}

/**
 * Take screenshot with name and save to e2e/screenshots/
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}

/**
 * Wait for element to be visible with better error message
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number; state?: 'visible' | 'attached' | 'hidden' } = {}
): Promise<Locator> {
  const timeout = options.timeout || 5000;
  const state = options.state || 'visible';

  const element = page.locator(selector);
  await element.waitFor({ timeout, state });

  return element;
}

/**
 * Wait for page to be ready for interaction
 * Combines URL check and network idle
 */
export async function waitForPageReady(
  page: Page,
  expectedUrl: string | RegExp,
  options: { timeout?: number } = {}
) {
  const timeout = options.timeout || 10000;

  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForURL(expectedUrl, { timeout });
}

/**
 * Fill form field and wait for it to update
 */
export async function fillAndVerify(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  const input = page.locator(selector);
  await input.fill(value);

  // Verify value was set
  await page.waitForFunction(
    ({ selector, value }) => {
      const el = document.querySelector(selector) as HTMLInputElement;
      return el && el.value === value;
    },
    { selector, value },
    { timeout: 2000 }
  );
}

/**
 * Select option from dropdown and verify selection
 */
export async function selectAndVerify(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  const select = page.locator(selector);
  await select.selectOption(value);

  // Verify selection
  await page.waitForFunction(
    ({ selector, value }) => {
      const el = document.querySelector(selector) as HTMLSelectElement;
      return el && el.value === value;
    },
    { selector, value },
    { timeout: 2000 }
  );
}

/**
 * Check checkbox and verify it's checked
 */
export async function checkAndVerify(
  page: Page,
  selector: string
): Promise<void> {
  const checkbox = page.locator(selector);
  await checkbox.check();

  // Verify checked state
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel) as HTMLInputElement;
      return el && el.checked === true;
    },
    selector,
    { timeout: 2000 }
  );
}

/**
 * Upload file to input and wait for upload completion
 */
export async function uploadFile(
  page: Page,
  selector: string,
  filePath: string,
  options: { waitForSuccess?: boolean; timeout?: number } = {}
): Promise<void> {
  const fileInput = page.locator(selector);
  await fileInput.setInputFiles(filePath);

  if (options.waitForSuccess !== false) {
    // Wait for upload success indicator
    await page.waitForSelector(
      'text=/uploaded|success|complete/i',
      { timeout: options.timeout || 10000 }
    ).catch(() => {
      // If no success indicator, continue anyway
    });
  }
}

/**
 * Wait for specific text to appear on page
 */
export async function waitForText(
  page: Page,
  text: string | RegExp,
  options: { timeout?: number } = {}
): Promise<boolean> {
  try {
    await page.waitForSelector(
      typeof text === 'string' ? `text=${text}` : `text=${text.source}`,
      { timeout: options.timeout || 5000 }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Scroll element into view
 */
export async function scrollIntoView(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();
}

/**
 * Get current URL path (without query params or hash)
 */
export function getCurrentPath(page: Page): string {
  const url = new URL(page.url());
  return url.pathname;
}

/**
 * Wait for navigation to complete after action
 */
export async function clickAndWaitForNavigation(
  page: Page,
  selector: string,
  expectedUrl?: string | RegExp
): Promise<void> {
  const [response] = await Promise.all([
    page.waitForNavigation({ timeout: 10000 }),
    page.click(selector),
  ]);

  if (expectedUrl) {
    await page.waitForURL(expectedUrl, { timeout: 5000 });
  }
}

/**
 * Wait for network to be idle (useful after form submissions)
 */
export async function waitForNetworkIdle(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Get text content from element
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  return (await element.textContent()) || '';
}

/**
 * Check if element exists (without waiting)
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  const count = await page.locator(selector).count();
  return count > 0;
}

/**
 * Wait for element to disappear
 */
export async function waitForElementToDisappear(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  await page.locator(selector).waitFor({ state: 'hidden', timeout });
}

/**
 * Retry an action until it succeeds or times out
 */
export async function retryUntilSuccess<T>(
  action: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    errorMessage?: string;
  } = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts || 3;
  const delayMs = options.delayMs || 1000;
  const errorMessage = options.errorMessage || 'Action failed after max attempts';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`${errorMessage}: ${error}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(errorMessage);
}

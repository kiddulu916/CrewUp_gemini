import { test, expect } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  cleanupTestData,
  TestUser,
} from './utils/test-db';
import {
  loginAsUser,
  navigateTo,
  waitForToast,
  fillLocation,
} from './utils/test-helpers';

test.describe('Profile Management', () => {
  let testUser: TestUser;

  test.beforeEach(async ({ page }) => {
    await cleanupTestData();
    testUser = await createTestUser({
      email: `worker-${Date.now()}@test.krewup.local`,
      password: 'TestPassword123!',
      role: 'Worker',
      name: 'Test Worker',
      trade: 'Carpenter',
      location: 'Chicago, IL',
    });

    await loginAsUser(page, testUser);
  });

  test.afterEach(async () => {
    if (testUser) {
      await deleteTestUser(testUser.id);
    }
  });

  test('should view profile page', async ({ page }) => {
    await navigateTo(page, 'Profile');

    // Check profile information is displayed
    await expect(page.locator('text=Test Worker')).toBeVisible();
    await expect(page.locator('text=Carpenter')).toBeVisible();
    await expect(page.locator('text=Chicago, IL')).toBeVisible();
  });

  test('should edit profile information', async ({ page }) => {
    await navigateTo(page, 'Profile');

    // Click edit button (it's a Button component wrapped in Link)
    await page.click('a:has(button:has-text("Edit Profile"))');
    await expect(page).toHaveURL(/\/dashboard\/profile\/edit/);

    // Update profile fields - using id selectors from actual implementation
    await page.fill('input#name', 'Updated Worker Name');
    await page.fill('textarea#bio', 'This is my updated bio');

    // Change trade - using id selector
    await page.selectOption('select#trade', 'Electrician');

    // Submit form - button text is "Save Changes" not "Save"
    await page.click('button[type="submit"]:has-text("Save Changes")');

    // Wait for success toast
    await waitForToast(page, 'Profile updated');

    // Verify changes on profile page
    await expect(page).toHaveURL(/\/dashboard\/profile/);
    await expect(page.locator('text=Updated Worker Name')).toBeVisible();
    await expect(page.locator('text=Electrician')).toBeVisible();
  });

  test('should add certification', async ({ page }) => {
    await navigateTo(page, 'Profile');

    // On profile page, click "Add Certification" button in certifications section
    // This is in a CollapsibleSection with an actions prop
    await page.click('button:has-text("Add Certification")');
    await expect(page).toHaveURL(/\/dashboard\/profile\/certifications/);

    // Fill certification form using actual field names from certification-form.tsx
    // Select certification type (using id selector)
    await page.selectOption('select#certification_type', 'OSHA 10');

    // Fill certification number (required field)
    await page.fill('input#certification_number', 'OSHA-10-12345');

    // Fill issued_by (not issuing_organization)
    await page.fill('input#issued_by', 'OSHA Training Institute');

    // Set issue date to past date
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    const dateString = pastDate.toISOString().split('T')[0];
    await page.fill('input#issue_date', dateString);

    // Upload a certification photo (required for verification)
    // Create a mock file for testing
    const buffer = Buffer.from('fake-image-data');
    await page.setInputFiles('input#photo-upload', {
      name: 'certification.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });

    // Submit - button text is "Add Certification" not "Add"
    await page.click('button:has-text("Add Certification")');

    // Wait for success - message is more specific
    await waitForToast(page, 'submitted for verification');

    // Verify we're redirected back to profile
    await expect(page).toHaveURL(/\/dashboard\/profile/);

    // Verify certification appears in list
    await expect(page.locator('text=OSHA 10')).toBeVisible();
    await expect(page.locator('text=OSHA-10-12345')).toBeVisible();
  });

  test('should delete certification', async ({ page }) => {
    // First add a certification
    await navigateTo(page, 'Profile');
    await page.click('button:has-text("Add Certification")');

    // Fill certification form with required fields
    await page.selectOption('select#certification_type', 'First Aid/CPR');
    await page.fill('input#certification_number', 'CPR-12345');
    await page.fill('input#issued_by', 'Red Cross');
    const dateString = new Date().toISOString().split('T')[0];
    await page.fill('input#issue_date', dateString);

    // Upload certification photo (required)
    const buffer = Buffer.from('fake-image-data');
    await page.setInputFiles('input#photo-upload', {
      name: 'certification.jpg',
      mimeType: 'image/jpeg',
      buffer: buffer,
    });

    await page.click('button:has-text("Add Certification")');
    await waitForToast(page, 'submitted for verification');

    // We're back at profile, certification should be visible
    await expect(page.locator('text=First Aid/CPR')).toBeVisible();

    // Now delete it - look for delete button in certification item
    await page.click('button:has-text("Delete")').first();

    // Confirm deletion in dialog
    await page.click('button:has-text("Delete"):visible');

    // Wait for success
    await waitForToast(page, 'deleted');

    // Verify it's gone
    await expect(page.locator('text=First Aid/CPR')).not.toBeVisible();
  });

  test('should add work experience', async ({ page }) => {
    await navigateTo(page, 'Profile');

    // Click add experience button on profile page
    await page.click('button:has-text("Add Experience")');
    await expect(page).toHaveURL(/\/dashboard\/profile\/experience/);

    // Fill experience form using actual field names from experience-form.tsx
    // Field names are job_title and company_name, not title and company
    await page.fill('input#company_name', 'ABC Construction');
    await page.fill('input#job_title', 'Senior Carpenter');
    await page.fill(
      'textarea#description',
      'Built custom cabinets and furniture'
    );

    // Set dates
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);
    await page.fill('input#start_date', startDate.toISOString().split('T')[0]);

    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() - 1);
    await page.fill('input#end_date', endDate.toISOString().split('T')[0]);

    // Submit - button text is "Add Experience" not "Add"
    await page.click('button:has-text("Add Experience")');

    // Wait for success
    await waitForToast(page, 'Experience added');

    // Verify we're redirected to profile
    await expect(page).toHaveURL(/\/dashboard\/profile/);

    // Verify experience appears
    await expect(page.locator('text=ABC Construction')).toBeVisible();
    await expect(page.locator('text=Senior Carpenter')).toBeVisible();
  });

  test('should delete work experience', async ({ page }) => {
    // First add experience
    await navigateTo(page, 'Profile');
    await page.click('button:has-text("Add Experience")');

    // Fill with correct field names
    await page.fill('input#company_name', 'Test Company');
    await page.fill('input#job_title', 'Test Position');
    const dateString = new Date().toISOString().split('T')[0];
    await page.fill('input#start_date', dateString);

    // Check "I currently work here" checkbox - using id selector
    await page.check('input#is_current');

    await page.click('button:has-text("Add Experience")');
    await waitForToast(page, 'Experience added');

    // Verify we're back at profile
    await expect(page).toHaveURL(/\/dashboard\/profile/);

    // Delete it
    await page.click('button:has-text("Delete")').first();
    await page.click('button:has-text("Delete"):visible');

    // Wait for success
    await waitForToast(page, 'deleted');

    // Verify it's gone
    await expect(page.locator('text=Test Company')).not.toBeVisible();
  });

  test('should update location with autocomplete', async ({ page }) => {
    await navigateTo(page, 'Profile');
    await page.click('a:has(button:has-text("Edit Profile"))');

    // The LocationAutocomplete component has specific placeholder text
    // Looking for input with placeholder containing location, city, or address
    const locationInput = page.locator('input[placeholder*="Chicago, IL" i]').or(
      page.locator('input[placeholder*="location" i]')
    ).first();

    await locationInput.clear();
    await locationInput.fill('New York');

    // Wait for autocomplete and select
    await page.waitForTimeout(1500);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Submit - correct button text
    await page.click('button[type="submit"]:has-text("Save Changes")');
    await waitForToast(page, 'Profile updated');

    // Verify we're back at profile
    await expect(page).toHaveURL(/\/dashboard\/profile/);

    // Verify location updated
    await expect(page.locator('text=/New York/i')).toBeVisible();
  });
});

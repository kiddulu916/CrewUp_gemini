import { Page, expect } from '@playwright/test';

/**
 * Fills out the 8-step application wizard with minimal required data
 *
 * Field names match the actual ApplicationFormData interface from the codebase
 */
export async function fillApplicationWizard(
  page: Page,
  options?: {
    coverLetter?: string;
    skipResume?: boolean;
    customAnswers?: Record<string, string>;
  }
) {
  // Step 1: Documents - Cover letter text
  await expect(page.locator('text=Documents')).toBeVisible();

  if (options?.coverLetter) {
    await page.fill('textarea[name="coverLetterText"]', options.coverLetter);
  }

  await page.click('button:has-text("Next")');

  // Step 2: Personal Info
  await expect(page.locator('text=Personal Information')).toBeVisible();
  await page.fill('input[name="fullName"]', 'Test Worker Name');
  await page.fill('input[name="address.street"]', '123 Test St');
  await page.fill('input[name="address.city"]', 'Chicago');
  await page.fill('input[name="address.state"]', 'IL');
  await page.fill('input[name="address.zipCode"]', '60601');
  await page.click('button:has-text("Next")');

  // Step 3: Contact & Availability
  await expect(page.locator('text=Contact & Availability')).toBeVisible();
  await page.fill('input[name="phoneNumber"]', '(312) 555-1234');

  // Set start date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().split('T')[0];
  await page.fill('input[name="availableStartDate"]', dateString);
  await page.click('button:has-text("Next")');

  // Step 4: Work Authorization
  await expect(page.locator('text=Work Authorization')).toBeVisible();
  await page.check('input[name="authorizedToWork"]');
  await page.check('input[name="hasDriversLicense"]');

  // Select license class if field exists
  const licenseClassField = page.locator('select[name="licenseClass"]');
  if (await licenseClassField.isVisible({ timeout: 1000 }).catch(() => false)) {
    await licenseClassField.selectOption('C'); // Class C (passenger vehicles)
  }

  await page.check('input[name="hasReliableTransportation"]');
  await page.click('button:has-text("Next")');

  // Step 5: Work History
  await expect(page.locator('text=Work History')).toBeVisible();

  // Add at least one work history entry
  await page.click('button:has-text("Add Work History")');

  // CORRECTED: Use actual field names from ApplicationFormData
  await page.fill('input[name="workHistory.0.companyName"]', 'Previous Employer LLC');
  await page.fill('input[name="workHistory.0.jobTitle"]', 'Carpenter');
  await page.fill('input[name="workHistory.0.startDate"]', '2020-01');
  await page.fill('input[name="workHistory.0.endDate"]', '2023-12');
  await page.fill('textarea[name="workHistory.0.responsibilities"]', 'Built things');
  await page.click('button:has-text("Next")');

  // Step 6: Education
  await expect(page.locator('text=Education')).toBeVisible();

  // Add one education entry
  await page.click('button:has-text("Add Education")');

  // CORRECTED: Use actual field names from ApplicationFormData
  await page.fill('input[name="education.0.institutionName"]', 'Trade School');
  await page.fill('input[name="education.0.degreeType"]', 'Certificate');
  await page.fill('input[name="education.0.fieldOfStudy"]', 'Carpentry');
  await page.fill('input[name="education.0.graduationYear"]', '2020');
  await page.click('button:has-text("Next")');

  // Step 7: Skills & Certifications
  await expect(page.locator('text=Skills')).toBeVisible();
  await page.fill('input[name="yearsOfExperience"]', '5');

  // Trade skills - enter comma-separated list
  await page.fill('input[name="tradeSkills"]', 'Framing, Finishing, Blueprint Reading');
  await page.click('button:has-text("Next")');

  // Step 8: References & Final Questions
  await expect(page.locator('text=References')).toBeVisible();

  // Add one professional reference
  await page.click('button:has-text("Add Reference")');
  await page.fill('input[name="references.0.name"]', 'John Doe');
  await page.fill('input[name="references.0.company"]', 'ABC Construction');
  await page.fill('input[name="references.0.relationship"]', 'Former Supervisor');
  await page.fill('input[name="references.0.phoneNumber"]', '(312) 555-9999');
  await page.fill('input[name="references.0.email"]', 'john@abc.com');

  // Emergency contact
  await page.fill('input[name="emergencyContact.name"]', 'Jane Doe');
  await page.fill('input[name="emergencyContact.relationship"]', 'Spouse');
  await page.fill('input[name="emergencyContact.phoneNumber"]', '(312) 555-8888');

  // Final questions
  await page.fill(
    'textarea[name="whyInterested"]',
    'I am interested in this position because it matches my skills.'
  );
  await page.fill('input[name="salaryExpectations"]', '$30-35/hour');
  await page.fill('input[name="howHeardAboutJob"]', 'Job board');

  // Consents - CORRECTED field names
  await page.check('input[name="consents.physicalRequirements"]');
  await page.check('input[name="consents.backgroundCheck"]');
  await page.check('input[name="consents.drugTest"]');
  await page.check('input[name="consents.dataAccuracy"]');

  // If there are custom screening questions (Step 9), handle them
  if (options?.customAnswers) {
    await page.click('button:has-text("Next")');
    await expect(page.locator('text=Screening Questions')).toBeVisible();

    for (const [questionId, answer] of Object.entries(options.customAnswers)) {
      await page.fill(`textarea[name="customAnswers.${questionId}"]`, answer);
    }
  }
}

/**
 * Uploads a file to the resume field in Step 1
 */
export async function uploadResumeFile(page: Page, filePath: string) {
  const fileInput = page.locator('input[type="file"][accept*="pdf"]').first();
  await fileInput.setInputFiles(filePath);

  // Wait for upload success indicator
  await expect(page.locator('text=/uploaded|success/i')).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Uploads a cover letter file in Step 1
 */
export async function uploadCoverLetterFile(page: Page, filePath: string) {
  const fileInput = page.locator('input[type="file"]').nth(1);
  await fileInput.setInputFiles(filePath);

  // Wait for upload success
  await expect(page.locator('text=/uploaded|success/i')).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Waits for the auto-save indicator to show "Saved"
 */
export async function waitForAutoSave(page: Page) {
  // Look for "Last saved at" or "Saved" indicator
  await expect(page.locator('text=/saved|last saved/i')).toBeVisible({
    timeout: 35000,
  });
}

/**
 * Verifies the wizard progress indicator shows correct step
 */
export async function expectWizardStep(
  page: Page,
  stepNumber: number,
  totalSteps: number = 8
) {
  await expect(
    page.locator(`text=/step ${stepNumber} of ${totalSteps}/i`)
  ).toBeVisible();
}

/**
 * Navigates to a specific step using the progress indicator (if clickable)
 */
export async function goToWizardStep(page: Page, stepNumber: number) {
  // If progress indicator has clickable steps
  const stepIndicator = page.locator(`[data-step="${stepNumber}"]`);
  if (await stepIndicator.isVisible()) {
    await stepIndicator.click();
  }
}

/**
 * Submits the application from the final step
 */
export async function submitApplication(page: Page) {
  await page.click('button:has-text("Submit Application")');

  // Wait for success redirect or toast
  await page.waitForURL(/\/dashboard\/(applications|jobs)/, { timeout: 15000 });
}

/**
 * Checks that the apply page prevents duplicate applications
 */
export async function expectDuplicateApplicationBlock(page: Page) {
  // Should redirect away from /apply page
  await expect(page).not.toHaveURL(/\/apply$/);

  // Should show message or be redirected
  await expect(
    page.locator('text=/already applied|application exists/i')
  )
    .toBeVisible({ timeout: 5000 })
    .catch(() => {
      // If no message, should have redirected to job page
      expect(page.url()).toMatch(/\/dashboard\/jobs\/[^/]+$/);
    });
}

/**
 * Verifies application appears in worker's applications list
 */
export async function expectApplicationInList(
  page: Page,
  jobTitle: string,
  employerName: string,
  status: string = 'pending'
) {
  await expect(page.locator(`text=${jobTitle}`)).toBeVisible();
  await expect(page.locator(`text=${employerName}`)).toBeVisible();
  await expect(page.locator(`text=${status}`)).toBeVisible();
}

/**
 * Verifies application detail page shows all submitted data
 */
export async function expectApplicationDetails(
  page: Page,
  data: {
    jobTitle: string;
    fullName: string;
    phoneNumber: string;
    workHistory?: boolean;
    education?: boolean;
    references?: boolean;
  }
) {
  await expect(page.locator(`text=${data.jobTitle}`)).toBeVisible();
  await expect(page.locator(`text=${data.fullName}`)).toBeVisible();
  await expect(page.locator(`text=${data.phoneNumber}`)).toBeVisible();

  if (data.workHistory) {
    await expect(
      page.locator('text=/work history|previous employer/i')
    ).toBeVisible();
  }

  if (data.education) {
    await expect(page.locator('text=/education|trade school/i')).toBeVisible();
  }

  if (data.references) {
    await expect(
      page.locator('text=/references|professional reference/i')
    ).toBeVisible();
  }
}

/**
 * Updates application status as employer
 */
export async function updateApplicationStatus(
  page: Page,
  applicationId: string,
  newStatus: 'viewed' | 'contacted' | 'hired' | 'rejected'
) {
  // Look for status update button or dropdown
  const statusButton = page.locator(`button:has-text("${newStatus}")`);

  if (await statusButton.isVisible()) {
    await statusButton.click();
  } else {
    // Might be a select/dropdown
    const statusSelect = page.locator('select[name="status"]');
    await statusSelect.selectOption(newStatus);
  }

  // Wait for update to complete - CORRECTED: No arbitrary timeout
  await page.waitForLoadState('networkidle', { timeout: 5000 });
  await expect(page.locator(`text=${newStatus}`)).toBeVisible();
}

/**
 * Navigates to previous step in wizard
 */
export async function goToPreviousStep(page: Page) {
  await page.click('button:has-text("Back"), button:has-text("Previous")');
  await page.waitForLoadState('networkidle');
}

/**
 * Navigates to next step in wizard
 */
export async function goToNextStep(page: Page) {
  await page.click('button:has-text("Next"), button:has-text("Continue")');
  await page.waitForLoadState('networkidle');
}

/**
 * Verifies all required fields are marked as such
 */
export async function expectRequiredFields(page: Page, fieldNames: string[]) {
  for (const fieldName of fieldNames) {
    const field = page.locator(`input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`);
    await expect(field).toHaveAttribute('required', '');
  }
}

/**
 * Clears form field
 */
export async function clearField(page: Page, selector: string) {
  const field = page.locator(selector);
  await field.clear();
}

/**
 * Verifies validation error appears for a field
 */
export async function expectValidationError(
  page: Page,
  fieldName: string,
  errorMessage?: string
) {
  // Look for error message near the field
  const errorSelector = errorMessage
    ? `text=${errorMessage}`
    : `[data-error-for="${fieldName}"], [id="${fieldName}-error"]`;

  await expect(page.locator(errorSelector)).toBeVisible();
}

/**
 * Verifies form can't be submitted with validation errors
 */
export async function expectSubmitDisabled(page: Page) {
  const submitButton = page.locator(
    'button[type="submit"], button:has-text("Submit")'
  );
  await expect(submitButton).toBeDisabled();
}

/**
 * Fills a dynamic array field (like work history or education)
 */
export async function fillArrayField(
  page: Page,
  baseName: string,
  index: number,
  fields: Record<string, string>
) {
  for (const [fieldName, value] of Object.entries(fields)) {
    const fullName = `${baseName}.${index}.${fieldName}`;
    const field = page.locator(
      `input[name="${fullName}"], textarea[name="${fullName}"], select[name="${fullName}"]`
    );

    if (await field.getAttribute('type') === 'checkbox') {
      if (value === 'true' || value === '1') {
        await field.check();
      }
    } else {
      await field.fill(value);
    }
  }
}

/**
 * Removes an entry from a dynamic array (work history, education, etc.)
 */
export async function removeArrayEntry(
  page: Page,
  baseName: string,
  index: number
) {
  const removeButton = page.locator(
    `button[data-remove="${baseName}-${index}"], button:has-text("Remove"):near([name^="${baseName}.${index}"])`
  ).first();

  await removeButton.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Verifies application was saved as draft
 */
export async function expectDraftSaved(page: Page) {
  await expect(
    page.locator('text=/draft saved|saved as draft/i')
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Continues from a saved draft application
 */
export async function continueFromDraft(page: Page, jobId: string) {
  await page.goto(`/dashboard/jobs/${jobId}/apply`);

  // Should see option to continue draft
  const continueButton = page.locator('button:has-text("Continue Draft")');
  if (await continueButton.isVisible({ timeout: 2000 })) {
    await continueButton.click();
  }

  await page.waitForLoadState('networkidle');
}

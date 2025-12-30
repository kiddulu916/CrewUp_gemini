import { z } from 'zod';

// Step 1: Documents (optional)
export const step1Schema = z.object({
  resumeFile: z.instanceof(File).optional(),
  coverLetterFile: z.instanceof(File).optional(),
  coverLetterText: z.string().optional(),
});

// Step 2: Personal Information
export const step2Schema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required').max(2),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  }),
});

// Step 3: Contact & Availability
export const step3Schema = z.object({
  phoneNumber: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Phone must be (XXX) XXX-XXXX format'),
  availableStartDate: z.string().min(1, 'Start date is required'),
});

// Step 4: Work Authorization
export const step4Schema = z.object({
  authorizedToWork: z.boolean(),
  hasDriversLicense: z.boolean(),
  licenseClass: z.enum(['A', 'B', 'C']).optional(),
  hasReliableTransportation: z.boolean(),
});

// Step 5: Work History
export const workHistoryEntrySchema = z.object({
  id: z.string(),
  companyName: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  responsibilities: z.string().min(1, 'Responsibilities are required'),
  reasonForLeaving: z.string().optional(),
});

export const step5Schema = z.object({
  workHistory: z.array(workHistoryEntrySchema).min(1, 'At least one work entry required'),
});

// Step 6: Education
export const educationEntrySchema = z.object({
  id: z.string(),
  institutionName: z.string().min(1, 'Institution name is required'),
  degreeType: z.string().min(1, 'Degree type is required'),
  fieldOfStudy: z.string().min(1, 'Field of study is required'),
  graduationYear: z.number().min(1950).max(new Date().getFullYear() + 10),
  isCurrentlyEnrolled: z.boolean(),
});

export const step6Schema = z.object({
  education: z.array(educationEntrySchema).min(1, 'At least one education entry required'),
});

// Step 7: Skills & Certifications
export const certificationEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Certification name is required'),
  issuingOrganization: z.string().min(1, 'Issuing organization is required'),
  expirationDate: z.string().optional(),
});

export const step7Schema = z.object({
  yearsOfExperience: z.number().min(0).max(50),
  tradeSkills: z.array(z.string()).min(3, 'Select at least 3 skills'),
  certifications: z.array(certificationEntrySchema),
});

// Step 8: References & Final
export const referenceEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Reference name is required'),
  company: z.string().min(1, 'Company is required'),
  phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Phone must be (XXX) XXX-XXXX format'),
  email: z.string().email('Invalid email address'),
  relationship: z.string().min(1, 'Relationship is required'),
});

export const step8Schema = z.object({
  references: z.array(referenceEntrySchema).optional(),
  whyInterested: z.string().min(50, 'Please write at least 50 characters'),
  salaryExpectations: z.string().min(1, 'Salary expectations required'),
  howHeardAboutJob: z.string().min(1, 'Please select how you heard about this job'),
  emergencyContact: z.object({
    name: z.string().min(1, 'Emergency contact name required'),
    relationship: z.string().min(1, 'Relationship required'),
    phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Phone must be (XXX) XXX-XXXX format'),
  }),
  consents: z.object({
    physicalRequirements: z.boolean().refine((val) => val === true, {
      message: 'You must acknowledge physical requirements',
    }),
    backgroundCheck: z.boolean().refine((val) => val === true, {
      message: 'You must consent to background check',
    }),
    drugTest: z.boolean().refine((val) => val === true, {
      message: 'You must consent to drug test',
    }),
  }),
});

// Combined schema for full form
export const fullApplicationSchema = z.object({
  ...step1Schema.shape,
  ...step2Schema.shape,
  ...step3Schema.shape,
  ...step4Schema.shape,
  ...step5Schema.shape,
  ...step6Schema.shape,
  ...step7Schema.shape,
  ...step8Schema.shape,
});

export type FullApplicationSchema = z.infer<typeof fullApplicationSchema>;

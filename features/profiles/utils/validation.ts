import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  phone: z.string().optional().refine((val) => !val || /^\(\d{3}\)\d{3}-\d{4}$/.test(val), {
    message: 'Phone must be in (XXX)XXX-XXXX format',
  }),
  location: z.string().min(1, 'Location is required'),
  coords: z.object({
    lat: z.number(),
    lng: z.number(),
  }).nullable().optional(),
  trade: z.string().min(1, 'Primary trade is required'),
  sub_trade: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  employer_type: z.string().optional(),
  company_name: z.string().max(100, 'Company name must be less than 100 characters').optional(),
});

export const experienceSchema = z.object({
  job_title: z.string().min(1, 'Job title is required').max(100),
  company_name: z.string().min(1, 'Company name is required').max(100),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional(),
  is_current: z.boolean().default(false),
  description: z.string().max(500).optional(),
}).refine((data) => data.is_current || !!data.end_date, {
  message: "End date is required if not currently working here",
  path: ["end_date"],
});

export const educationSchema = z.object({
  institution_name: z.string().min(1, 'Institution name is required').max(100),
  degree_type: z.string().min(1, 'Degree type is required').max(100),
  field_of_study: z.string().max(100).optional(),
  graduation_year: z.number().optional(),
  is_currently_enrolled: z.boolean().default(false),
});

export const certificationSchema = z.object({
  certification_type: z.string().min(1, 'Certification type is required'),
  customCertification: z.string().optional(),
  certification_number: z.string().min(1, 'Certification number is required'),
  issued_by: z.string().min(1, 'Issuing organization is required'),
  issue_date: z.string().min(1, 'Issue date is required'),
  expires_at: z.string().optional(),
  selectedCategory: z.string().optional(),
});

export type ProfileSchema = z.infer<typeof profileSchema>;
export type ExperienceSchema = z.infer<typeof experienceSchema>;
export type EducationSchema = z.infer<typeof educationSchema>;
export type CertificationSchema = z.infer<typeof certificationSchema>;

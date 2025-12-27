// Contractor Licenses organized by category
// Data from docs/certifications-organized.md

export const LICENSE_CATEGORIES = {
  'General Licenses': [
    'Class A',
    'Class B',
    'Class B-2',
  ],
  'Specialty Contractors (Class C)': [
    'C-2',
    'C-4',
    'C-5',
    'C-6',
    'C-7',
    'C-8',
    'C-9',
    'C-10',
    'C-11',
    'C-12',
    'C-13',
    'C-15',
    'C-16',
    'C-17',
    'C-20',
    'C-21',
    'C-22',
    'C-29',
    'C-35',
    'C-36',
    'C-38',
    'C-39',
    'C-46',
    'C-47',
    'C-51',
    'C-53',
    'C-54',
    'C-55',
    'C-57',
    'C-60',
  ],
  'Limited Specialty (C-61)': [
    'D-49',
    'D-50',
    'D-52',
    'D-59',
    'D-62',
    'D-63',
  ],
} as const;

// Flat array of all licenses for dropdowns
export const ALL_LICENSES = Object.values(LICENSE_CATEGORIES).flat();

// Type for contractor license
export type ContractorLicense = typeof ALL_LICENSES[number];

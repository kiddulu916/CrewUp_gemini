// Worker Certifications organized by trade
// Data from docs/certifications-organized.md

export const CERTIFICATION_CATEGORIES = {
  'Electrical Trade': [
    'General Electrician',
    'Residential Electrician',
    'Fire/Life Safety Technician',
    'Voice Data Video (VDV) Technician',
    'Non-Residential Lighting Technician',
    'DIR',
  ],
  'Plumbing Trade': [
    'Journey-Level Plumber',
    'Registered Apprentice',
  ],
  'HVAC and Refrigeration Trade': [
    'Universal EPA 608',
    'EPA 608 Type I',
    'EPA 608 Type II',
    'EPA 608 Type III',
    'NATE',
  ],
  'Welding Trade': [
    'AWS',
    'LADBS Certified Welder',
  ],
  'Safety and General Construction': [
    'OSHA 10',
    'OSHA 30',
    'HAZWOPER',
    'HAZWOPER 40',
    'HAZWOPER 24',
    'HAZWOPER 8 Supervisor',
  ],
  'Hazardous Materials': [
    'Lead Supervisor',
    'Lead Worker',
    'Lead Inspector/Assessor',
    'Project Monitor Compliance',
    'Sampling Technician',
    'CAC',
    'CSST',
    'DOSH/Cal-OSHA',
  ],
  'Heavy Equipment and Specialized Operations': [
    'NCCCO',
    'Forklift Operator',
  ],
  'Traffic Control': [
    'Flagger',
    'TCT',
  ],
  'Inspection and Code Compliance': [
    'ICC: B1/B2/B3',
    'ICC: E1/E2',
    'ICC: P1/P2',
    'ICC: M1/M2',
    'ACI',
    'CWI',
    'DSA: Class 1',
    'DSA: Class 2',
    'DSA: Class 3',
    'IOR: Class A',
    'IOR: Class B',
    'IOR: Class C',
    'CESSWI',
  ],
  'Green Building and Energy Efficiency': [
    'LEED Green',
    'LEED AP',
    'LEED AP: BD+C',
    'LEED AP: O+M',
    'LEED AP: ID+C',
    'WELL AP',
    'CEA',
    'HERS Rater',
    'CALGreen Inspector',
    'Title 24',
  ],
  'Construction Management and Professional Administration': [
    'CCM',
    'CAC',
    'CPC',
    'PMP',
    'PMI-CP',
    'CST: Level I',
    'CST: Level II',
    'CST: Level III',
    'CST: Level IV',
  ],
  'Environmental and Civil Infrastructure': [
    'SWRCB: D1',
    'SWRCB: D2',
    'SWRCB: D3',
    'SWRCB: D4',
    'SWRCB: D5',
    'QSD',
    'QSP',
  ],
} as const;

// Flat array of all certifications for dropdowns
export const ALL_CERTIFICATIONS = Object.values(CERTIFICATION_CATEGORIES).flat();

// Type for worker certification
export type WorkerCertification = typeof ALL_CERTIFICATIONS[number];

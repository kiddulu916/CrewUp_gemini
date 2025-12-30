// Worker Certifications organized by Trades
// Data from docs/certifications-organized.md

export const CERTIFICATION_CATEGORIES = {
  'Electrical': [
    'General Electrician',
    'Residential Electrician',
    'Fire/Life Safety Technician',
    'Voice Data Video (VDV) Technician',
    'Non-Residential Lighting Technician',
    'DIR',
  ],
  'Plumbing': [
    'Journey-Level Plumber',
    'Registered Apprentice',
  ],
  'HVAC and Refrigeration': [
    'Universal EPA 608',
    'EPA 608 Type I',
    'EPA 608 Type II',
    'EPA 608 Type III',
    'NATE',
  ],
  'Welding': [
    'AWS',
    'LADBS Certified Welder',
  ],
  'Safety': [
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
  'Heavy Equipment': [
    'NCCCO',
    'Forklift Operator',
  ],
  'Traffic Control': [
    'Flagger',
    'TCT',
  ],
  'Inspection & Compliance': [
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
  'Green Energy & Efficiency': [
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
  'Management & Administration': [
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
  'Environmental & Civil Infra': [
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

// Map trade names to certification categories for filtering
export const TRADE_TO_CERT_CATEGORY: Record<string, string> = {
  'Operating Engineers': 'Heavy Equipment',
  'Demolition Specialists': 'Safety',
  'Craft Laborers': 'Safety',
  'Ironworkers': 'Welding',
  'Concrete Masons & Cement Finishers': 'Inspection & Compliance',
  'Carpenters (Rough)': 'Safety',
  'Masons': 'Inspection & Compliance',
  'Roofers': 'Safety',
  'Glaziers': 'Safety',
  'Insulation Workers': 'Hazardous Materials',
  'Electricians': 'Electrical',
  'Plumbers & Pipefitters': 'Plumbing',
  'HVAC & Sheet Metal Workers': 'HVAC and Refrigeration',
  'Drywall & Lathers': 'Safety',
  'Painters & Wall Coverers': 'Hazardous Materials',
  'Flooring Installers': 'Safety',
  'Finish Carpenters': 'Safety',
  'Millwrights': 'Heavy Equipment',
  'Elevator Constructors': 'Safety',
  'Fence Erectors': 'Safety',
  'Commercial Divers': 'Safety',
  'Green Energy Technicians': 'Green Energy & Efficiency',
  'Administration': 'Management & Administration',
};

// Trade categories and subcategories
export const TRADES = [
  'Carpenter',
  'Electrician',
  'Plumber',
  'HVAC Technician',
  'Welder',
  'Mason',
  'Roofer',
  'Painter',
  'Heavy Equipment Operator',
  'General Laborer',
] as const;

export const TRADE_SUBCATEGORIES: Record<string, readonly string[]> = {
  'Carpenter': [
    'Rough Frame',
    'Stacking',
    'Finish',
    'Drywall',
    'Stairs',
    'Insulation',
    'Cabinetry',
    'Woodworks',
    'Decking',
  ],
  'Electrician': [
    'Residential Wiring',
    'Commercial/Industrial',
    'Low Voltage/Data',
    'Fire Alarm/Security',
    'Solar Installation',
  ],
  'Plumber': [
    'Residential Service',
    'Commercial Construction',
    'Pipefitting',
    'HVAC/Boiler Systems',
    'Drain Cleaning',
  ],
  'HVAC Technician': [
    'Residential AC/Heat Pump',
    'Commercial Refrigeration',
    'Boiler/Hydronic Systems',
    'Duct Installation',
    'Sheet Metal Fabrication',
  ],
  'Welder': [
    'Pipe Welding (TIG/MIG)',
    'Structural Steel',
    'Fabrication (Shop)',
    'Underwater Welding',
    'Flux-Cored Arc Welding (FCAW)',
  ],
  'Mason': [
    'Bricklaying',
    'Blocklaying',
    'Stonework',
    'Tuckpointing/Restoration',
    'Concrete Finishing',
  ],
  'Roofer': [
    'Shingle Installation',
    'Flat Roofing (TPO/EPDM)',
    'Metal Roofing',
    'Repair/Maintenance',
  ],
  'Painter': [
    'Residential Interior',
    'Commercial Exterior',
    'Industrial Coating',
    'Drywall Finishing/Texture',
  ],
  'Heavy Equipment Operator': [
    'Excavator',
    'Bulldozer/Grader',
    'Crane Operator',
    'Forklift/Telehandler',
    'Skid Steer',
  ],
  'General Laborer': [
    'Site Clean-up',
    'Tool/Supply Management',
    'Demolition',
    'Material Handling',
    'Flagging/Spotting',
  ],
} as const;

// User roles
export const ROLES = ['Worker', 'Employer'] as const;

// Employer types
export const EMPLOYER_TYPES = ['contractor', 'recruiter'] as const;

// Subscription levels
export const SUBSCRIPTION_LEVELS = ['Free', 'Pro'] as const;

// Certification types
export const CERTIFICATIONS = [
  'OSHA 10',
  'OSHA 30',
  'First Aid/CPR',
  'Forklift Operator',
  'Journeyman License',
  'Master Plumber',
  'Master Electrician',
  'Welding Certification',
  'EPA 608 Certification',
  'CDL License',
] as const;

// Pricing
export const PRO_MONTHLY = 15;
export const PRO_ANNUAL = 150;

// Job types
export const JOB_TYPES = [
  'Full-Time',
  'Part-Time',
  'Contract',
  '1099',
  'Temporary',
] as const;

// Application statuses
export const APPLICATION_STATUSES = [
  'pending',
  'viewed',
  'contacted',
  'rejected',
  'hired',
] as const;

// Job statuses
export const JOB_STATUSES = [
  'active',
  'filled',
  'expired',
  'draft',
] as const;

// Notification types
export const NOTIFICATION_TYPES = [
  'new_job',
  'message',
  'application_update',
  'profile_view',
] as const;

// Type exports
export type Trade = typeof TRADES[number];
export type Role = typeof ROLES[number];
export type EmployerType = typeof EMPLOYER_TYPES[number];
export type SubscriptionLevel = typeof SUBSCRIPTION_LEVELS[number];
export type Certification = typeof CERTIFICATIONS[number];
export type JobType = typeof JOB_TYPES[number];
export type ApplicationStatus = typeof APPLICATION_STATUSES[number];
export type JobStatus = typeof JOB_STATUSES[number];
export type NotificationType = typeof NOTIFICATION_TYPES[number];

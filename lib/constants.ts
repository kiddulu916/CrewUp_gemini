// Trade categories and subcategories
export const TRADES = [
  'Operating Engineers',
  'Demolition Specialists',
  'Craft Laborers',
  'Ironworkers',
  'Concrete Masons & Cement Finishers',
  'Carpenters (Rough)',
  'Masons',
  'Roofers',
  'Glaziers',
  'Insulation Workers',
  'Electricians',
  'Plumbers & Pipefitters',
  'HVAC & Sheet Metal Workers',
  'Drywall & Lathers',
  'Painters & Wall Coverers',
  'Flooring Installers',
  'Finish Carpenters',
  'Millwrights',
  'Elevator Constructors',
  'Fence Erectors',
  'Commercial Divers',
  'Green Energy Technicians',
  'Administration',
] as const;

export const TRADE_SUBCATEGORIES: Record<string, readonly string[]> = {
  'Operating Engineers': [
    'Excavator Operator',
    'Bulldozer/Scraper Operator',
    'Motor Grader Operator (Blade Hand)',
    'Crane Operator (Mobile/Tower)',
    'Paving Operator',
  ],
  'Demolition Specialists': [
    'Structural Demolitionist',
    'Interior/Soft Strip Specialist',
    'Explosive Demolitionist (Blaster)',
  ],
  'Craft Laborers': [
    'Mason Tender',
    'Pipe Layer',
    'Grade Checker',
    'Traffic Control Technician (Flagger)',
  ],
  'Ironworkers': [
    'Structural Ironworker (Erector)',
    'Reinforcing Ironworker (Rod Buster)',
    'Ornamental Ironworker',
    'Rigger/Machinery Mover',
  ],
  'Concrete Masons & Cement Finishers': [
    'Flatwork Finisher',
    'Architectural/Decorative Finisher',
    'Form Setter',
  ],
  'Carpenters (Rough)': [
    'Wood Framer',
    'Metal Stud Framer',
    'Pile Driver',
    'Bridge Builder',
  ],
  'Masons': [
    'Bricklayer',
    'Stonemason',
    'Refractory Mason',
    'Restoration Mason',
  ],
  'Roofers': [
    'Low-Slope (Commercial) Roofer',
    'Steep-Slope (Residential) Roofer',
    'Waterproofer',
  ],
  'Glaziers': [
    'Curtain Wall Installer',
    'Storefront Glazier',
    'Residential Glazier',
  ],
  'Insulation Workers': [
    'Batt/Roll Installer',
    'Spray Foam Technician',
    'Firestop Containment Worker',
  ],
  'Electricians': [
    'Inside Wireman (Commercial)',
    'Residential Wireman',
    'Outside Lineman (High Voltage)',
    'Low Voltage/Limited Energy Tech (Fire Alarm, Data/Telecom, Security)',
  ],
  'Plumbers & Pipefitters': [
    'Plumber (Sanitary/Potable)',
    'Pipefitter (Industrial/Process)',
    'Steamfitter',
    'Sprinkler Fitter (Fire Suppression)',
  ],
  'HVAC & Sheet Metal Workers': [
    'HVAC Installer',
    'HVAC Service Tech',
    'Architectural Sheet Metal Worker',
    'Duct Fabricator',
  ],
  'Drywall & Lathers': [
    'Drywall Hanger',
    'Taper/Finisher',
    'Lather (Metal/Gypsum)',
    'Plasterer',
  ],
  'Painters & Wall Coverers': [
    'Commercial/Residential Painter',
    'Industrial Coating Specialist',
    'Wall Covering Installer',
  ],
  'Flooring Installers': [
    'Carpet Layer',
    'Resilient/Vinyl Layer',
    'Hardwood Finisher',
    'Terrazzo Worker',
    'Tile Setter',
  ],
  'Finish Carpenters': [
    'Trim Carpenter',
    'Cabinetmaker',
    'Millworker',
  ],
  'Millwrights': [
    'Industrial Mechanic',
    'Turbine Installer',
    'Conveyor Specialist',
  ],
  'Elevator Constructors': [
    'New Installation Mechanic',
    'Service/Repair Mechanic',
    'Modernization Specialist',
  ],
  'Fence Erectors': [
    'Chain Link',
    'Wood/Vinyl',
    'Security/Access Gate Installer',
  ],
  'Commercial Divers': [
    'Underwater Welder',
    'Marine Construction Diver',
    'Salvage Diver',
  ],
  'Green Energy Technicians': [
    'Solar PV Installer',
    'Wind Turbine Technician',
    'Weatherization Tech',
  ],
  'Administration': [
    'Project Management',
    'Quality Control',
    'Material Estimation',
    'Safety Compliance',
    'Blueprint Reading',
  ],
} as const;

// User roles
export const ROLES = ['Worker', 'Employer'] as const;

// Employer types
export const EMPLOYER_TYPES = ['contractor', 'recruiter', 'developer', 'homeowner'] as const;

export type EmployerType = (typeof EMPLOYER_TYPES)[number];

// Allowed employer types for job posting
export const ALLOWED_JOB_POSTING_EMPLOYER_TYPES = ['contractor', 'developer', 'homeowner'] as const;

// Add human-readable labels
export const EMPLOYER_TYPE_LABELS: Record<EmployerType, string> = {
  contractor: 'Contractor',
  recruiter: 'Recruiter',
  developer: 'Developer',
  homeowner: 'Home Owner',
};

// Subscription levels
export const SUBSCRIPTION_LEVELS = ['Free', 'Pro'] as const;

// Import new organized certifications and licenses
export {
  ALL_CERTIFICATIONS,
  CERTIFICATION_CATEGORIES,
  type WorkerCertification
} from './constants/certifications';

export {
  ALL_LICENSES,
  LICENSE_CATEGORIES,
  type ContractorLicense
} from './constants/licenses';

// Backward compatibility - deprecated
/** @deprecated Use ALL_CERTIFICATIONS instead */
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
// EmployerType is defined above with EMPLOYER_TYPE_LABELS
export type SubscriptionLevel = typeof SUBSCRIPTION_LEVELS[number];
export type Certification = typeof CERTIFICATIONS[number];
export type JobType = typeof JOB_TYPES[number];
export type ApplicationStatus = typeof APPLICATION_STATUSES[number];
export type JobStatus = typeof JOB_STATUSES[number];
export type NotificationType = typeof NOTIFICATION_TYPES[number];

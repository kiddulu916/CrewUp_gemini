export type CompatibilityScore = {
  totalScore: number; // 0-100
  breakdown: {
    tradeMatch: number;      // 0-30 points
    certMatch: number;       // 0-30 points
    distanceMatch: number;   // 0-20 points
    experienceMatch: number; // 0-20 points
  };
  gaps: string[]; // Missing certifications
  isPerfectMatch: boolean; // totalScore >= 90
};

export type CompatibilityInput = {
  job: {
    trade: string;
    sub_trade: string | null;
    required_certifications: string[];
    years_experience_required: number | null;
    location: string;
    coords: any; // PostGIS point
  };
  worker: {
    trade: string;
    sub_trade: string | null;
    location: string;
    coords: any; // PostGIS point
  };
  workerCerts: string[]; // certification types worker has
  workerExperience: number; // total years of experience
  distance: number; // in miles (pre-calculated)
};

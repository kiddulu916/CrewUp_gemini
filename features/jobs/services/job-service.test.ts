import { describe, it, expect } from 'vitest';
import {
  validateJobInput,
  validateCoordinates,
  validateCustomQuestions,
  validateEmployerType,
  buildJobRecord,
  buildJobUpdateRecord,
  formatHourlyPayRate,
  formatContractPayRate,
  formatPayRange,
  parseJobFilters,
  areFiltersEmpty,
  countActiveFilters,
  type JobInput,
  type CustomQuestion,
  type JobFilters,
} from './job-service';

// ============================================================================
// Test Data Factories
// ============================================================================

function createValidJobInput(overrides?: Partial<JobInput>): JobInput {
  return {
    title: 'Experienced Electrician Needed',
    trades: ['Electricians'],
    sub_trades: ['Inside Wireman (Commercial)'],
    job_type: 'Full-Time',
    description: 'Looking for an experienced electrician for commercial project.',
    location: 'Austin, TX',
    pay_rate: '$35/hr (weekly)',
    pay_min: 30,
    pay_max: 45,
    required_certs: ['OSHA 10'],
    status: 'active',
    ...overrides,
  };
}

// ============================================================================
// validateJobInput Tests
// ============================================================================

describe('validateJobInput', () => {
  describe('valid input', () => {
    it('should return valid for complete job input', () => {
      const input = createValidJobInput();
      const result = validateJobInput(input);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid with minimal required fields', () => {
      const input: JobInput = {
        title: 'Job Title',
        trades: ['Electricians'],
        job_type: 'Full-Time',
        description: 'This is a job description that is long enough.',
        location: 'Austin, TX',
        pay_rate: '$25/hr',
      };
      const result = validateJobInput(input);
      expect(result.valid).toBe(true);
    });

    it('should return valid with multiple trades', () => {
      const input = createValidJobInput({
        trades: ['Electricians', 'Plumbers & Pipefitters'],
      });
      const result = validateJobInput(input);
      expect(result.valid).toBe(true);
    });
  });

  describe('title validation', () => {
    it('should reject missing title', () => {
      const input = createValidJobInput({ title: '' });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('title');
      expect(result.error).toContain('title');
    });

    it('should reject title that is too short', () => {
      const input = createValidJobInput({ title: 'AB' });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('title');
      expect(result.error).toContain('at least 3 characters');
    });

    it('should reject title that is too long', () => {
      const input = createValidJobInput({ title: 'A'.repeat(101) });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('title');
      expect(result.error).toContain('less than 100');
    });

    it('should accept title at minimum length', () => {
      const input = createValidJobInput({ title: 'ABC' });
      const result = validateJobInput(input);
      expect(result.valid).toBe(true);
    });

    it('should accept title at maximum length', () => {
      const input = createValidJobInput({ title: 'A'.repeat(100) });
      const result = validateJobInput(input);
      expect(result.valid).toBe(true);
    });
  });

  describe('trades validation', () => {
    it('should reject missing trades', () => {
      const input = createValidJobInput({ trades: [] });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('trades');
      expect(result.error).toContain('trade is required');
    });

    it('should reject invalid trade', () => {
      const input = createValidJobInput({ trades: ['Invalid Trade'] });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('trades');
      expect(result.error).toContain('Invalid trade');
    });

    it('should reject when trades is not an array', () => {
      const input = createValidJobInput({ trades: 'Electricians' as unknown as string[] });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('trades');
    });
  });

  describe('job_type validation', () => {
    it('should reject missing job type', () => {
      const input = createValidJobInput({ job_type: '' });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('job_type');
    });

    it('should reject invalid job type', () => {
      const input = createValidJobInput({ job_type: 'Invalid Type' });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('job_type');
      expect(result.error).toContain('Invalid job type');
    });

    it('should accept all valid job types', () => {
      const validTypes = ['Full-Time', 'Part-Time', 'Contract', '1099', 'Temporary'];
      for (const jobType of validTypes) {
        const input = createValidJobInput({ job_type: jobType });
        const result = validateJobInput(input);
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('description validation', () => {
    it('should reject missing description', () => {
      const input = createValidJobInput({ description: '' });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('description');
    });

    it('should reject description that is too short', () => {
      const input = createValidJobInput({ description: 'Short' });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('description');
      expect(result.error).toContain('at least 10 characters');
    });

    it('should reject description that is too long', () => {
      const input = createValidJobInput({ description: 'A'.repeat(5001) });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('description');
      expect(result.error).toContain('less than 5000');
    });
  });

  describe('location validation', () => {
    it('should reject missing location', () => {
      const input = createValidJobInput({ location: '' });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('location');
    });

    it('should reject location that is too short', () => {
      const input = createValidJobInput({ location: 'A' });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('location');
    });
  });

  describe('pay_rate validation', () => {
    it('should reject missing pay rate', () => {
      const input = createValidJobInput({ pay_rate: '' });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('pay_rate');
    });
  });

  describe('coordinates validation integration', () => {
    it('should accept valid coordinates', () => {
      const input = createValidJobInput({
        coords: { lat: 30.2672, lng: -97.7431 },
      });
      const result = validateJobInput(input);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      const input = createValidJobInput({
        coords: { lat: 100, lng: -97.7431 },
      });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('coords');
    });
  });

  describe('custom questions validation integration', () => {
    it('should accept valid custom questions', () => {
      const input = createValidJobInput({
        custom_questions: [
          { question: 'Do you have experience with commercial wiring?', required: true },
        ],
      });
      const result = validateJobInput(input);
      expect(result.valid).toBe(true);
    });

    it('should reject too many custom questions', () => {
      const input = createValidJobInput({
        custom_questions: Array(6).fill({ question: 'Test question here?', required: false }),
      });
      const result = validateJobInput(input);
      expect(result.valid).toBe(false);
      expect(result.field).toBe('custom_questions');
    });
  });
});

// ============================================================================
// validateCoordinates Tests
// ============================================================================

describe('validateCoordinates', () => {
  it('should return valid for null coords (optional)', () => {
    const result = validateCoordinates(null);
    expect(result.valid).toBe(true);
  });

  it('should return valid for undefined coords (optional)', () => {
    const result = validateCoordinates(undefined);
    expect(result.valid).toBe(true);
  });

  it('should return valid for valid coordinates', () => {
    const result = validateCoordinates({ lat: 30.2672, lng: -97.7431 });
    expect(result.valid).toBe(true);
  });

  it('should reject latitude out of range (too high)', () => {
    const result = validateCoordinates({ lat: 91, lng: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Latitude');
  });

  it('should reject latitude out of range (too low)', () => {
    const result = validateCoordinates({ lat: -91, lng: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Latitude');
  });

  it('should reject longitude out of range (too high)', () => {
    const result = validateCoordinates({ lat: 0, lng: 181 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Longitude');
  });

  it('should reject longitude out of range (too low)', () => {
    const result = validateCoordinates({ lat: 0, lng: -181 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Longitude');
  });

  it('should accept boundary values', () => {
    expect(validateCoordinates({ lat: 90, lng: 180 }).valid).toBe(true);
    expect(validateCoordinates({ lat: -90, lng: -180 }).valid).toBe(true);
    expect(validateCoordinates({ lat: 0, lng: 0 }).valid).toBe(true);
  });

  it('should reject NaN values', () => {
    const result = validateCoordinates({ lat: NaN, lng: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('NaN');
  });

  it('should reject non-number types', () => {
    const result = validateCoordinates({ lat: '30' as unknown as number, lng: -97 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('numbers');
  });
});

// ============================================================================
// validateCustomQuestions Tests
// ============================================================================

describe('validateCustomQuestions', () => {
  it('should return valid for empty array', () => {
    const result = validateCustomQuestions([]);
    expect(result.valid).toBe(true);
  });

  it('should return valid for valid questions', () => {
    const questions: CustomQuestion[] = [
      { question: 'Do you have experience?', required: true },
      { question: 'Are you available weekends?', required: false },
    ];
    const result = validateCustomQuestions(questions);
    expect(result.valid).toBe(true);
  });

  it('should reject more than 5 questions', () => {
    const questions = Array(6).fill({ question: 'Test question here?', required: false });
    const result = validateCustomQuestions(questions);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Maximum 5');
  });

  it('should accept exactly 5 questions', () => {
    const questions = Array(5).fill(null).map((_, i) => ({
      question: `Test question number ${i + 1}?`,
      required: false,
    }));
    const result = validateCustomQuestions(questions);
    expect(result.valid).toBe(true);
  });

  it('should reject question with empty text', () => {
    const questions: CustomQuestion[] = [{ question: '', required: true }];
    const result = validateCustomQuestions(questions);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('text is required');
  });

  it('should reject question that is too short', () => {
    const questions: CustomQuestion[] = [{ question: 'Hi?', required: true }];
    const result = validateCustomQuestions(questions);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 5 characters');
  });

  it('should reject question that is too long', () => {
    const questions: CustomQuestion[] = [{ question: 'A'.repeat(501), required: true }];
    const result = validateCustomQuestions(questions);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('less than 500');
  });

  it('should reject non-boolean required flag', () => {
    const questions = [{ question: 'Valid question text?', required: 'yes' as unknown as boolean }];
    const result = validateCustomQuestions(questions);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('boolean');
  });

  it('should reject non-array input', () => {
    const result = validateCustomQuestions('not an array' as unknown as CustomQuestion[]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('array');
  });
});

// ============================================================================
// validateEmployerType Tests
// ============================================================================

describe('validateEmployerType', () => {
  it('should return valid for contractor', () => {
    const result = validateEmployerType('contractor');
    expect(result.valid).toBe(true);
  });

  it('should return valid for developer', () => {
    const result = validateEmployerType('developer');
    expect(result.valid).toBe(true);
  });

  it('should return valid for homeowner', () => {
    const result = validateEmployerType('homeowner');
    expect(result.valid).toBe(true);
  });

  it('should reject recruiter (not allowed to post jobs)', () => {
    const result = validateEmployerType('recruiter');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('contractors and developers');
  });

  it('should reject null employer type', () => {
    const result = validateEmployerType(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should reject undefined employer type', () => {
    const result = validateEmployerType(undefined);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid employer type', () => {
    const result = validateEmployerType('invalid');
    expect(result.valid).toBe(false);
  });
});

// ============================================================================
// buildJobRecord Tests
// ============================================================================

describe('buildJobRecord', () => {
  it('should build complete job record from valid input', () => {
    const input = createValidJobInput();
    const record = buildJobRecord(input, 'user-123');

    expect(record.employer_id).toBe('user-123');
    expect(record.title).toBe('Experienced Electrician Needed');
    expect(record.description).toBe(input.description);
    expect(record.location).toBe('Austin, TX');
    expect(record.trades).toEqual(['Electricians']);
    expect(record.sub_trades).toEqual(['Inside Wireman (Commercial)']);
    expect(record.job_type).toBe('Full-Time');
    expect(record.pay_rate).toBe('$35/hr (weekly)');
    expect(record.pay_min).toBe(30);
    expect(record.pay_max).toBe(45);
    expect(record.required_certs).toEqual(['OSHA 10']);
    expect(record.status).toBe('active');
  });

  it('should trim whitespace from string fields', () => {
    const input = createValidJobInput({
      title: '  Electrician  ',
      description: '  This is a description.  ',
      location: '  Austin, TX  ',
    });
    const record = buildJobRecord(input, 'user-123');

    expect(record.title).toBe('Electrician');
    expect(record.description).toBe('This is a description.');
    expect(record.location).toBe('Austin, TX');
  });

  it('should default optional arrays to empty arrays', () => {
    const input: JobInput = {
      title: 'Job Title',
      trades: ['Electricians'],
      job_type: 'Full-Time',
      description: 'This is a description.',
      location: 'Austin, TX',
      pay_rate: '$25/hr',
    };
    const record = buildJobRecord(input, 'user-123');

    expect(record.sub_trades).toEqual([]);
    expect(record.required_certs).toEqual([]);
  });

  it('should default optional numbers to null', () => {
    const input: JobInput = {
      title: 'Job Title',
      trades: ['Electricians'],
      job_type: 'Full-Time',
      description: 'This is a description.',
      location: 'Austin, TX',
      pay_rate: '$25/hr',
    };
    const record = buildJobRecord(input, 'user-123');

    expect(record.pay_min).toBeNull();
    expect(record.pay_max).toBeNull();
  });

  it('should default status to active', () => {
    const input = createValidJobInput({ status: undefined });
    const record = buildJobRecord(input, 'user-123');

    expect(record.status).toBe('active');
  });

  it('should include custom questions when provided', () => {
    const input = createValidJobInput({
      custom_questions: [{ question: 'Test question?', required: true }],
    });
    const record = buildJobRecord(input, 'user-123');

    expect(record.custom_questions).toEqual([{ question: 'Test question?', required: true }]);
  });
});

// ============================================================================
// buildJobUpdateRecord Tests
// ============================================================================

describe('buildJobUpdateRecord', () => {
  it('should only include provided fields', () => {
    const record = buildJobUpdateRecord({ title: 'New Title' });

    expect(record.title).toBe('New Title');
    expect(record.description).toBeUndefined();
    expect(record.location).toBeUndefined();
  });

  it('should trim string fields', () => {
    const record = buildJobUpdateRecord({
      title: '  Updated Title  ',
      description: '  Updated description  ',
    });

    expect(record.title).toBe('Updated Title');
    expect(record.description).toBe('Updated description');
  });

  it('should return empty object for empty input', () => {
    const record = buildJobUpdateRecord({});
    expect(Object.keys(record)).toHaveLength(0);
  });

  it('should include all provided fields', () => {
    const record = buildJobUpdateRecord({
      title: 'New Title',
      description: 'New description',
      location: 'New Location',
      trades: ['Plumbers & Pipefitters'],
      job_type: 'Contract',
      pay_rate: '$50/hr',
      status: 'filled',
    });

    expect(record.title).toBe('New Title');
    expect(record.description).toBe('New description');
    expect(record.location).toBe('New Location');
    expect(record.trades).toEqual(['Plumbers & Pipefitters']);
    expect(record.job_type).toBe('Contract');
    expect(record.pay_rate).toBe('$50/hr');
    expect(record.status).toBe('filled');
  });
});

// ============================================================================
// Pay Rate Formatting Tests
// ============================================================================

describe('formatHourlyPayRate', () => {
  it('should format weekly pay rate', () => {
    const result = formatHourlyPayRate(35, 'weekly');
    expect(result).toBe('$35.00/hr (weekly)');
  });

  it('should format bi-weekly pay rate', () => {
    const result = formatHourlyPayRate(40, 'bi-weekly');
    expect(result).toBe('$40.00/hr (bi-weekly)');
  });

  it('should format monthly pay rate', () => {
    const result = formatHourlyPayRate(45.5, 'monthly');
    expect(result).toBe('$45.50/hr (monthly)');
  });

  it('should return empty string for zero rate', () => {
    const result = formatHourlyPayRate(0, 'weekly');
    expect(result).toBe('');
  });

  it('should return empty string for negative rate', () => {
    const result = formatHourlyPayRate(-10, 'weekly');
    expect(result).toBe('');
  });

  it('should return empty string for NaN', () => {
    const result = formatHourlyPayRate(NaN, 'weekly');
    expect(result).toBe('');
  });

  it('should handle decimal precision', () => {
    const result = formatHourlyPayRate(25.999, 'weekly');
    expect(result).toBe('$26.00/hr (weekly)');
  });
});

describe('formatContractPayRate', () => {
  it('should format per contract rate', () => {
    const result = formatContractPayRate(5000, 'per_contract');
    expect(result).toBe('$5,000/contract');
  });

  it('should format per job rate', () => {
    const result = formatContractPayRate(2500, 'per_job');
    expect(result).toBe('$2,500/job');
  });

  it('should return empty string for zero amount', () => {
    const result = formatContractPayRate(0, 'per_contract');
    expect(result).toBe('');
  });

  it('should return empty string for negative amount', () => {
    const result = formatContractPayRate(-1000, 'per_contract');
    expect(result).toBe('');
  });

  it('should handle large amounts', () => {
    const result = formatContractPayRate(150000, 'per_contract');
    expect(result).toBe('$150,000/contract');
  });

  it('should handle decimal amounts', () => {
    const result = formatContractPayRate(1500.5, 'per_job');
    expect(result).toBe('$1,500.5/job');
  });
});

describe('formatPayRange', () => {
  it('should format range with min and max', () => {
    const result = formatPayRange(30, 50);
    expect(result).toBe('$30 - $50');
  });

  it('should format min only', () => {
    const result = formatPayRange(30, undefined);
    expect(result).toBe('$30+');
  });

  it('should format max only', () => {
    const result = formatPayRange(undefined, 50);
    expect(result).toBe('Up to $50');
  });

  it('should return empty string when both undefined', () => {
    const result = formatPayRange(undefined, undefined);
    expect(result).toBe('');
  });

  it('should format large numbers with commas', () => {
    const result = formatPayRange(50000, 100000);
    expect(result).toBe('$50,000 - $100,000');
  });
});

// ============================================================================
// Filter Utilities Tests
// ============================================================================

describe('parseJobFilters', () => {
  it('should return empty object for undefined input', () => {
    const result = parseJobFilters(undefined);
    expect(result).toEqual({});
  });

  it('should return empty object for empty input', () => {
    const result = parseJobFilters({});
    expect(result).toEqual({});
  });

  it('should parse valid filters', () => {
    const filters: JobFilters = {
      trade: 'Electricians',
      jobType: 'Full-Time',
      minPay: 30,
    };
    const result = parseJobFilters(filters);

    expect(result.trade).toBe('Electricians');
    expect(result.jobType).toBe('Full-Time');
    expect(result.minPay).toBe(30);
  });

  it('should trim string values', () => {
    const filters: JobFilters = {
      trade: '  Electricians  ',
      jobType: '  Full-Time  ',
    };
    const result = parseJobFilters(filters);

    expect(result.trade).toBe('Electricians');
    expect(result.jobType).toBe('Full-Time');
  });

  it('should ignore empty string values', () => {
    const filters: JobFilters = {
      trade: '',
      jobType: '   ',
    };
    const result = parseJobFilters(filters);

    expect(result.trade).toBeUndefined();
    expect(result.jobType).toBeUndefined();
  });

  it('should ignore invalid minPay values', () => {
    expect(parseJobFilters({ minPay: 0 }).minPay).toBeUndefined();
    expect(parseJobFilters({ minPay: -10 }).minPay).toBeUndefined();
    expect(parseJobFilters({ minPay: NaN }).minPay).toBeUndefined();
  });

  it('should accept valid minPay', () => {
    const result = parseJobFilters({ minPay: 25 });
    expect(result.minPay).toBe(25);
  });
});

describe('areFiltersEmpty', () => {
  it('should return true for undefined', () => {
    expect(areFiltersEmpty(undefined)).toBe(true);
  });

  it('should return true for empty object', () => {
    expect(areFiltersEmpty({})).toBe(true);
  });

  it('should return false when trade is set', () => {
    expect(areFiltersEmpty({ trade: 'Electricians' })).toBe(false);
  });

  it('should return false when minPay is set', () => {
    expect(areFiltersEmpty({ minPay: 30 })).toBe(false);
  });

  it('should return false when any filter is set', () => {
    expect(areFiltersEmpty({ status: 'active' })).toBe(false);
    expect(areFiltersEmpty({ employerId: 'user-123' })).toBe(false);
    expect(areFiltersEmpty({ subTrade: 'Inside Wireman' })).toBe(false);
  });
});

describe('countActiveFilters', () => {
  it('should return 0 for undefined', () => {
    expect(countActiveFilters(undefined)).toBe(0);
  });

  it('should return 0 for empty object', () => {
    expect(countActiveFilters({})).toBe(0);
  });

  it('should count single filter', () => {
    expect(countActiveFilters({ trade: 'Electricians' })).toBe(1);
  });

  it('should count multiple filters', () => {
    const filters: JobFilters = {
      trade: 'Electricians',
      jobType: 'Full-Time',
      minPay: 30,
    };
    expect(countActiveFilters(filters)).toBe(3);
  });

  it('should count all filters when all set', () => {
    const filters: JobFilters = {
      trade: 'Electricians',
      subTrade: 'Inside Wireman',
      jobType: 'Full-Time',
      status: 'active',
      employerId: 'user-123',
      minPay: 30,
    };
    expect(countActiveFilters(filters)).toBe(6);
  });
});

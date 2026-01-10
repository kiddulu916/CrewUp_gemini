import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor, act, renderHook } from '@testing-library/react';
import { renderHookWithQuery } from '@/tests/hooks-setup';

// Mock server actions
vi.mock('../actions/draft-actions', () => ({
  loadDraft: vi.fn(),
  saveDraft: vi.fn(),
}));

vi.mock('../actions/profile-data-actions', () => ({
  loadProfileDataForApplication: vi.fn(),
}));

// Mock toast provider
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

vi.mock('@/components/providers/toast-provider', () => ({
  useToast: () => mockToast,
}));

import { useApplicationWizard } from './use-application-wizard';
import { loadDraft, saveDraft } from '../actions/draft-actions';
import { loadProfileDataForApplication } from '../actions/profile-data-actions';

const mockLoadDraft = loadDraft as ReturnType<typeof vi.fn>;
const mockSaveDraft = saveDraft as ReturnType<typeof vi.fn>;
const mockLoadProfileData = loadProfileDataForApplication as ReturnType<typeof vi.fn>;

describe('useApplicationWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Default mocks
    mockLoadProfileData.mockResolvedValue({
      success: false,
      data: null,
    });
    mockLoadDraft.mockResolvedValue({
      success: false,
      draft: null,
    });
    mockSaveDraft.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should return loading state initially', () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentStep).toBe(1);
    });

    it('should set isLoading to false after loading completes', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should start at step 1', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should use default total steps of 8', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Can navigate up to step 8
      for (let i = 1; i < 8; i++) {
        await act(async () => {
          await result.current.nextStep();
        });
      }

      expect(result.current.currentStep).toBe(8);

      // Can't go beyond total steps
      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(8);
    });

    it('should accept custom total steps', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123', 5));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Navigate to max step
      for (let i = 1; i < 5; i++) {
        await act(async () => {
          await result.current.nextStep();
        });
      }

      expect(result.current.currentStep).toBe(5);

      // Can't exceed custom total
      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(5);
    });
  });

  describe('step navigation', () => {
    it('should advance to next step with nextStep()', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentStep).toBe(1);

      await act(async () => {
        await result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(2);
    });

    it('should go back to previous step with prevStep()', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Go to step 3
      await act(async () => {
        await result.current.nextStep();
        await result.current.nextStep();
      });

      expect(result.current.currentStep).toBe(3);

      // Go back to step 2
      await act(async () => {
        await result.current.prevStep();
      });

      expect(result.current.currentStep).toBe(2);
    });

    it('should not go below step 1 with prevStep()', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentStep).toBe(1);

      await act(async () => {
        await result.current.prevStep();
      });

      expect(result.current.currentStep).toBe(1);
    });

    it('should jump to specific step with goToStep()', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.goToStep(5);
      });

      expect(result.current.currentStep).toBe(5);
    });

    it('should not jump to invalid step numbers', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try to go to step 0
      act(() => {
        result.current.goToStep(0);
      });
      expect(result.current.currentStep).toBe(1);

      // Try to go to step beyond total
      act(() => {
        result.current.goToStep(10);
      });
      expect(result.current.currentStep).toBe(1);

      // Try negative step
      act(() => {
        result.current.goToStep(-1);
      });
      expect(result.current.currentStep).toBe(1);
    });
  });

  describe('draft loading', () => {
    it('should load existing draft on mount', async () => {
      const mockDraft = {
        form_data: {
          fullName: 'John Doe',
          phoneNumber: '555-1234',
        },
        resume_url: 'https://example.com/resume.pdf',
        cover_letter_url: 'https://example.com/cover.pdf',
        resume_extracted_text: 'Extracted resume text',
        last_saved_at: new Date().toISOString(),
      };

      mockLoadDraft.mockResolvedValue({
        success: true,
        draft: mockDraft,
      });

      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLoadDraft).toHaveBeenCalledWith('job-123');
      expect(result.current.resumeUrl).toBe('https://example.com/resume.pdf');
      expect(result.current.coverLetterUrl).toBe('https://example.com/cover.pdf');
      expect(result.current.extractedText).toBe('Extracted resume text');
      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('should load profile data for auto-fill', async () => {
      const mockProfile = {
        profile: {
          first_name: 'Jane',
          last_name: 'Smith',
          phone: '555-5678',
          location: 'Austin, TX',
          authorized_to_work: true,
          has_dl: true,
          dl_class: 'C',
          reliable_transportation: true,
          years_of_experience: 5,
          trade_skills: ['Welding', 'Fabrication'],
        },
        workExperience: [],
        education: [],
        professionalReferences: [],
        certifications: [],
      };

      mockLoadProfileData.mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockLoadProfileData).toHaveBeenCalled();

      // Form should have profile data
      const formValues = result.current.form.getValues();
      expect(formValues.fullName).toBe('Jane Smith');
      expect(formValues.phoneNumber).toBe('555-5678');
    });

    it('should merge profile data with draft (draft takes precedence)', async () => {
      const mockProfile = {
        profile: {
          first_name: 'Jane',
          last_name: 'Smith',
          phone: '555-5678',
          location: 'Austin, TX',
        },
        workExperience: [],
        education: [],
        professionalReferences: [],
        certifications: [],
      };

      const mockDraft = {
        form_data: {
          fullName: 'John Doe', // Different from profile
          phoneNumber: '555-9999', // Different from profile
        },
        last_saved_at: new Date().toISOString(),
      };

      mockLoadProfileData.mockResolvedValue({
        success: true,
        data: mockProfile,
      });

      mockLoadDraft.mockResolvedValue({
        success: true,
        draft: mockDraft,
      });

      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Draft values should override profile values
      const formValues = result.current.form.getValues();
      expect(formValues.fullName).toBe('John Doe');
      expect(formValues.phoneNumber).toBe('555-9999');
    });
  });

  describe('auto-save', () => {
    it('should save draft when navigating with nextStep', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.nextStep();
      });

      expect(mockSaveDraft).toHaveBeenCalled();
    });

    it('should save draft when navigating with prevStep', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Go forward first
      await act(async () => {
        await result.current.nextStep();
      });

      mockSaveDraft.mockClear();

      // Then go back
      await act(async () => {
        await result.current.prevStep();
      });

      expect(mockSaveDraft).toHaveBeenCalled();
    });

    it('should set isSaving during save operations', async () => {
      let resolvePromise: () => void;
      mockSaveDraft.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = () => resolve({ success: true });
          })
      );

      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSaving).toBe(false);

      const savePromise = act(async () => {
        result.current.handleAutoSave();
      });

      await waitFor(() => {
        expect(result.current.isSaving).toBe(true);
      });

      resolvePromise!();
      await savePromise;

      await waitFor(() => {
        expect(result.current.isSaving).toBe(false);
      });
    });

    it('should update lastSaved on successful save', async () => {
      mockSaveDraft.mockResolvedValue({ success: true });

      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lastSaved).toBeNull();

      await act(async () => {
        await result.current.handleAutoSave();
      });

      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('should show error toast on failed save', async () => {
      mockSaveDraft.mockResolvedValue({ success: false, error: 'Save failed' });

      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleAutoSave();
      });

      expect(mockToast.error).toHaveBeenCalledWith('Failed to auto-save draft');
    });
  });

  describe('file URL management', () => {
    it('should allow setting resume URL', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setResumeUrl('https://example.com/new-resume.pdf');
      });

      expect(result.current.resumeUrl).toBe('https://example.com/new-resume.pdf');
    });

    it('should allow setting cover letter URL', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setCoverLetterUrl('https://example.com/new-cover.pdf');
      });

      expect(result.current.coverLetterUrl).toBe('https://example.com/new-cover.pdf');
    });

    it('should allow setting extracted text', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setExtractedText('This is extracted resume text');
      });

      expect(result.current.extractedText).toBe('This is extracted resume text');
    });

    it('should include file URLs when saving draft', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setResumeUrl('https://example.com/resume.pdf');
        result.current.setCoverLetterUrl('https://example.com/cover.pdf');
        result.current.setExtractedText('Extracted text');
      });

      await act(async () => {
        await result.current.handleAutoSave();
      });

      expect(mockSaveDraft).toHaveBeenCalledWith(
        'job-123',
        expect.any(Object),
        'https://example.com/resume.pdf',
        'https://example.com/cover.pdf',
        'Extracted text'
      );
    });
  });

  describe('form state', () => {
    it('should provide access to form object', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.form).toBeDefined();
      expect(result.current.form.getValues).toBeDefined();
      expect(result.current.form.setValue).toBeDefined();
      expect(result.current.form.reset).toBeDefined();
    });

    it('should have default form values', async () => {
      const { result } = renderHookWithQuery(() => useApplicationWizard('job-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const values = result.current.form.getValues();
      expect(values.coverLetterText).toBe('');
      expect(values.fullName).toBe('');
      expect(values.workHistory).toEqual([]);
      expect(values.education).toEqual([]);
      expect(values.references).toEqual([]);
    });
  });
});

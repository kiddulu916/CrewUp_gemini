'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ApplicationFormData } from '../../types/application.types';
import { uploadResumeToDraft, uploadCoverLetterToDraft } from '../../actions/file-upload-actions';
import { useToast } from '@/components/providers/toast-provider';
import { Button, Textarea } from '@/components/ui';

// SVG Icon Components
const UploadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const FileTextIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const Loader2Icon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const FileCheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

type Props = {
  form: UseFormReturn<Partial<ApplicationFormData>>;
  jobId: string;
  resumeUrl?: string;
  setResumeUrl: (url: string | undefined) => void;
  coverLetterUrl?: string;
  setCoverLetterUrl: (url: string | undefined) => void;
  extractedText?: string;
  setExtractedText: (text: string | undefined) => void;
};

type CoverLetterMode = 'upload' | 'write' | null;

export function Step1Documents({
  form,
  jobId,
  resumeUrl,
  setResumeUrl,
  coverLetterUrl,
  setCoverLetterUrl,
  extractedText,
  setExtractedText,
}: Props) {
  const toast = useToast();
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const coverLetterInputRef = useRef<HTMLInputElement>(null);

  // Upload states
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [isUploadingCoverLetter, setIsUploadingCoverLetter] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string>();
  const [resumeFileSize, setResumeFileSize] = useState<number>();
  const [coverLetterFileName, setCoverLetterFileName] = useState<string>();
  const [coverLetterFileSize, setCoverLetterFileSize] = useState<number>();

  // UI states
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [coverLetterMode, setCoverLetterMode] = useState<CoverLetterMode>(null);
  const [isDraggingResume, setIsDraggingResume] = useState(false);
  const [isDraggingCoverLetter, setIsDraggingCoverLetter] = useState(false);

  // Cover letter text from form
  const coverLetterText = form.watch('coverLetterText');

  /**
   * Format file size in human-readable format
   */
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Handle resume file upload
   */
  async function handleResumeUpload(file: File) {
    setIsUploadingResume(true);
    setResumeFileName(file.name);
    setResumeFileSize(file.size);

    const result = await uploadResumeToDraft(jobId, file);

    if (result.success && result.url) {
      setResumeUrl(result.url);
      if (result.extractedText) {
        setExtractedText(result.extractedText);
        toast.success('Resume uploaded and text extracted successfully');
      } else {
        toast.success('Resume uploaded successfully');
      }
    } else {
      toast.error(result.error || 'Failed to upload resume');
      setResumeFileName(undefined);
      setResumeFileSize(undefined);
    }

    setIsUploadingResume(false);
  }

  /**
   * Handle cover letter file upload
   */
  async function handleCoverLetterUpload(file: File) {
    setIsUploadingCoverLetter(true);
    setCoverLetterFileName(file.name);
    setCoverLetterFileSize(file.size);

    const result = await uploadCoverLetterToDraft(jobId, file);

    if (result.success && result.url) {
      setCoverLetterUrl(result.url);
      // Clear text input if file upload succeeds
      form.setValue('coverLetterText', undefined);
      toast.success('Cover letter uploaded successfully');
    } else {
      toast.error(result.error || 'Failed to upload cover letter');
      setCoverLetterFileName(undefined);
      setCoverLetterFileSize(undefined);
    }

    setIsUploadingCoverLetter(false);
  }

  /**
   * Handle file input change (click to browse)
   */
  function handleResumeChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleResumeUpload(file);
    }
  }

  function handleCoverLetterChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      handleCoverLetterUpload(file);
    }
  }

  /**
   * Handle drag and drop
   */
  function handleResumeDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingResume(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleResumeUpload(file);
    }
  }

  function handleCoverLetterDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDraggingCoverLetter(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleCoverLetterUpload(file);
    }
  }

  /**
   * Remove uploaded files
   */
  function removeResume() {
    setResumeUrl(undefined);
    setResumeFileName(undefined);
    setResumeFileSize(undefined);
    setExtractedText(undefined);
    if (resumeInputRef.current) {
      resumeInputRef.current.value = '';
    }
  }

  function removeCoverLetter() {
    setCoverLetterUrl(undefined);
    setCoverLetterFileName(undefined);
    setCoverLetterFileSize(undefined);
    if (coverLetterInputRef.current) {
      coverLetterInputRef.current.value = '';
    }
  }

  /**
   * Handle cover letter mode switch
   */
  function selectCoverLetterMode(mode: CoverLetterMode) {
    if (mode === 'upload' && coverLetterText) {
      // Warn user about switching modes
      if (!confirm('Switching to upload mode will discard your written cover letter. Continue?')) {
        return;
      }
      form.setValue('coverLetterText', undefined);
    }
    if (mode === 'write' && coverLetterUrl) {
      // Warn user about switching modes
      if (!confirm('Switching to write mode will remove your uploaded file. Continue?')) {
        return;
      }
      removeCoverLetter();
    }
    setCoverLetterMode(mode);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Step 1: Documents</h2>
        <p className="mt-2 text-gray-600">
          Upload your resume and cover letter (optional). We'll extract information to help
          auto-fill the next steps.
        </p>
      </div>

      {/* Resume Upload */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Resume <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
          {resumeUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeResume}
              disabled={isUploadingResume}
            >
              <XIcon className="h-4 w-4 mr-1" />
              Remove
            </Button>
          )}
        </div>

        <p className="text-sm text-gray-500">
          Upload PDF, DOCX, or TXT file (max 5MB). We'll extract text to auto-fill your
          information.
        </p>

        {/* Upload Area */}
        {!resumeUrl && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingResume(true);
            }}
            onDragLeave={() => setIsDraggingResume(false)}
            onDrop={handleResumeDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDraggingResume ? 'border-crewup-blue bg-blue-50' : 'border-gray-300 bg-gray-50'}
              ${isUploadingResume ? 'opacity-50 pointer-events-none' : 'hover:border-crewup-blue hover:bg-blue-50'}
            `}
          >
            {isUploadingResume ? (
              <div className="space-y-3">
                <Loader2Icon className="h-12 w-12 mx-auto text-crewup-blue animate-spin" />
                <p className="text-gray-600">Uploading and extracting text...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <UploadIcon className="h-12 w-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-gray-600 font-medium">
                    Drag and drop your resume here, or
                  </p>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleResumeChange}
                    className="hidden"
                    disabled={isUploadingResume}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => resumeInputRef.current?.click()}
                    className="mt-2"
                  >
                    Browse Files
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Uploaded Resume Display */}
        {resumeUrl && !isUploadingResume && (
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <div className="flex items-start gap-3">
              <FileCheckIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {resumeFileName || 'Resume uploaded'}
                </p>
                {resumeFileSize && (
                  <p className="text-sm text-gray-500">{formatFileSize(resumeFileSize)}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Extracted Text Preview */}
        {extractedText && (
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExtractedText(!showExtractedText)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileTextIcon className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">
                  Extracted Text Preview
                </span>
              </div>
              {showExtractedText ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-600" />
              )}
            </button>
            {showExtractedText && (
              <div className="p-4 bg-white border-t border-gray-200">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                  {extractedText}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cover Letter Section */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Cover Letter <span className="text-gray-500 font-normal">(Optional)</span>
        </label>

        <p className="text-sm text-gray-500">
          Choose to upload a file OR write your cover letter below. Not both.
        </p>

        {/* Mode Selection */}
        {!coverLetterMode && !coverLetterUrl && !coverLetterText && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => selectCoverLetterMode('upload')}
              className="border-2 border-gray-300 rounded-lg p-6 hover:border-crewup-blue hover:bg-blue-50 transition-colors text-center"
            >
              <UploadIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="font-medium text-gray-900">Upload File</p>
              <p className="text-sm text-gray-500 mt-1">PDF, DOCX, or TXT</p>
            </button>
            <button
              type="button"
              onClick={() => selectCoverLetterMode('write')}
              className="border-2 border-gray-300 rounded-lg p-6 hover:border-crewup-blue hover:bg-blue-50 transition-colors text-center"
            >
              <FileTextIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="font-medium text-gray-900">Write Below</p>
              <p className="text-sm text-gray-500 mt-1">Type directly in the form</p>
            </button>
          </div>
        )}

        {/* Upload Mode */}
        {(coverLetterMode === 'upload' || coverLetterUrl) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadIcon className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Upload Mode</span>
              </div>
              <div className="flex gap-2">
                {coverLetterUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeCoverLetter}
                    disabled={isUploadingCoverLetter}
                  >
                    <XIcon className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
                {!coverLetterUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCoverLetterMode(null)}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {!coverLetterUrl && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingCoverLetter(true);
                }}
                onDragLeave={() => setIsDraggingCoverLetter(false)}
                onDrop={handleCoverLetterDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${isDraggingCoverLetter ? 'border-crewup-blue bg-blue-50' : 'border-gray-300 bg-gray-50'}
                  ${isUploadingCoverLetter ? 'opacity-50 pointer-events-none' : 'hover:border-crewup-blue hover:bg-blue-50'}
                `}
              >
                {isUploadingCoverLetter ? (
                  <div className="space-y-3">
                    <Loader2Icon className="h-12 w-12 mx-auto text-crewup-blue animate-spin" />
                    <p className="text-gray-600">Uploading cover letter...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <UploadIcon className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <p className="text-gray-600 font-medium">
                        Drag and drop your cover letter here, or
                      </p>
                      <input
                        ref={coverLetterInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        onChange={handleCoverLetterChange}
                        className="hidden"
                        disabled={isUploadingCoverLetter}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => coverLetterInputRef.current?.click()}
                        className="mt-2"
                      >
                        Browse Files
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {coverLetterUrl && !isUploadingCoverLetter && (
              <div className="border border-gray-300 rounded-lg p-4 bg-white">
                <div className="flex items-start gap-3">
                  <FileCheckIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {coverLetterFileName || 'Cover letter uploaded'}
                    </p>
                    {coverLetterFileSize && (
                      <p className="text-sm text-gray-500">
                        {formatFileSize(coverLetterFileSize)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Write Mode */}
        {(coverLetterMode === 'write' || coverLetterText) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileTextIcon className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Write Mode</span>
              </div>
              {!coverLetterText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCoverLetterMode(null)}
                >
                  Cancel
                </Button>
              )}
            </div>

            <Textarea
              {...form.register('coverLetterText')}
              placeholder="Write your cover letter here..."
              rows={12}
              className="font-normal"
            />

            {coverLetterText && (
              <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <p>
                  Your cover letter will be automatically saved as part of your draft. You can
                  edit it anytime before submission.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Tips for Success</h3>
        <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside">
          <li>Your resume helps auto-fill information in later steps</li>
          <li>Cover letters are optional but can help you stand out</li>
          <li>All documents are securely stored and only visible to the employer</li>
          <li>You can skip this step and come back later if needed</li>
        </ul>
      </div>
    </div>
  );
}

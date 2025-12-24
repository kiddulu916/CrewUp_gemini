'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { extractTextFromFile } from '@/lib/resume-parser/text-extractor';

type UploadResult = {
  success: boolean;
  error?: string;
  url?: string;
  extractedText?: string;
};

/**
 * Upload resume to draft storage bucket
 * Validates file type and size, extracts text content
 * Files stored in: application-drafts/{userId}/{jobId}/resume.{ext}
 */
export async function uploadResumeToDraft(
  jobId: string,
  file: File
): Promise<UploadResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be under 5MB' };
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Please upload PDF, DOCX, or TXT files only' };
    }

    // Extract file extension
    const ext = file.name.split('.').pop() || 'pdf';

    // Upload to application-drafts storage bucket
    const filePath = `${user.id}/${jobId}/resume.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('application-drafts')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to upload file' };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('application-drafts')
      .getPublicUrl(filePath);

    // Extract text from resume
    let extractedText: string | undefined;
    try {
      extractedText = await extractTextFromFile(file);
    } catch (error) {
      console.error('Text extraction error:', error);
      // Non-fatal - file uploaded successfully even if text extraction fails
    }

    return {
      success: true,
      url: publicUrl,
      extractedText,
    };
  } catch (error) {
    console.error('Error in uploadResumeToDraft:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Upload cover letter to draft storage bucket
 * Validates file type and size
 * Files stored in: application-drafts/{userId}/{jobId}/cover-letter.{ext}
 */
export async function uploadCoverLetterToDraft(
  jobId: string,
  file: File
): Promise<UploadResult> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be under 5MB' };
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Please upload PDF, DOCX, or TXT files only' };
    }

    // Extract file extension
    const ext = file.name.split('.').pop() || 'pdf';

    // Upload to application-drafts storage bucket
    const filePath = `${user.id}/${jobId}/cover-letter.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('application-drafts')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to upload file' };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('application-drafts')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error in uploadCoverLetterToDraft:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Move file from draft storage to application storage
 * Called during application submission to move files to permanent storage
 * Files moved to: applications/{applicationId}/{fileName}
 *
 * @param sourcePath - Path in application-drafts bucket (e.g., "userId/jobId/resume.pdf")
 * @param applicationId - UUID of the submitted application
 * @param fileName - Destination filename (e.g., "resume.pdf", "cover-letter.pdf")
 */
export async function moveFileToApplication(
  sourcePath: string,
  applicationId: string,
  fileName: string
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const supabase = await createClient(await cookies());

    // Download from draft storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('application-drafts')
      .download(sourcePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      return { success: false, error: 'Failed to move file' };
    }

    // Upload to applications storage
    const destPath = `${applicationId}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('applications')
      .upload(destPath, fileData, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { success: false, error: 'Failed to move file' };
    }

    // Get public URL from applications bucket
    const { data: { publicUrl } } = supabase.storage
      .from('applications')
      .getPublicUrl(destPath);

    // Delete from draft storage (cleanup)
    await supabase.storage
      .from('application-drafts')
      .remove([sourcePath]);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error('Error in moveFileToApplication:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

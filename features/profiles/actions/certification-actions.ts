'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type CertificationData = {
  credential_category: 'license' | 'certification';
  certification_type: string;
  certification_number?: string;
  issued_by?: string;
  issuing_state?: string;
  issue_date?: string;
  expires_at?: string;
  photo_url?: string;
};

export type CertificationResult = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Add a new certification
 */
export async function addCertification(data: CertificationData): Promise<CertificationResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's profile to determine role and employer_type
  const { data: profile } = await supabase
    .from('users')
    .select('role, employer_type')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { success: false, error: 'Profile not found' };
  }

  // Validate credential_category matches user role
  if (profile.role === 'worker' && data.credential_category !== 'certification') {
    return { success: false, error: 'Workers can only add certifications' };
  }

  if (profile.role === 'employer' && profile.employer_type === 'contractor'
      && data.credential_category !== 'license') {
    return { success: false, error: 'Contractors can only add licenses' };
  }

  if (profile.role === 'employer' && profile.employer_type === 'recruiter') {
    return { success: false, error: 'Recruiters cannot add credentials' };
  }

  // Validate required fields
  if (!data.certification_type || data.certification_type.trim().length === 0) {
    return { success: false, error: 'Certification type is required' };
  }

  // Insert certification with credential_category
  const { data: certification, error: insertError } = await supabase
    .from('certifications')
    .insert({
      user_id: user.id,
      credential_category: data.credential_category,
      certification_type: data.certification_type.trim(),
      certification_number: data.certification_number?.trim() || null,
      issued_by: data.issued_by?.trim() || null,
      issuing_state: data.issuing_state?.trim() || null,
      issue_date: data.issue_date || null,
      expires_at: data.expires_at || null,
      image_url: data.photo_url || null,
      verification_status: 'pending', // Starts as pending verification
    })
    .select()
    .single();

  if (insertError) {
    console.error('Add certification error:', insertError);
    // Provide more detailed error messages
    let errorMessage = 'Failed to add certification';
    if (insertError.code === '23505') {
      errorMessage = 'This certification already exists in your profile';
    } else if (insertError.message) {
      errorMessage = `Failed to add certification: ${insertError.message}`;
    }
    return { success: false, error: errorMessage };
  }

  revalidatePath('/dashboard/profile');

  return { success: true, data: certification };
}

/**
 * Delete a certification
 */
export async function deleteCertification(certificationId: string): Promise<CertificationResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Delete only if owned by user
  const { error } = await supabase
    .from('certifications')
    .delete()
    .eq('id', certificationId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Delete certification error:', error);
    return { success: false, error: 'Failed to delete certification' };
  }

  revalidatePath('/dashboard/profile');

  return { success: true };
}

/**
 * Upload certification photo to Supabase Storage
 */
export async function uploadCertificationPhoto(file: File): Promise<CertificationResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Only images (JPEG, PNG, WebP) and PDF files are allowed' };
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return { success: false, error: 'File size must be less than 5MB' };
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('certification-photos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload certification photo error:', error);
    // Provide more detailed error messages
    let errorMessage = 'Failed to upload photo';
    if (error.message.includes('bucket')) {
      errorMessage = 'Upload storage not configured. Please contact support.';
    } else if (error.message) {
      errorMessage = `Failed to upload photo: ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('certification-photos')
    .getPublicUrl(fileName);

  return { success: true, data: { url: urlData.publicUrl, path: fileName } };
}

/**
 * Get user's certifications
 */
export async function getMyCertifications(): Promise<CertificationResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('certifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get certifications error:', error);
    return { success: false, error: 'Failed to get certifications' };
  }

  return { success: true, data };
}

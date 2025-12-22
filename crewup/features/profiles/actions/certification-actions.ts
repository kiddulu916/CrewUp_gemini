'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type CertificationData = {
  certification_type: string;
  certification_number?: string;
  issued_by?: string;
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
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate required fields
  if (!data.certification_type || data.certification_type.trim().length === 0) {
    return { success: false, error: 'Certification type is required' };
  }

  // Insert certification
  const { data: certification, error: insertError } = await supabase
    .from('certifications')
    .insert({
      user_id: user.id,
      certification_type: data.certification_type.trim(),
      certification_number: data.certification_number?.trim() || null,
      issued_by: data.issued_by?.trim() || null,
      issue_date: data.issue_date || null,
      expires_at: data.expires_at || null,
      photo_url: data.photo_url || null,
      is_verified: false, // Starts as unverified
    })
    .select()
    .single();

  if (insertError) {
    console.error('Add certification error:', insertError);
    return { success: false, error: 'Failed to add certification' };
  }

  revalidatePath('/dashboard/profile');

  return { success: true, data: certification };
}

/**
 * Delete a certification
 */
export async function deleteCertification(certificationId: string): Promise<CertificationResult> {
  const supabase = await createClient();

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
  const supabase = await createClient();

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
    return { success: false, error: 'Failed to upload photo' };
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
  const supabase = await createClient();

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

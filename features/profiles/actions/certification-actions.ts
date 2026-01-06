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

  try {
    // Insert credential into appropriate table
    if (data.credential_category === 'certification') {
    const { data: certification, error: insertError } = await supabase
      .from('certifications')
      .insert({
        worker_id: user.id,
        name: data.certification_type.trim(),
        issuing_organization: data.issued_by?.trim() || 'Unknown',
        credential_id: data.certification_number?.trim() || null,
        issue_date: data.issue_date || null,
        expiration_date: data.expires_at || null,
        image_url: data.photo_url || null,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return { success: true, data: certification };
  } else {
    const { data: license, error: insertError } = await supabase
      .from('licenses')
      .insert({
        contractor_id: user.id,
        license_number: data.certification_number?.trim() || 'Pending',
        classification: data.certification_type.trim(),
        issuing_state: data.issuing_state?.trim() || null,
        issue_date: data.issue_date || null,
        expiration_date: data.expires_at || null,
        image_url: data.photo_url || null,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;
    return { success: true, data: license };
  }
} catch (error: any) {
  console.error('Add credential error:', error);
  let errorMessage = 'Failed to add credential';
  if (error.code === '23505') {
    errorMessage = 'This credential already exists in your profile';
  } else if (error.message) {
    errorMessage = `Failed to add credential: ${error.message}`;
  }
  return { success: false, error: errorMessage };
}
}

/**
 * Delete a certification or license
 */
export async function deleteCertification(
  certificationId: string,
  category: 'certification' | 'license'
): Promise<CertificationResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Delete from appropriate table
  const table = category === 'certification' ? 'certifications' : 'licenses';
  const idField = category === 'certification' ? 'worker_id' : 'contractor_id';

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', certificationId)
    .eq(idField, user.id);

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
 * Get user's certifications and licenses
 */
export async function getMyCertifications(): Promise<CertificationResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Fetch both certifications and licenses
  const [certsResponse, licensesResponse] = await Promise.all([
    supabase
      .from('certifications')
      .select('*')
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('licenses')
      .select('*')
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false })
  ]);

  if (certsResponse.error) {
    console.error('Get certifications error:', certsResponse.error);
    return { success: false, error: 'Failed to get certifications' };
  }

  if (licensesResponse.error) {
    console.error('Get licenses error:', licensesResponse.error);
    return { success: false, error: 'Failed to get licenses' };
  }

  // Map to a common format if needed, or just return both
  const certs = (certsResponse.data || []).map(c => ({
    ...c,
    credential_category: 'certification' as const,
    certification_type: c.name,
    certification_number: c.credential_id,
    issued_by: c.issuing_organization,
    expires_at: c.expiration_date,
  }));

  const licenses = (licensesResponse.data || []).map(l => ({
    ...l,
    credential_category: 'license' as const,
    certification_type: l.classification,
    certification_number: l.license_number,
    expires_at: l.expiration_date,
  }));

  return { success: true, data: [...certs, ...licenses] };
}

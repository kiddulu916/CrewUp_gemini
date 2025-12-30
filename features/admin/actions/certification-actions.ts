'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function approveCertification(certificationId: string) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized' };
  }

  // Get certification details before updating
  const { data: cert } = await supabase
    .from('certifications')
    .select('user_id, credential_category')
    .eq('id', certificationId)
    .single();

  if (!cert) {
    return { success: false, error: 'Certification not found' };
  }

  // Update certification
  const { error: updateError } = await supabase
    .from('certifications')
    .update({
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    })
    .eq('id', certificationId);

  if (updateError) {
    console.error('Error approving certification:', updateError);
    return { success: false, error: 'Failed to approve certification' };
  }

  // If it's a contractor license, enable job posting
  if (cert.credential_category === 'license') {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ can_post_jobs: true })
      .eq('id', cert.user_id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't fail the whole operation, just log it
    }
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'verified_cert',
    target_type: 'certification',
    target_id: certificationId,
    details: {
      credential_category: cert.credential_category,
      enabled_job_posting: cert.credential_category === 'license',
    },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
    // Don't fail the whole operation, just log it
  }

  revalidatePath('/admin/certifications');
  return { success: true };
}

export async function rejectCertification(
  certificationId: string,
  reason: string
) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized' };
  }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'Rejection reason is required' };
  }

  // Update certification
  const { error: updateError } = await supabase
    .from('certifications')
    .update({
      verification_status: 'rejected',
      verified_at: new Date().toISOString(),
      verified_by: user.id,
      rejection_reason: reason,
    })
    .eq('id', certificationId);

  if (updateError) {
    console.error('Error rejecting certification:', updateError);
    return { success: false, error: 'Failed to reject certification' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'rejected_cert',
    target_type: 'certification',
    target_id: certificationId,
    details: { reason },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
    // Don't fail the whole operation, just log it
  }

  revalidatePath('/admin/certifications');
  return { success: true };
}

export async function flagCertification(
  certificationId: string,
  notes: string
) {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify admin status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return { success: false, error: 'Not authorized' };
  }

  // Update certification with notes (we'll use verification_notes for flagging)
  const { error: updateError } = await supabase
    .from('certifications')
    .update({
      verification_notes: notes,
    })
    .eq('id', certificationId);

  if (updateError) {
    console.error('Error flagging certification:', updateError);
    return { success: false, error: 'Failed to flag certification' };
  }

  // Log activity
  const { error: logError } = await supabase.from('admin_activity_log').insert({
    admin_id: user.id,
    action: 'flagged_cert',
    target_type: 'certification',
    target_id: certificationId,
    details: { notes },
  });

  if (logError) {
    console.error('Error logging activity:', logError);
  }

  revalidatePath('/admin/certifications');
  return { success: true };
}

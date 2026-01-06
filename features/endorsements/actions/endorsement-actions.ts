// features/endorsements/actions/endorsement-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/email/client';
import {
  endorsementRequestEmailHtml,
  endorsementRequestEmailText,
} from '@/lib/email/templates/endorsement-request';

export type EndorsementRequest = {
  id: string;
  experience_id: string;
  worker_id: string;
  employer_id: string;
  status: 'pending' | 'approved' | 'declined';
  request_sent_at: string;
  responded_at: string | null;
  created_at: string;
};

export type Endorsement = {
  id: string;
  experience_id: string;
  endorsed_by_user_id: string;
  endorsed_by_name: string;
  endorsed_by_company: string | null;
  recommendation_text: string | null;
  verified_dates_worked: boolean;
  created_at: string;
};

/**
 * Request an endorsement for a work experience (Pro worker feature)
 */
export async function requestEndorsement(
  experienceId: string,
  employerEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user is Pro worker
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_status, role, first_name, last_name, email')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: 'Profile not found' };
    }

    const fullName = `${profile.first_name} ${profile.last_name}`.trim();

    if (profile.subscription_status !== 'pro') {
      return { success: false, error: 'Pro subscription required' };
    }

    if (profile.role !== 'worker') {
      return { success: false, error: 'Only workers can request endorsements' };
    }

    // Get experience details
    const { data: experience } = await supabase
      .from('experiences')
      .select('id, user_id, title, company, start_date, end_date')
      .eq('id', experienceId)
      .eq('user_id', user.id)
      .single();

    if (!experience) {
      return { success: false, error: 'Experience not found' };
    }

    // Find employer by email
    const { data: employer } = await supabase
      .from('users')
      .select('id, first_name, last_name, role')
      .eq('email', employerEmail.toLowerCase())
      .eq('role', 'employer')
      .single();

    if (!employer) {
      return {
        success: false,
        error: 'Employer not found. They must have a KrewUp account.',
      };
    }

    // Check if request already exists
    const { data: existing } = await supabase
      .from('endorsement_requests')
      .select('id, status')
      .eq('experience_id', experienceId)
      .eq('employer_id', employer.id)
      .single();

    if (existing) {
      if (existing.status === 'pending') {
        return { success: false, error: 'Request already sent and pending' };
      }
      if (existing.status === 'approved') {
        return { success: false, error: 'This employer already endorsed this experience' };
      }
    }

    // Create endorsement request
    const { data: request, error: createError } = await supabase
      .from('endorsement_requests')
      .insert({
        experience_id: experienceId,
        worker_id: user.id,
        employer_id: employer.id,
        status: 'pending',
      })
      .select()
      .single();

    if (createError || !request) {
      console.error('Error creating endorsement request:', createError);
      return { success: false, error: 'Failed to create request' };
    }

    // Send email to employer
    const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/endorsements/${request.id}`;

    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const emailResult = await sendEmail({
      to: employerEmail,
      subject: `${fullName} requests work history endorsement`,
      html: endorsementRequestEmailHtml({
        workerName: fullName,
        position: experience.title,
        companyName: experience.company,
        startDate: formatDate(experience.start_date),
        endDate: experience.end_date ? formatDate(experience.end_date) : null,
        approveUrl,
      }),
      text: endorsementRequestEmailText({
        workerName: fullName,
        position: experience.title,
        companyName: experience.company,
        startDate: formatDate(experience.start_date),
        endDate: experience.end_date ? formatDate(experience.end_date) : null,
        approveUrl,
      }),
    });

    // Don't fail if email fails, just log it
    if (!emailResult.success) {
      console.error('Failed to send endorsement email:', emailResult.error);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in requestEndorsement:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Approve an endorsement request and create endorsement
 */
export async function approveEndorsement(
  requestId: string,
  recommendationText: string = '',
  verifiedDates: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get endorsement request
    const { data: request } = await supabase
      .from('endorsement_requests')
      .select('*, experience:experiences(id, user_id)')
      .eq('id', requestId)
      .eq('employer_id', user.id)
      .single();

    if (!request) {
      return { success: false, error: 'Request not found or unauthorized' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: 'Request already processed' };
    }

    // Get employer profile
    const { data: employer } = await supabase
      .from('users')
      .select('first_name, last_name, employer_type')
      .eq('id', user.id)
      .single();

    if (!employer) {
      return { success: false, error: 'Employer profile not found' };
    }

    const employerName = `${employer.first_name} ${employer.last_name}`.trim();

    // Validate recommendation text length
    const trimmedRecommendation = recommendationText.trim();
    if (trimmedRecommendation.length > 200) {
      return { success: false, error: 'Recommendation must be 200 characters or less' };
    }

    // Create endorsement
    const { error: endorsementError } = await supabase
      .from('endorsements')
      .insert({
        experience_id: request.experience_id,
        endorsed_by_user_id: user.id,
        endorsed_by_name: employerName,
        endorsed_by_company: employer.employer_type,
        recommendation_text: trimmedRecommendation || null,
        verified_dates_worked: verifiedDates,
      });

    if (endorsementError) {
      console.error('Error creating endorsement:', endorsementError);
      return { success: false, error: 'Failed to create endorsement' };
    }

    // Update request status
    const { error: updateError } = await supabase
      .from('endorsement_requests')
      .update({
        status: 'approved',
        responded_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in approveEndorsement:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

/**
 * Get endorsements for an experience
 */
export async function getExperienceEndorsements(
  experienceId: string
): Promise<{ success: boolean; endorsements?: Endorsement[]; error?: string }> {
  try {
    const supabase = await createClient(await cookies());

    const { data: endorsements, error } = await supabase
      .from('endorsements')
      .select('*')
      .eq('experience_id', experienceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching endorsements:', error);
      return { success: false, error: 'Failed to fetch endorsements' };
    }

    return { success: true, endorsements: endorsements || [] };
  } catch (error) {
    console.error('Error in getExperienceEndorsements:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

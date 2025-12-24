/**
 * Common Supabase query helpers
 *
 * This file contains reusable query functions for common database operations.
 * These functions provide type-safe, consistent ways to interact with the database.
 *
 * Usage:
 * - Import the function you need
 * - Pass in the Supabase client (server or client depending on context)
 * - Handle the response
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get the current authenticated user's profile
 */
export async function getCurrentUserProfile(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  return supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
}

/**
 * Check if user has Pro subscription
 */
export async function hasProSubscription(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single();

  return data?.subscription_status === 'pro';
}

/**
 * Get jobs with proximity filtering
 *
 * @param coords - User's coordinates [longitude, latitude]
 * @param radiusKm - Search radius in kilometers
 */
export async function getJobsNearby(
  supabase: SupabaseClient,
  coords: [number, number],
  radiusKm: number = 25,
  trade?: string
) {
  let query = supabase.rpc('get_nearby_jobs', {
    user_lng: coords[0],
    user_lat: coords[1],
    radius_km: radiusKm,
  });

  if (trade) {
    query = query.eq('trade', trade);
  }

  return query;
}

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(
  supabase: SupabaseClient,
  userId1: string,
  userId2: string
) {
  // Order participants to match database constraint
  const [participant1, participant2] =
    userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  // Try to get existing conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('participant_1_id', participant1)
    .eq('participant_2_id', participant2)
    .single();

  if (existing) {
    return { data: existing, error: null };
  }

  // Create new conversation
  return supabase
    .from('conversations')
    .insert({
      participant_1_id: participant1,
      participant_2_id: participant2,
    })
    .select()
    .single();
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number = 50
) {
  return supabase
    .from('messages')
    .select(
      `
      *,
      sender:profiles!sender_id(id, name, profile_image_url)
    `
    )
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  content: string
) {
  return supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })
    .select()
    .single();
}

/**
 * Track a profile view (Pro feature)
 */
export async function trackProfileView(
  supabase: SupabaseClient,
  viewedProfileId: string,
  viewerId: string
) {
  return supabase.from('profile_views').insert({
    viewed_profile_id: viewedProfileId,
    viewer_id: viewerId,
  });
}

/**
 * Track a job view
 */
export async function trackJobView(
  supabase: SupabaseClient,
  jobId: string,
  sessionId: string,
  viewerId?: string
) {
  return supabase.from('job_views').insert({
    job_id: jobId,
    session_id: sessionId,
    viewer_id: viewerId,
  });
}

/**
 * Get job applications for an employer
 */
export async function getJobApplications(
  supabase: SupabaseClient,
  jobId: string
) {
  return supabase
    .from('job_applications')
    .select(
      `
      *,
      worker:profiles!worker_id(
        id,
        name,
        trade,
        sub_trade,
        location,
        bio,
        profile_image_url
      ),
      certifications:certifications(
        certification_type,
        is_verified
      ),
      work_experience:work_experience(
        job_title,
        company_name,
        start_date,
        end_date
      )
    `
    )
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  supabase: SupabaseClient,
  applicationId: string,
  status: 'pending' | 'viewed' | 'contacted' | 'rejected' | 'hired'
) {
  return supabase
    .from('job_applications')
    .update({ status })
    .eq('id', applicationId)
    .select()
    .single();
}

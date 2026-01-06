import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const testDb = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'worker' | 'employer';
  name: string;
  employerType?: 'contractor' | 'recruiter';
  companyName?: string;
}

/**
 * Create a test user with profile
 *
 * IMPORTANT: Uses proper PostGIS RPC function for coords to avoid database errors
 */
export async function createTestUser(data: {
  email?: string;
  password?: string;
  role: 'worker' | 'employer';
  name?: string;
  trade?: string;
  location?: string;
  employerType?: 'contractor' | 'recruiter';
  companyName?: string;
  coords?: { lat: number; lng: number };
  isAdmin?: boolean;
}): Promise<TestUser> {
  // Generate defaults for required fields
  const timestamp = Date.now();
  const email = data.email || `test-${timestamp}-${Math.random().toString(36).substring(7)}@test.krewup.local`;
  const password = data.password || 'TestPassword123!';
  const name = data.name || `Test ${data.role === 'worker' ? 'Worker' : 'Employer'} ${timestamp}`;

  // Create auth user
  const { data: authData, error: authError } = await testDb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }

  // Default Chicago coordinates
  const coords = data.coords || { lat: 41.8781, lng: -87.6298 };

  // Use RPC function to properly set PostGIS coords
  const { error: coordsError } = await testDb.rpc('update_user_coords', {
    p_user_id: authData.user.id,
    p_lat: coords.lat,
    p_lng: coords.lng,
  });

  if (coordsError) {
    // If RPC doesn't exist, fall back to direct SQL with ST_SetSRID
    const { error: fallbackError } = await testDb
      .from('users')
      .update({
        geo_coords: `SRID=4326;POINT(${coords.lng} ${coords.lat})`,
      })
      .eq('id', authData.user.id);

    if (fallbackError) {
      console.warn(`Failed to set coords: ${fallbackError.message}`);
    }
  }

  // Update user fields (created by trigger)
  const [firstName, ...lastNameParts] = name.split(' ');
  const lastName = lastNameParts.join(' ') || 'User';

  const userUpdate: Record<string, any> = {
    first_name: firstName,
    last_name: lastName,
    role: data.role.toLowerCase(),
    location: data.location || 'Chicago, IL',
  };
  
  // Set admin flag if requested
  if (data.isAdmin) {
    userUpdate.is_admin = true;
  }

  const { error: userError } = await testDb
    .from('users')
    .update(userUpdate)
    .eq('id', authData.user.id);

  if (userError) {
    throw new Error(`Failed to update test user: ${userError.message}`);
  }

  return {
    id: authData.user.id,
    email,
    password,
    role: data.role,
    name,
    employerType: data.employerType,
    companyName: data.companyName,
  };
}

/**
 * Delete a test user and all related data
 */
export async function deleteTestUser(userId: string) {
  // Delete user record
  await testDb.from('users').delete().eq('id', userId);

  // Delete auth user
  await testDb.auth.admin.deleteUser(userId);
}

/**
 * Create a test job posting
 *
 * IMPORTANT: Uses proper PostGIS coords handling
 */
export async function createTestJob(
  employerId: string,
  data: {
    title: string;
    trade: string;
    subTrade?: string;
    location?: string;
    coords?: { lat: number; lng: number };
    description?: string;
    payRate?: string;
    jobType?: string;
    requiredCerts?: string[];
  }
) {
  // Default Chicago coordinates
  const coords = data.coords || { lat: 41.8781, lng: -87.6298 };

  const jobData = {
    employer_id: employerId,
    title: data.title,
    trades: [data.trade],
    sub_trades: data.subTrade ? [data.subTrade] : [],
    location: data.location || 'Chicago, IL',
    description: data.description || 'Test job description',
    pay_rate: data.payRate || '$25/hr',
    job_type: data.jobType || 'Full-Time',
    required_certs: data.requiredCerts || [],
    status: 'active' as const,
  };

  // Try RPC function first
  const { data: jobFromRpc, error: rpcError } = await testDb.rpc(
    'create_job_with_coords',
    {
      p_employer_id: employerId,
      p_title: data.title,
      p_description: jobData.description,
      p_location: jobData.location,
      p_lng: coords.lng,
      p_lat: coords.lat,
      p_trades: jobData.trades,
      p_job_type: jobData.job_type,
      p_pay_rate: jobData.pay_rate,
    }
  );

  if (!rpcError && jobFromRpc) {
    // If we need to add sub_trades or required_certs, do it here as RPC doesn't handle them
    await testDb
      .from('jobs')
      .update({
        sub_trades: jobData.sub_trades,
        required_certs: jobData.required_certs,
      })
      .eq('id', jobFromRpc);
    
    return { id: jobFromRpc, ...jobData };
  }

  // Fallback: Insert directly with PostGIS syntax
  const { data: job, error } = await testDb
    .from('jobs')
    .insert({
      ...jobData,
      coords: `SRID=4326;POINT(${coords.lng} ${coords.lat})`,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test job: ${error.message}`);
  }

  return job;
}

/**
 * Create a test application for a job
 */
export async function createTestApplication(
  jobId: string,
  applicantId: string,
  data?: {
    status?: 'pending' | 'viewed' | 'contacted' | 'rejected' | 'hired' | 'withdrawn';
    coverLetter?: string;
    formData?: Record<string, any>;
    customAnswers?: Record<string, string>;
  }
) {
  const { data: application, error } = await testDb
    .from('job_applications')
    .insert({
      job_id: jobId,
      applicant_id: applicantId,
      status: data?.status || 'pending',
      form_data: data?.formData || {
        fullName: 'Test Applicant',
        phoneNumber: '(312) 555-1234',
        coverLetterText: data?.coverLetter || 'Test application',
      },
      custom_answers: data?.customAnswers || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test application: ${error.message}`);
  }

  return application;
}

/**
 * Create a test certification
 */
export async function createTestCertification(
  userId: string,
  data: {
    credentialCategory: 'license' | 'certification';
    certificationType: string;
    issuedBy?: string;
    issuingState?: string;
    certificationNumber?: string;
    issueDate?: string;
    expiresAt?: string;
    verificationStatus?: 'pending' | 'verified' | 'rejected';
    imageUrl?: string;
  }
) {
  const { data: certification, error } = await testDb
    .from('certifications')
    .insert({
      user_id: userId,
      credential_category: data.credentialCategory,
      certification_type: data.certificationType,
      issued_by: data.issuedBy || 'Test Issuer',
      issuing_state: data.issuingState || null,
      certification_number: data.certificationNumber || null,
      issue_date: data.issueDate || new Date().toISOString().split('T')[0],
      expires_at: data.expiresAt || null,
      verification_status: data.verificationStatus || 'pending',
      image_url: data.imageUrl || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test certification: ${error.message}`);
  }

  return certification;
}

/**
 * Delete all test data for cleanup
 */
export async function cleanupTestData() {
  // Delete test users (cascade will delete related data)
  await testDb.from('users').delete().like('email', '%@test.krewup.local');

  // Delete orphaned data (in case cascade failed)
  await testDb.from('jobs').delete().is('employer_id', null);
  await testDb.from('job_applications').delete().is('applicant_id', null);
  await testDb.from('messages').delete().is('sender_id', null);
  await testDb.from('certifications').delete().is('worker_id', null);
}

/**
 * Make a user Pro subscriber
 */
export async function makeUserPro(userId: string) {
  // Update user subscription_status (source of truth for UI)
  const { error: userError } = await testDb
    .from('users')
    .update({ subscription_status: 'pro' })
    .eq('id', userId);

  if (userError) {
    throw new Error(`Failed to update user subscription: ${userError.message}`);
  }

  // Create subscription record
  const { error: subError } = await testDb.from('subscriptions').insert({
    user_id: userId,
    stripe_customer_id: `cus_test_${userId}`,
    stripe_subscription_id: `sub_test_${userId}`,
    status: 'active',
    plan_type: 'monthly',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (subError) {
    throw new Error(`Failed to create subscription: ${subError.message}`);
  }
}

/**
 * Make a user an admin
 */
export async function makeUserAdmin(userId: string) {
  const { error } = await testDb
    .from('users')
    .update({ is_admin: true })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to make user admin: ${error.message}`);
  }
}


/**
 * Create a test message between two users
 */
export async function createTestMessage(
  senderId: string,
  recipientId: string,
  content: string
) {
  const { data: message, error } = await testDb
    .from('messages')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      content,
      read: false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test message: ${error.message}`);
  }

  return message;
}

/**
 * Get profile by user ID
 */
export async function getProfile(userId: string) {
  const { data, error } = await testDb
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to get profile: ${error.message}`);
  }

  return data;
}

/**
 * Wait for a condition to be true (polling with timeout)
 * Useful for waiting for async operations to complete
 */
export async function waitForCondition(
  checkFn: () => Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
  } = {}
): Promise<void> {
  const timeout = options.timeout || 10000;
  const interval = options.interval || 100;
  const errorMessage = options.errorMessage || 'Condition not met within timeout';

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await checkFn()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(errorMessage);
}

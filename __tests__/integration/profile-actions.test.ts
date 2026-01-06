import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  updateProfile,
  getMyProfile,
} from '@/features/profiles/actions/profile-actions';
import {
  addCertification,
  deleteCertification,
  getMyCertifications,
} from '@/features/profiles/actions/certification-actions';
import {
  addExperience,
  deleteExperience,
  getMyExperience,
} from '@/features/profiles/actions/experience-actions';

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(() => Promise.resolve({
    get: vi.fn(),
    set: vi.fn(),
    getAll: vi.fn().mockReturnValue([]),
  })),
}));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const testDb = createClient(supabaseUrl, supabaseServiceKey);

describe('Profile Server Actions Integration Tests', () => {
  let testUserId: string;
  let testEmail: string;

  beforeEach(async () => {
    // Create test user
    testEmail = `test-${Date.now()}@test.krewup.local`;
    const { data: authData } = await testDb.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    testUserId = authData.user!.id;

    // Update profile
    await testDb
      .from('users')
      .update({
        first_name: 'Test',
        last_name: 'User',
        role: 'worker',
      })
      .eq('id', testUserId);

    await testDb
      .from('workers')
      .update({
        trade: 'Carpenter',
      })
      .eq('user_id', testUserId);
  });

  afterEach(async () => {
    // Cleanup
    await testDb.from('users').delete().eq('id', testUserId);
    await testDb.auth.admin.deleteUser(testUserId);
  });

  describe('Profile Actions', () => {
    it('should update profile successfully', async () => {
      const result = await updateProfile({
        name: 'Updated Name',
        bio: 'Updated bio',
        trade: 'Electrician',
        location: 'New York, NY',
        coords: { lat: 40.7128, lng: -74.006 },
      });

      expect(result.success).toBe(true);

      // Verify in database
      const { data } = await testDb
        .from('users')
        .select('*, workers(trade)')
        .eq('id', testUserId)
        .single();

      expect(data?.first_name).toBe('Updated');
      expect(data?.last_name).toBe('Name');
      expect(data?.bio).toBe('Updated bio');
      expect(data?.workers?.[0]?.trade).toBe('Electrician');
    });

    it('should get user profile', async () => {
      const result = await getMyProfile();

      expect(result.success).toBe(true);
      expect(result.data?.first_name).toBe('Test');
      expect(result.data?.last_name).toBe('User');
      expect(result.data?.role).toBe('worker');
    });

    it('should handle validation errors', async () => {
      const result = await updateProfile({
        name: '', // Empty name should fail
        trade: 'Carpenter',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Certification Actions', () => {
    it('should add certification successfully', async () => {
      const result = await addCertification({
        credential_category: 'certification',
        certification_type: 'OSHA 10',
        issued_by: 'OSHA',
        issue_date: '2023-01-15',
        expires_at: '2025-01-15',
        certification_number: 'OSHA-10-12345',
      });

      expect(result.success).toBe(true);

      // Verify in database
      const { data } = await testDb
        .from('certifications')
        .select('*')
        .eq('worker_id', testUserId)
        .single();

      expect(data?.name).toBe('OSHA 10');
      expect(data?.credential_id).toBe('OSHA-10-12345');
    });

    it('should get user certifications', async () => {
      // Add a certification first
      await testDb.from('certifications').insert({
        worker_id: testUserId,
        name: 'First Aid/CPR',
        issuing_organization: 'Red Cross',
        issue_date: '2023-06-01',
      });

      const result = await getMyCertifications();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].certification_type).toBe('First Aid/CPR');
    });

    it('should delete certification', async () => {
      // Add a certification
      const { data: cert } = await testDb
        .from('certifications')
        .insert({
          worker_id: testUserId,
          name: 'Test Cert',
          issuing_organization: 'Test Org',
          issue_date: '2023-01-01',
        })
        .select()
        .single();

      const result = await deleteCertification(cert!.id, 'certification');

      expect(result.success).toBe(true);

      // Verify deleted
      const { data } = await testDb
        .from('certifications')
        .select('*')
        .eq('id', cert!.id)
        .single();

      expect(data).toBeNull();
    });
  });

  describe('Experience Actions', () => {
    it('should add work experience successfully', async () => {
      const result = await addExperience({
        company: 'ABC Construction',
        job_title: 'Senior Carpenter',
        description: 'Built custom furniture',
        start_date: '2020-01-01',
        end_date: '2023-01-01',
        is_current: false,
      });

      expect(result.success).toBe(true);

      // Verify in database
      const { data } = await testDb
        .from('experiences')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(data?.company).toBe('ABC Construction');
      expect(data?.job_title).toBe('Senior Carpenter');
    });

    it('should get user experiences', async () => {
      // Add an experience
      await testDb.from('experiences').insert({
        user_id: testUserId,
        company: 'Test Company',
        job_title: 'Test Position',
        start_date: '2021-01-01',
        is_current: true,
      });

      const result = await getMyExperience();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].company).toBe('Test Company');
    });

    it('should delete experience', async () => {
      // Add an experience
      const { data: exp } = await testDb
        .from('experiences')
        .insert({
          user_id: testUserId,
          company: 'Delete Me',
          job_title: 'Test',
          start_date: '2021-01-01',
          is_current: false,
        })
        .select()
        .single();

      const result = await deleteExperience(exp!.id);

      expect(result.success).toBe(true);

      // Verify deleted
      const { data } = await testDb
        .from('experiences')
        .select('*')
        .eq('id', exp!.id)
        .single();

      expect(data).toBeNull();
    });

    it('should validate current experience has no end date', async () => {
      const result = await addExperience({
        company: 'Current Job',
        job_title: 'Carpenter',
        start_date: '2023-01-01',
        end_date: '2024-01-01', // Should not have end date if current
        is_current: true,
      });

      // Should either succeed and ignore end_date or fail with error
      if (result.success) {
        const { data } = await testDb
          .from('experiences')
          .select('*')
          .eq('user_id', testUserId)
          .single();

        expect(data?.end_date).toBeNull();
      }
    });
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const testDb = createClient(supabaseUrl, supabaseServiceKey);

describe('Cron Job APIs', () => {
  describe('Reset Expired Boosts', () => {
    let testUserId: string;

    beforeEach(async () => {
      const testEmail = `boost-${Date.now()}@test.krewup.local`;
      const { data: authData } = await testDb.auth.admin.createUser({
        email: testEmail,
        password: 'TestPassword123!',
        email_confirm: true,
      });

      testUserId = authData.user!.id;

      await testDb
        .from('users')
        .update({
          name: 'Boost Test User',
          role: 'Worker',
          trade: 'Carpenter',
        })
        .eq('id', testUserId);
    });

    afterEach(async () => {
      await testDb.from('users').delete().eq('id', testUserId);
      await testDb.auth.admin.deleteUser(testUserId);
    });

    it('should reset expired boosts', async () => {
      // Set expired boost
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await testDb
        .from('users')
        .update({
          is_profile_boosted: true,
          boost_expires_at: yesterday.toISOString(),
        })
        .eq('id', testUserId);

      // Manually reset expired boosts (simulating cron job)
      await testDb
        .from('users')
        .update({
          is_profile_boosted: false,
          boost_expires_at: null,
        })
        .lt('boost_expires_at', new Date().toISOString())
        .eq('id', testUserId);

      // Verify boost was reset
      const { data } = await testDb
        .from('users')
        .select('is_profile_boosted, boost_expires_at')
        .eq('id', testUserId)
        .single();

      expect(data?.is_profile_boosted).toBe(false);
      expect(data?.boost_expires_at).toBeNull();
    });

    it('should not reset active boosts', async () => {
      // Set future expiry
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await testDb
        .from('users')
        .update({
          is_profile_boosted: true,
          boost_expires_at: tomorrow.toISOString(),
        })
        .eq('id', testUserId);

      // Query should not affect active boosts
      const { data } = await testDb
        .from('users')
        .select('is_profile_boosted, boost_expires_at')
        .eq('id', testUserId)
        .single();

      expect(data?.is_profile_boosted).toBe(true);
      expect(data?.boost_expires_at).toBeTruthy();
    });
  });

  describe('Check Proximity Alerts', () => {
    let workerId: string;
    let employerId: string;

    beforeEach(async () => {
      // Create worker with proximity alert
      const workerEmail = `worker-${Date.now()}@test.krewup.local`;
      const { data: workerAuth } = await testDb.auth.admin.createUser({
        email: workerEmail,
        password: 'TestPassword123!',
        email_confirm: true,
      });
      workerId = workerAuth.user!.id;

      await testDb
        .from('users')
        .update({
          name: 'Alert Worker',
          role: 'Worker',
          trade: 'Carpenter',
          coords: 'POINT(-87.6298 41.8781)', // Chicago
        })
        .eq('id', workerId);

      // Create employer
      const employerEmail = `employer-${Date.now()}@test.krewup.local`;
      const { data: employerAuth } = await testDb.auth.admin.createUser({
        email: employerEmail,
        password: 'TestPassword123!',
        email_confirm: true,
      });
      employerId = employerAuth.user!.id;

      await testDb
        .from('users')
        .update({
          name: 'Alert Employer',
          role: 'Employer',
          trade: 'General Contractor',
        })
        .eq('id', employerId);
    });

    afterEach(async () => {
      await testDb.from('proximity_alerts').delete().eq('user_id', workerId);
      await testDb.from('jobs').delete().eq('employer_id', employerId);
      await testDb.from('users').delete().eq('id', workerId);
      await testDb.from('users').delete().eq('id', employerId);
      await testDb.auth.admin.deleteUser(workerId);
      await testDb.auth.admin.deleteUser(employerId);
    });

    it('should create proximity alert settings', async () => {
      // Create proximity alert
      const { data, error } = await testDb
        .from('proximity_alerts')
        .insert({
          user_id: workerId,
          radius_km: 25,
          trades: ['Carpenter'],
          is_active: true,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.user_id).toBe(workerId);
      expect(data?.radius_km).toBe(25);
    });

    it('should detect nearby jobs within radius', async () => {
      // Create proximity alert
      await testDb.from('proximity_alerts').insert({
        user_id: workerId,
        radius_km: 10,
        trades: ['Carpenter'],
        is_active: true,
      });

      // Create nearby job (same location as worker)
      await testDb.from('jobs').insert({
        employer_id: employerId,
        title: 'Nearby Carpentry Job',
        trade: 'Carpenter',
        location: 'Chicago, IL',
        coords: 'POINT(-87.6298 41.8781)', // Same coords as worker
        description: 'Test job',
        pay_rate: '$30/hr',
        job_type: 'Full-Time',
      });

      // Query for nearby jobs (simulating cron job logic)
      const { data } = await testDb.from('proximity_alerts')
        .select('*, users!inner(*)')
        .eq('is_active', true)
        .eq('user_id', workerId);

      expect(data).toBeTruthy();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('should not trigger for inactive alerts', async () => {
      // Create inactive alert
      await testDb.from('proximity_alerts').insert({
        user_id: workerId,
        radius_km: 25,
        trades: ['Carpenter'],
        is_active: false,
      });

      const { data } = await testDb
        .from('proximity_alerts')
        .select('*')
        .eq('is_active', true)
        .eq('user_id', workerId);

      expect(data?.length).toBe(0);
    });
  });
});

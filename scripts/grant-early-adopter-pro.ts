#!/usr/bin/env node
/**
 * Early Adopter Lifetime Pro Grant Script
 *
 * Grants lifetime Pro status to the first early adopters:
 * - 50 workers (role = 'worker')
 * - 25 contractors (employer_type = 'contractor')
 * - 25 developers (employer_type = 'developer')
 * - 25 homeowners (employer_type = 'homeowner')
 * - 25 recruiters (employer_type = 'recruiter')
 *
 * Total: 150 lifetime Pro users
 *
 * Usage:
 *   npx tsx scripts/grant-early-adopter-pro.ts           # Execute grants
 *   npx tsx scripts/grant-early-adopter-pro.ts --dry-run # Preview without updating
 */

import { config } from 'dotenv';
import { createServerClient } from '@supabase/ssr';
import type { Profile } from '../lib/types/profile.types';

// Load environment variables from .env.local
config({ path: '.env.local' });

const isDryRun = process.argv.includes('--dry-run');

const GRANT_LIMITS = {
  workers: 50,
  contractors: 25,
  developers: 25,
  homeowners: 25,
  recruiters: 25,
};

interface GrantResult {
  category: string;
  limit: number;
  granted: number;
  skipped: number;
  failed: number;
  userIds: string[];
}

/**
 * Create service role client (bypasses RLS)
 */
function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
    );
  }

  return createServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No-op - service role doesn't use cookies
      },
    },
  });
}

/**
 * Grant lifetime Pro to workers (role = 'worker')
 */
async function grantToWorkers(supabase: ReturnType<typeof createServiceClient>): Promise<GrantResult> {
  console.log('\n🔍 Processing workers...');

  const result: GrantResult = {
    category: 'Workers',
    limit: GRANT_LIMITS.workers,
    granted: 0,
    skipped: 0,
    failed: 0,
    userIds: [],
  };

  // Fetch first 50 workers by created_at
  const { data: workers, error: fetchError } = await supabase
    .from('profiles')
    .select('id, name, email, created_at, is_lifetime_pro, lifetime_pro_granted_at')
    .eq('role', 'worker')
    .order('created_at', { ascending: true })
    .limit(GRANT_LIMITS.workers);

  if (fetchError) {
    console.error(`❌ Failed to fetch workers:`, fetchError.message);
    result.failed = GRANT_LIMITS.workers;
    return result;
  }

  if (!workers || workers.length === 0) {
    console.log('⚠️  No workers found');
    return result;
  }

  console.log(`📋 Found ${workers.length} workers (limit: ${GRANT_LIMITS.workers})`);

  for (const worker of workers) {
    // Skip if already has lifetime Pro
    if (worker.is_lifetime_pro) {
      console.log(`⏭️  Skipping ${worker.name} (${worker.email}) - already has lifetime Pro`);
      result.skipped++;
      continue;
    }

    if (isDryRun) {
      console.log(`🔍 [DRY RUN] Would grant to: ${worker.name} (${worker.email})`);
      result.granted++;
      result.userIds.push(worker.id);
    } else {
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_lifetime_pro: true,
          lifetime_pro_granted_at: new Date().toISOString(),
          lifetime_pro_granted_by: null, // Auto-grant, not manual admin action
        })
        .eq('id', worker.id);

      if (updateError) {
        console.error(`❌ Failed to grant to ${worker.name}:`, updateError.message);
        result.failed++;
      } else {
        console.log(`✅ Granted to: ${worker.name} (${worker.email})`);
        result.granted++;
        result.userIds.push(worker.id);
      }
    }
  }

  return result;
}

/**
 * Grant lifetime Pro to employers by employer_type
 */
async function grantToEmployerType(
  supabase: ReturnType<typeof createServiceClient>,
  employerType: 'contractor' | 'developer' | 'homeowner' | 'recruiter',
  limit: number
): Promise<GrantResult> {
  const categoryName = employerType.charAt(0).toUpperCase() + employerType.slice(1) + 's';
  console.log(`\n🔍 Processing ${categoryName.toLowerCase()}...`);

  const result: GrantResult = {
    category: categoryName,
    limit,
    granted: 0,
    skipped: 0,
    failed: 0,
    userIds: [],
  };

  // Fetch first N employers by created_at
  const { data: employers, error: fetchError } = await supabase
    .from('profiles')
    .select('id, name, email, created_at, is_lifetime_pro, lifetime_pro_granted_at')
    .eq('role', 'employer')
    .eq('employer_type', employerType)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (fetchError) {
    console.error(`❌ Failed to fetch ${categoryName.toLowerCase()}:`, fetchError.message);
    result.failed = limit;
    return result;
  }

  if (!employers || employers.length === 0) {
    console.log(`⚠️  No ${categoryName.toLowerCase()} found`);
    return result;
  }

  console.log(`📋 Found ${employers.length} ${categoryName.toLowerCase()} (limit: ${limit})`);

  for (const employer of employers) {
    // Skip if already has lifetime Pro
    if (employer.is_lifetime_pro) {
      console.log(`⏭️  Skipping ${employer.name} (${employer.email}) - already has lifetime Pro`);
      result.skipped++;
      continue;
    }

    if (isDryRun) {
      console.log(`🔍 [DRY RUN] Would grant to: ${employer.name} (${employer.email})`);
      result.granted++;
      result.userIds.push(employer.id);
    } else {
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          is_lifetime_pro: true,
          lifetime_pro_granted_at: new Date().toISOString(),
          lifetime_pro_granted_by: null, // Auto-grant, not manual admin action
        })
        .eq('id', employer.id);

      if (updateError) {
        console.error(`❌ Failed to grant to ${employer.name}:`, updateError.message);
        result.failed++;
      } else {
        console.log(`✅ Granted to: ${employer.name} (${employer.email})`);
        result.granted++;
        result.userIds.push(employer.id);
      }
    }
  }

  return result;
}

/**
 * Print summary report
 */
function printSummary(results: GrantResult[]) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(60));

  let totalLimit = 0;
  let totalGranted = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  console.log('\nBy Category:');
  for (const result of results) {
    console.log(`\n${result.category}:`);
    console.log(`  Limit:   ${result.limit}`);
    console.log(`  Granted: ${result.granted}`);
    console.log(`  Skipped: ${result.skipped}`);
    console.log(`  Failed:  ${result.failed}`);

    totalLimit += result.limit;
    totalGranted += result.granted;
    totalSkipped += result.skipped;
    totalFailed += result.failed;
  }

  console.log('\n' + '-'.repeat(60));
  console.log('Overall Totals:');
  console.log(`  Target:  ${totalLimit} users`);
  console.log(`  Granted: ${totalGranted} users`);
  console.log(`  Skipped: ${totalSkipped} users (already had lifetime Pro)`);
  console.log(`  Failed:  ${totalFailed} users`);
  console.log('='.repeat(60));

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN MODE - No changes were made to the database');
    console.log('Run without --dry-run to actually grant lifetime Pro status');
  } else if (totalFailed === 0) {
    console.log('\n✅ All grants completed successfully!');
  } else {
    console.log('\n⚠️  Some grants failed - check errors above');
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Early Adopter Lifetime Pro Grant Script');
  console.log('='.repeat(60));

  if (isDryRun) {
    console.log('⚠️  Running in DRY RUN mode - no database changes will be made\n');
  }

  try {
    // Create service role client
    const supabase = createServiceClient();
    console.log('✅ Connected to Supabase with service role');

    // Process each category
    const results: GrantResult[] = [];

    // Workers
    results.push(await grantToWorkers(supabase));

    // Contractors
    results.push(
      await grantToEmployerType(supabase, 'contractor', GRANT_LIMITS.contractors)
    );

    // Developers
    results.push(
      await grantToEmployerType(supabase, 'developer', GRANT_LIMITS.developers)
    );

    // Homeowners
    results.push(
      await grantToEmployerType(supabase, 'homeowner', GRANT_LIMITS.homeowners)
    );

    // Recruiters
    results.push(
      await grantToEmployerType(supabase, 'recruiter', GRANT_LIMITS.recruiters)
    );

    // Print summary
    printSummary(results);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the script
main();

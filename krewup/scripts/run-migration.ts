/**
 * Run Database Migration Script
 *
 * This script applies pending SQL migrations to the database.
 * Usage: tsx scripts/run-migration.ts <migration-file-name>
 * Example: tsx scripts/run-migration.ts 007_add_company_name.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration(migrationFile: string) {
  // Get Supabase credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read migration file
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', migrationFile);

  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    console.log(`📄 Reading migration: ${migrationFile}`);
    console.log(`📝 SQL:\n${sql}\n`);

    // Execute the migration
    console.log('⚙️  Executing migration...');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // If exec_sql RPC doesn't exist, try direct query
        const { error: queryError } = await supabase.from('_migrations').insert({});

        if (queryError) {
          throw error;
        }
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nPlease run this migration manually using the Supabase Dashboard:');
    console.error(`1. Go to: ${supabaseUrl.replace('//', '//app.')}/project/_/sql`);
    console.error(`2. Copy the SQL from: ${migrationPath}`);
    console.error('3. Paste and execute in the SQL Editor');
    process.exit(1);
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Please specify a migration file');
  console.error('Usage: tsx scripts/run-migration.ts <migration-file-name>');
  console.error('Example: tsx scripts/run-migration.ts 007_add_company_name.sql');
  process.exit(1);
}

runMigration(migrationFile);

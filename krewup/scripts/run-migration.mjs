#!/usr/bin/env node

/**
 * Script to apply a migration to the remote Supabase database
 * Usage: node scripts/run-migration.mjs <migration-file-path>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, basename, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

async function applyMigration(migrationPath) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase credentials in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Read migration file
  if (!existsSync(migrationPath)) {
    console.error(`Error: Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = readFileSync(migrationPath, 'utf8');
  console.log(`\nReading migration: ${basename(migrationPath)}`);
  console.log(`SQL length: ${sql.length} characters\n`);

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('Applying migration to remote database...\n');

  try {
    // Split SQL into individual statements (simple split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);

      // Execute the SQL using Supabase's query method
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_string: statement + ';'
      });

      if (error) {
        console.error(`\nError executing statement ${i + 1}:`, error.message);
        console.error('Statement:', statement.substring(0, 200) + '...');
        throw error;
      }

      console.log(`  ✓ Statement ${i + 1} executed successfully`);
    }

    console.log('\n✓ Migration applied successfully!');
    console.log('\nTo verify the table was created, run:');
    console.log(`  SELECT * FROM application_drafts LIMIT 1;\n`);

  } catch (err) {
    console.error('\n✗ Error applying migration:', err.message);
    console.error('\nThe Supabase REST API does not support direct SQL execution.');
    console.error('Please apply the migration manually using one of these methods:\n');

    console.log('Method 1 - Supabase SQL Editor (RECOMMENDED):');
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    console.log(`  https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);

    console.log('Method 2 - psql (if you have database password):');
    console.log(`  psql "postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres" -f ${migrationPath}\n`);

    console.log('Method 3 - Copy the SQL below and paste it into the Supabase SQL Editor:\n');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80) + '\n');

    process.exit(1);
  }
}

// Get migration file path from command line args
const migrationPath = process.argv[2];

if (!migrationPath) {
  console.error('Usage: node scripts/run-migration.mjs <migration-file-path>');
  console.error('Example: node scripts/run-migration.mjs supabase/migrations/018_create_application_drafts.sql');
  process.exit(1);
}

applyMigration(resolve(migrationPath));

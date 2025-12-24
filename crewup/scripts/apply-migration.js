#!/usr/bin/env node

/**
 * Script to apply a migration to the remote Supabase database
 * Usage: node scripts/apply-migration.js <migration-file-path>
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
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
    process.exit(1);
  }

  // Read migration file
  if (!fs.existsSync(migrationPath)) {
    console.error(`Error: Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`Reading migration: ${path.basename(migrationPath)}`);
  console.log(`SQL length: ${sql.length} characters\n`);

  console.log('Applying migration to remote database...');
  console.log('Using Supabase REST API with service role key\n');

  try {
    // Try to execute SQL using Supabase REST API
    // Note: This requires a custom function or direct database access
    // For now, we'll just provide the SQL for manual execution

    console.log('Note: Direct SQL execution via REST API requires additional setup.');
    console.log('Please apply the migration manually using one of these methods:\n');

    console.log('Method 1 - Supabase SQL Editor:');
    console.log(`  https://supabase.com/dashboard/project/vfjcpxaplapnuwtzvord/sql/new\n`);

    console.log('Method 2 - psql (if you have database password):');
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];
    console.log(`  psql "postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres" -f ${migrationPath}\n`);

    console.log('Method 3 - Copy the SQL below and paste it into the Supabase SQL Editor:\n');
    console.log('='.repeat(80));
    console.log(sql);
    console.log('='.repeat(80));

  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Get migration file path from command line args
const migrationPath = process.argv[2];

if (!migrationPath) {
  console.error('Usage: node scripts/apply-migration.js <migration-file-path>');
  process.exit(1);
}

applyMigration(path.resolve(migrationPath));

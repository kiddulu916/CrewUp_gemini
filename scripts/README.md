# Scripts Directory

Administrative and maintenance scripts for KrewUp.

## Available Scripts

### grant-early-adopter-pro.ts

Grants lifetime Pro status to early adopters (first 150 users):
- 50 workers
- 25 contractors
- 25 developers
- 25 homeowners
- 25 recruiters

**Prerequisites:**
- Environment variables must be set in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Usage:**

```bash
# Using npm scripts (recommended)
npm run grant-early-adopter-pro:dry-run  # Dry run (preview without changes)
npm run grant-early-adopter-pro          # Execute grants

# Using npx tsx directly
npx tsx scripts/grant-early-adopter-pro.ts --dry-run  # Dry run
npx tsx scripts/grant-early-adopter-pro.ts            # Execute
```

**Features:**
- ✅ Idempotent - safe to run multiple times (skips users who already have lifetime Pro)
- ✅ Dry-run mode for testing
- ✅ Comprehensive logging and progress tracking
- ✅ Error handling and failure reporting
- ✅ Summary report with totals by category

**Output:**
The script prints:
- Progress for each user (granted/skipped/failed)
- Summary report with totals by category
- Overall statistics

**Safety:**
- Uses service role client (bypasses RLS) - requires admin credentials
- Sets `lifetime_pro_granted_by` to null (indicates auto-grant, not manual)
- Queries users ordered by `created_at ASC` to ensure earliest users get priority
- Updates only `is_lifetime_pro`, `lifetime_pro_granted_at`, and `lifetime_pro_granted_by` fields

## Development

Scripts are written in TypeScript and executed via `tsx` (TypeScript Execute).

To create a new script:
1. Create `scripts/your-script-name.ts`
2. Add shebang: `#!/usr/bin/env node`
3. Load env vars: `import { config } from 'dotenv'; config({ path: '.env.local' });`
4. Make executable: `chmod +x scripts/your-script-name.ts`
5. Run via: `npx tsx scripts/your-script-name.ts`

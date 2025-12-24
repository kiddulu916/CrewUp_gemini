# 10 - Deployment Strategy

## Overview

This document covers the complete deployment strategy for CrewUp, including environment setup, CI/CD pipelines, monitoring, security, and operational procedures.

## Environment Architecture

### Three Environments

**1. Development (Local)**
- URL: `localhost:3000`
- Database: Local Supabase or development project
- Payments: Stripe test mode
- Purpose: Feature development, debugging
- Tools: Hot reload, React DevTools, verbose logging

**2. Staging (Vercel Preview)**
- URL: `crewup-staging-*.vercel.app` (auto-generated per PR)
- Database: Staging Supabase project
- Payments: Stripe test mode
- Purpose: QA testing, stakeholder review
- Deploy: Automatic on pull request

**3. Production (Vercel)**
- URL: `crewup.app` (custom domain)
- Database: Production Supabase project
- Payments: Stripe live mode
- Purpose: Real users, real payments
- Deploy: Automatic on merge to `main`

---

## Initial Setup

### Step 1: Vercel Project Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
cd crewup-nextjs
vercel link

# Follow prompts:
# - Select or create team
# - Link to existing project or create new
# - Choose project name
```

### Step 2: Environment Variables

**Add to Vercel Dashboard** (Settings → Environment Variables):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...  # Server-side only

# App URL
NEXT_PUBLIC_URL=https://crewup.app  # Production
# NEXT_PUBLIC_URL=https://crewup-staging.vercel.app  # Staging

# Stripe
STRIPE_SECRET_KEY=sk_live_...  # Production
# STRIPE_SECRET_KEY=sk_test_...  # Staging
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_ANNUAL=price_...

# Monitoring (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=...
```

**Environment Scope**:
- `NEXT_PUBLIC_*` → Available to browser (safe data only)
- Other vars → Server-side only (secrets)

**Per-Environment Configuration**:
- Development: `.env.local` file
- Staging: Vercel environment variables (Preview scope)
- Production: Vercel environment variables (Production scope)

### Step 3: Custom Domain Setup

**Vercel Dashboard** (Settings → Domains):

1. Add custom domain: `crewup.app`
2. Add DNS records (provided by Vercel):
   ```
   A record: @ → 76.76.21.21
   CNAME: www → cname.vercel-dns.com
   ```
3. Wait for SSL certificate (automatic, ~5 minutes)
4. Set `crewup.app` as production domain

**Subdomains** (optional):
- `api.crewup.app` → API endpoints
- `staging.crewup.app` → Staging environment

---

## Vercel Configuration

### vercel.json

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_URL": "https://crewup.app"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/webhooks/stripe",
      "destination": "/api/webhooks/stripe"
    }
  ]
}
```

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['lh3.googleusercontent.com', 'your-supabase-project.supabase.co'],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['crewup.app', '*.vercel.app'],
    },
  },
  // Sentry configuration
  sentry: {
    hideSourceMaps: true,
  },
}

module.exports = nextConfig
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
  VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm run test

      - name: Build project
        run: npm run build

      - name: Upload coverage
        if: always()
        uses: codecov/codecov-action@v3

  deploy-preview:
    name: Deploy Preview (Staging)
    if: github.event_name == 'pull_request'
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Vercel
        id: deploy
        run: |
          url=$(vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$url" >> $GITHUB_OUTPUT

      - name: Comment PR with Preview URL
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Preview deployed: ${{ steps.deploy.outputs.url }}'
            })

  deploy-production:
    name: Deploy Production
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel Environment
        run: vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build Project
        run: vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy to Production
        run: vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Notify Deployment
        run: echo "🚀 Deployed to production!"
```

**GitHub Secrets to Add**:
- `VERCEL_TOKEN` - Create at vercel.com/account/tokens
- `VERCEL_ORG_ID` - Found in Vercel project settings
- `VERCEL_PROJECT_ID` - Found in Vercel project settings

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "deploy:staging": "vercel",
    "deploy:production": "vercel --prod"
  }
}
```

---

## Database Management

### Supabase Migration Strategy

**Setup Supabase CLI**:

```bash
# Install
brew install supabase/tap/supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-id
```

**Create Migrations**:

```bash
# Create new migration
supabase migration new add_new_feature

# This creates: supabase/migrations/20231215_add_new_feature.sql
```

**Apply Migrations**:

```bash
# Apply to local
supabase db push

# Apply to remote (production)
supabase db push --db-url $PRODUCTION_DATABASE_URL
```

**Migration Example**:

```sql
-- supabase/migrations/20231215_add_job_templates.sql

-- Add templates table
CREATE TABLE IF NOT EXISTS job_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index
CREATE INDEX idx_job_templates_user_id ON job_templates(user_id);

-- Add RLS policies
ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON job_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON job_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**Migration Best Practices**:
1. **Always test on staging first**
2. **Use transactions** for multi-step migrations
3. **Make migrations reversible** (include rollback SQL)
4. **Never drop columns with data** (deprecate instead)
5. **Add columns as nullable or with defaults**

### Backup Strategy

**Automated Backups** (Supabase handles):
- Daily backups (7-day retention on free tier)
- Point-in-Time Recovery (PITR) on Pro tier

**Manual Backup Before Major Changes**:

```bash
# Backup before migration
pg_dump $PRODUCTION_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore if needed
psql $PRODUCTION_DATABASE_URL < backup_20231215_143022.sql
```

---

## Stripe Webhook Configuration

### Development (Local Testing)

Use Stripe CLI to forward webhooks to localhost:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Test webhook
stripe trigger checkout.session.completed
```

Copy webhook signing secret to `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Staging & Production

**Configure in Stripe Dashboard** (Developers → Webhooks):

1. **Staging Webhook**:
   - Endpoint URL: `https://crewup-staging.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
   - Get signing secret → Add to Vercel staging env vars

2. **Production Webhook**:
   - Endpoint URL: `https://crewup.app/api/webhooks/stripe`
   - Same events
   - Get signing secret → Add to Vercel production env vars

**Verify Webhook**:
```bash
# Test in production (use with caution)
stripe trigger checkout.session.completed --api-key sk_live_...
```

---

## Monitoring & Error Tracking

### 1. Sentry Setup

**Install**:
```bash
npm install @sentry/nextjs

npx @sentry/wizard@latest -i nextjs
```

**Configuration** (`sentry.client.config.ts`):
```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      return null
    }
    return event
  },
})
```

**Usage in Code**:
```typescript
try {
  await riskyOperation()
} catch (error) {
  Sentry.captureException(error, {
    extra: { userId, operation: 'job_posting' }
  })
  throw error
}
```

### 2. Vercel Analytics

**Enable in `app/layout.tsx`**:
```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Tracks**:
- Page views
- Core Web Vitals (LCP, FID, CLS)
- Custom events

### 3. Logging Strategy

**Structured Logging** (`lib/logger.ts`):
```typescript
export const logger = {
  info: (message: string, meta?: object) => {
    if (process.env.NODE_ENV === 'production') {
      // Send to logging service (e.g., Datadog, LogRocket)
      console.log(JSON.stringify({ level: 'info', message, ...meta }))
    } else {
      console.log(message, meta)
    }
  },

  error: (error: Error, context?: object) => {
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, { extra: context })
    }
    console.error(error, context)
  },

  warn: (message: string, meta?: object) => {
    console.warn(message, meta)
  }
}

// Usage
logger.info('User subscribed to Pro', { userId, plan: 'annual' })
logger.error(new Error('Payment failed'), { userId, stripeCustomerId })
```

### 4. Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check database connection
    const supabase = createServerClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)

    if (error) throw error

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        api: 'up'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 500 })
  }
}
```

**Monitor with UptimeRobot or similar**:
- URL: `https://crewup.app/api/health`
- Interval: 5 minutes
- Alert on failure

---

## Security Configuration

### Environment Variables Security

**Never commit**:
- `.env.local` → Git ignored
- Production secrets → Only in Vercel

**Rotate secrets regularly**:
- Stripe keys: Every 6 months
- Supabase service role key: On team changes
- Webhook secrets: On suspicion of compromise

### Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}
```

### CORS Configuration

```typescript
// lib/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_URL,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Use in API routes that need CORS
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders
  })
}
```

---

## Performance Optimization

### Image Optimization

```typescript
// Always use Next.js Image component
import Image from 'next/image'

<Image
  src={profile.profile_image_url}
  alt={profile.name}
  width={100}
  height={100}
  priority={false}
  loading="lazy"
/>
```

### Database Query Optimization

**Add Indexes**:
```sql
-- Check slow queries in Supabase dashboard
-- Add indexes for commonly filtered/sorted columns

CREATE INDEX CONCURRENTLY idx_jobs_trade_status
  ON jobs(trade, status)
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);
```

**Use RPC for Complex Queries**:
```sql
-- Instead of multiple client-side queries, use database function
CREATE OR REPLACE FUNCTION get_job_with_stats(job_id UUID)
RETURNS JSON AS $$
  SELECT json_build_object(
    'job', (SELECT row_to_json(j) FROM jobs j WHERE id = job_id),
    'application_count', (SELECT COUNT(*) FROM job_applications WHERE job_id = job_id),
    'view_count', (SELECT COUNT(*) FROM job_views WHERE job_id = job_id)
  )
$$ LANGUAGE sql;
```

### Caching Strategy

**Static Pages** (cached at edge):
- Landing page
- About page
- Pricing page

**Revalidated Pages** (ISR):
- Job listings (revalidate every 60 seconds)

**Dynamic Pages** (no cache):
- Dashboard
- User profile
- Messages

```typescript
// app/(marketing)/page.tsx
export const revalidate = 3600 // 1 hour

// app/(dashboard)/feed/page.tsx
export const dynamic = 'force-dynamic' // Always fresh
```

---

## Disaster Recovery

### Rollback Procedure

**1. Revert Deployment** (if code issue):
```bash
# Revert to previous deployment in Vercel dashboard
# Or redeploy previous commit
git revert HEAD
git push origin main
```

**2. Restore Database** (if migration issue):
```bash
# Restore from Supabase backup
# Or use manual backup
psql $DATABASE_URL < backup_20231215.sql
```

**3. Verify System Health**:
```bash
# Check health endpoint
curl https://crewup.app/api/health

# Check Stripe webhook status in dashboard
# Check error rates in Sentry
```

### Emergency Contacts

Document and share:
- Vercel account owner
- Supabase project owner
- Stripe account owner
- On-call developer

---

## Pre-Launch Checklist

### Security
- [ ] All environment variables configured in Vercel
- [ ] Stripe switched to live keys
- [ ] Webhook signature verification enabled
- [ ] RLS policies enabled on all tables
- [ ] HTTPS enforced (Vercel handles this)
- [ ] Security headers configured

### Infrastructure
- [ ] Custom domain configured with SSL
- [ ] Database backups enabled
- [ ] Sentry configured for error tracking
- [ ] Analytics configured (Vercel + optional Google)
- [ ] Health check endpoint working
- [ ] Monitoring/alerts set up

### Testing
- [ ] All tests passing in CI
- [ ] Manual smoke test in production
- [ ] Payment flow tested with test cards
- [ ] Subscription cancellation tested
- [ ] Webhook delivery verified

### Documentation
- [ ] README updated with deployment instructions
- [ ] Environment variables documented
- [ ] Rollback procedure documented
- [ ] Emergency contacts documented

---

## Post-Launch Monitoring

### Week 1
- Monitor error rates hourly
- Check Stripe webhook delivery (Dashboard → Developers → Webhooks)
- Track user signups and conversions
- Respond to user reports immediately

### Ongoing
- Weekly: Review error logs, fix critical bugs
- Monthly: Review performance metrics, optimize slow queries
- Quarterly: Security audit, dependency updates
- As needed: Scale infrastructure

---

## Scaling Considerations

### At 1,000 users
- Current setup sufficient
- May need Supabase plan upgrade

### At 10,000 users
- Add database read replicas
- Implement caching layer (Redis/Upstash)
- Optimize expensive queries
- CDN for static assets (Vercel Edge Network handles this)

### At 100,000+ users
- Dedicated database instance
- Microservices for heavy operations
- Queue system for background jobs (BullMQ, Inngest)
- Consider geographic distribution
- Load testing and optimization

---

## Summary

**Environments**: Dev → Staging → Production
**CI/CD**: Automated testing and deployment via GitHub Actions
**Monitoring**: Sentry for errors, Vercel Analytics for metrics
**Security**: Environment variables, HTTPS, RLS, webhook verification
**Backup**: Automated daily + manual before migrations
**Rollback**: Revert code or restore database as needed

**Deploy confidently knowing you have monitoring, backups, and rollback procedures in place.**

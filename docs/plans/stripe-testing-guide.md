# Stripe Subscription Flow Testing Guide

## Overview

This guide covers testing the KrewUp Pro subscription system from local development through production deployment.

## Prerequisites

### Required Stripe Setup

Before full testing is possible, you need:

1. **Stripe Account**
   - Sign up at https://stripe.com
   - Use Test Mode for development
   - Switch to Live Mode for production

2. **Create Products in Stripe Dashboard**

   Navigate to Products → Add Product:

   **Monthly Plan:**
   - Name: "KrewUp Pro Monthly"
   - Price: $15.00 USD
   - Billing period: Monthly
   - Copy the Price ID (starts with `price_`)

   **Annual Plan:**
   - Name: "KrewUp Pro Annual"
   - Price: $150.00 USD
   - Billing period: Yearly
   - Copy the Price ID (starts with `price_`)

3. **Environment Variables**

   Add to `.env.local`:
   ```env
   # Stripe Keys (from Stripe Dashboard → Developers → API Keys)
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

   # Price IDs (from Products you created above)
   STRIPE_PRICE_ID_PRO_MONTHLY=price_...
   STRIPE_PRICE_ID_PRO_ANNUAL=price_...

   # Webhook Secret (set up in step 4 below)
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Webhook Configuration**

   **Local Development (Stripe CLI):**
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Login to Stripe
   stripe login

   # Forward webhooks to local server
   stripe listen --forward-to localhost:3000/api/webhooks/stripe

   # Copy the webhook signing secret (whsec_...) to .env.local
   ```

   **Production:**
   - In Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy webhook signing secret to production environment variables

---

## Phase 1: Local Testing (Without Stripe Account)

These tests verify the UI and component logic without requiring Stripe setup.

### Test 1: Pricing Page Renders

**Steps:**
1. Start development server: `npm run dev`
2. Navigate to `http://localhost:3000/pricing`

**Expected:**
- Page loads without errors
- Two pricing cards displayed side-by-side (desktop) or stacked (mobile)
- Monthly plan shows: $15/month
- Annual plan shows: $150/year with "Save 17%" badge
- Both cards show feature lists:
  - Real-time proximity alerts
  - Profile boost in searches
  - Who viewed me analytics
  - Advanced job compatibility
  - Priority support
- Subscribe buttons present but may error when clicked (no Stripe setup yet)

**Files to check:**
- `app/pricing/page.tsx`
- `features/subscriptions/components/pricing-card.tsx`

---

### Test 2: Subscription Page (Unauthenticated)

**Steps:**
1. Navigate to `http://localhost:3000/dashboard/subscription`

**Expected:**
- Redirect to `/login` (middleware protection)

**Files to check:**
- `lib/supabase/middleware.ts:85-93` (protected route logic)

---

### Test 3: Subscription Page (Authenticated, Free User)

**Steps:**
1. Sign in to the application
2. Navigate to `/dashboard/subscription`

**Expected:**
- Page loads successfully
- Shows current plan: "Free"
- Displays free tier features or upgrade prompt
- "Upgrade to Pro" button visible
- No "Manage Subscription" button (free users have no Stripe subscription)

**Files to check:**
- `app/dashboard/subscription/page.tsx`
- `features/subscriptions/components/subscription-manager.tsx`
- `features/subscriptions/hooks/use-subscription.ts`

---

### Test 4: Pro Feature Gating (Free User)

**Steps:**
1. While signed in as free user
2. Find a component wrapped in `<FeatureGate>`
3. Observe behavior

**Expected:**
- Pro features are hidden
- Upgrade prompt displayed instead
- "Upgrade to Pro" button present
- No flash of Pro content during loading

**Files to check:**
- `features/subscriptions/components/feature-gate.tsx`
- `features/subscriptions/hooks/use-subscription.ts:25-29` (useIsPro logic)

---

### Test 5: Navigation Integration

**Steps:**
1. Navigate to `/dashboard`
2. Check sidebar/navigation

**Expected:**
- Subscription link visible with credit card icon (💳)
- Link styled consistently with other nav items (purple theme)
- Clicking link navigates to `/dashboard/subscription`

**Files to check:**
- `app/dashboard/layout.tsx` (subscription nav link)

---

## Phase 2: Integration Testing (With Stripe Test Mode)

These tests require Stripe account setup with test mode enabled.

### Test 6: Monthly Subscription Checkout

**Setup:**
- Complete Prerequisites steps 1-4 above
- Use Stripe test card: `4242 4242 4242 4242`
- Use any future expiry date (e.g., 12/34)
- Use any 3-digit CVC (e.g., 123)

**Steps:**
1. Navigate to `/pricing`
2. Click "Subscribe" on Monthly plan
3. Redirected to Stripe Checkout
4. Fill in test card details
5. Complete checkout

**Expected:**
- Redirected to Stripe-hosted checkout page
- Email field pre-populated (if logged in)
- After successful payment:
  - Redirected to `/dashboard/subscription?success=true`
  - Success message displayed
  - Subscription status shows "Active"
  - Plan type shows "Monthly - $15/month"
  - Next billing date displayed
  - "Manage Subscription" button visible

**Verification:**
1. Check Supabase `subscriptions` table:
   ```sql
   SELECT * FROM subscriptions WHERE user_id = 'YOUR_USER_ID';
   ```
   - Should have row with:
     - `status = 'active'`
     - `plan_type = 'monthly'`
     - `stripe_customer_id` populated
     - `stripe_subscription_id` populated
     - `stripe_price_id` matches monthly price

2. Check Stripe Dashboard:
   - Customer created with your email
   - Active subscription with monthly plan
   - Payment succeeded

**Files to check:**
- `features/subscriptions/actions/subscription-actions.ts:76-160` (createCheckoutSession)
- `app/api/webhooks/stripe/route.ts:46-89` (checkout.session.completed handler)

---

### Test 7: Annual Subscription Checkout

**Steps:**
1. Sign up with new test user (or cancel existing subscription)
2. Navigate to `/pricing`
3. Click "Subscribe" on Annual plan
4. Complete checkout with test card

**Expected:**
- Same flow as Test 6
- Plan type shows "Annual - $150/year"
- Displays 17% savings message
- Next billing date is 1 year from now

**Verification:**
- Database has `plan_type = 'annual'`
- `stripe_price_id` matches annual price
- `current_period_end` is ~365 days from now

---

### Test 8: Subscription Management Portal

**Steps:**
1. As user with active subscription
2. Navigate to `/dashboard/subscription`
3. Click "Manage Subscription" button

**Expected:**
- Redirected to Stripe Customer Portal
- Can view subscription details
- Can update payment method
- Can cancel subscription
- Can view invoice history
- After clicking "Return to..." → back to `/dashboard/subscription`

**Files to check:**
- `features/subscriptions/actions/subscription-actions.ts:165-212` (createPortalSession)

---

### Test 9: Subscription Cancellation

**Steps:**
1. In Stripe Customer Portal (from Test 8)
2. Click "Cancel subscription"
3. Confirm cancellation

**Expected:**
- Subscription remains active until period end
- Database updated:
  - `status = 'active'` (still active!)
  - `cancel_at_period_end = true`
- UI shows "Cancels on [date]" message
- Pro features still accessible until period end

**Verification:**
1. Check webhook logs for `customer.subscription.updated` event
2. Database query:
   ```sql
   SELECT status, cancel_at_period_end, current_period_end
   FROM subscriptions
   WHERE user_id = 'YOUR_USER_ID';
   ```

**Files to check:**
- `app/api/webhooks/stripe/route.ts:91-139` (subscription.updated handler)

---

### Test 10: Subscription Expiration After Cancellation

**Steps:**
1. After cancelling subscription (Test 9)
2. Wait for period to end, OR manually trigger in Stripe:
   - Dashboard → Subscriptions → Select subscription
   - Actions → Cancel subscription → Cancel immediately

**Expected:**
- Webhook fired: `customer.subscription.deleted`
- Database updated:
  - `status = 'canceled'`
  - `cancel_at_period_end = false`
- User redirected or sees downgrade message
- Pro features now gated with upgrade prompts

**Verification:**
- Check webhook logs for `customer.subscription.deleted` event
- Verify `useIsPro()` hook returns `false`
- Pro features should be hidden

**Files to check:**
- `app/api/webhooks/stripe/route.ts:141-170` (subscription.deleted handler)
- `features/subscriptions/hooks/use-subscription.ts:25-29` (useIsPro)

---

### Test 11: Payment Failure Handling

**Steps:**
1. As user with active subscription
2. In Stripe Dashboard:
   - Find the subscription
   - Actions → Update payment method
   - Change to declining card: `4000 0000 0000 0341`
3. Trigger renewal (or wait for next billing cycle)

**Expected:**
- Webhook fired: `invoice.payment_failed`
- Database updated:
  - `status = 'past_due'`
- UI shows "Payment failed" warning
- User prompted to update payment method
- Pro features may be restricted (depending on grace period logic)

**Verification:**
- Check webhook logs for `invoice.payment_failed` event
- Database has `status = 'past_due'`

**Files to check:**
- `app/api/webhooks/stripe/route.ts:172-200` (payment_failed handler)

---

### Test 12: Webhook Idempotency

**Steps:**
1. Trigger any subscription event (e.g., new checkout)
2. In Stripe Dashboard → Developers → Webhooks
3. Find the event
4. Click "Resend" to send duplicate event

**Expected:**
- Second delivery returns `200 OK` immediately
- Console log: "Event {id} already processed, skipping"
- No duplicate database writes
- No errors or crashes

**Files to check:**
- `app/api/webhooks/stripe/route.ts:38-42` (idempotency check)
- `app/api/webhooks/stripe/route.ts:207` (marking event as processed)

---

### Test 13: Upgrade from Free to Pro

**Full User Journey:**
1. Sign up as new user (free tier)
2. Try to access Pro feature → see upgrade prompt
3. Click upgrade → redirected to pricing
4. Choose plan → checkout → payment
5. Return to app → now has Pro access

**Expected:**
- Seamless upgrade flow
- No data loss
- Pro features immediately accessible
- Profile shows Pro badge (if implemented)

---

### Test 14: Switching Plans (Monthly ↔ Annual)

**Steps:**
1. As user with monthly subscription
2. Open Stripe Customer Portal
3. Change plan to annual

**Expected:**
- Webhook fired: `customer.subscription.updated`
- Database updated:
  - `plan_type = 'annual'`
  - `stripe_price_id` updated to annual price
- UI reflects new plan immediately
- Prorated charge/credit applied

**Files to check:**
- `app/api/webhooks/stripe/route.ts:91-139` (subscription.updated)

---

## Phase 3: Error Handling Tests

### Test 15: Invalid Price ID

**Steps:**
1. Manually call `createCheckoutSession('invalid_price')`

**Expected:**
- Returns `{ success: false, error: 'Invalid price ID format' }`
- No Stripe API call made
- Console error logged with context

**Files to check:**
- `features/subscriptions/actions/subscription-actions.ts:88-92`

---

### Test 16: Missing Environment Variables

**Steps:**
1. Remove `NEXT_PUBLIC_APP_URL` from environment
2. Attempt checkout

**Expected:**
- Returns `{ success: false, error: 'Application URL not configured' }`
- Console error logged
- User sees friendly error message

**Files to check:**
- `features/subscriptions/actions/subscription-actions.ts:95-98`

---

### Test 17: Webhook Signature Verification Failure

**Steps:**
1. Send POST request to `/api/webhooks/stripe` with invalid signature
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/stripe \
     -H "stripe-signature: invalid" \
     -d '{}'
   ```

**Expected:**
- Returns `400 Bad Request`
- Response: `{ error: 'Invalid signature' }`
- Console log: "Webhook signature verification failed"
- Event NOT processed

**Files to check:**
- `app/api/webhooks/stripe/route.ts:27-36`

---

### Test 18: Database Write Failure During Webhook

**Steps:**
1. Temporarily break Supabase connection or permissions
2. Trigger subscription event

**Expected:**
- Webhook returns `500 Internal Server Error`
- Stripe retries the webhook (up to 3 days)
- Console error logged with full context
- No partial writes to database

**Files to check:**
- All webhook handlers check error after database operations
- Example: `app/api/webhooks/stripe/route.ts:83-86`

---

## Phase 4: Production Checklist

Before deploying to production:

- [ ] Stripe account switched to Live Mode
- [ ] Live mode API keys in production environment
- [ ] Production products created with correct pricing
- [ ] Production webhook endpoint configured
- [ ] Webhook endpoint HTTPS only (required by Stripe)
- [ ] Test full checkout flow in production
- [ ] Monitor webhook delivery success rate
- [ ] Set up error alerting for failed webhooks
- [ ] Test subscription cancellation in production
- [ ] Verify email notifications are sent (Stripe automatic emails)
- [ ] GDPR compliance: Add data export for user subscriptions
- [ ] Terms of Service and Refund Policy links added to checkout

---

## Stripe Test Cards

**Successful Payment:**
- `4242 4242 4242 4242` - Visa

**Payment Failures:**
- `4000 0000 0000 9995` - Declined (insufficient funds)
- `4000 0000 0000 0341` - Declined (requires authentication)

**3D Secure:**
- `4000 0025 0000 3155` - Requires 3D Secure authentication

Use any future expiry date, any 3-digit CVC, any billing ZIP code.

Full list: https://stripe.com/docs/testing

---

## Monitoring and Logging

**Key Metrics to Track:**
- Successful checkout rate
- Webhook delivery success rate
- Failed payment rate
- Subscription churn rate
- Average subscription lifetime

**Log Analysis:**
- Search for "Checkout session error" → checkout failures
- Search for "Webhook handler error" → processing failures
- Search for "Database error" → data consistency issues

**Stripe Dashboard:**
- Events → Monitor all webhook deliveries
- Subscriptions → Track active/canceled counts
- Payments → Monitor successful/failed payments

---

## Common Issues and Solutions

**Issue: Webhook not receiving events locally**
- Solution: Ensure Stripe CLI is running (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
- Verify webhook secret in `.env.local` matches CLI output

**Issue: "No subscription found" after checkout**
- Solution: Check webhook logs - ensure `checkout.session.completed` fired
- Verify webhook can write to Supabase (check admin client credentials)

**Issue: User shows as free tier despite active subscription**
- Solution: Check `useIsPro()` logic - requires both `status === 'active'` AND non-empty `stripe_subscription_id`
- Verify database has correct subscription row

**Issue: TypeScript errors about missing fields**
- Solution: Ensure `types/subscription.ts` matches database schema exactly
- Check that webhook handlers use correct field names

---

## Next Steps After Testing

Once all tests pass:

1. **Phase 3: Pro Features** - Implement the actual Pro features being gated
2. **Analytics** - Track conversion rates, churn, revenue
3. **Email Notifications** - Custom emails for subscription events
4. **Customer Support** - Tools to manage subscriptions for users
5. **Dunning** - Automated retry logic for failed payments (Stripe has built-in)
6. **Coupons/Trials** - Add promotional pricing options

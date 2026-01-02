# Portfolio Photos, Tools Owned & Lifetime Pro Design

**Date:** 2026-01-02
**Status:** Approved
**Features:** Portfolio Photos, Tools Owned Selection, Early Adopter Lifetime Pro

## Overview

This design adds three major features to worker profiles:

1. **Portfolio Photos** - Workers can upload work photos to showcase their skills (5 max for free, unlimited for Pro)
2. **Tools Owned** - Workers can indicate which power tools they own via trade-specific checklists
3. **Lifetime Pro** - Early adopters (first 50 workers, first 25 of each employer type) get free Pro for life

## Database Schema Changes

### 1. Profiles Table Updates

```sql
-- Add new fields to profiles table
ALTER TABLE profiles
  ADD COLUMN has_tools boolean DEFAULT false,
  ADD COLUMN tools_owned text[] DEFAULT '{}',
  ADD COLUMN is_lifetime_pro boolean DEFAULT false,
  ADD COLUMN lifetime_pro_granted_at timestamptz,
  ADD COLUMN lifetime_pro_granted_by uuid REFERENCES profiles(id);

-- Update employer_type enum
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_employer_type_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_employer_type_check
  CHECK (employer_type IN ('contractor', 'developer', 'homeowner', 'recruiter'));
```

### 2. New Table: Portfolio Images

```sql
CREATE TABLE portfolio_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  uploaded_at timestamptz DEFAULT now(),

  CONSTRAINT unique_user_order UNIQUE(user_id, display_order)
);

-- Index for fast lookups
CREATE INDEX idx_portfolio_images_user_id ON portfolio_images(user_id);

-- RLS Policies
ALTER TABLE portfolio_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Portfolio images are publicly viewable"
  ON portfolio_images FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own portfolio images"
  ON portfolio_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own portfolio images"
  ON portfolio_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own portfolio images"
  ON portfolio_images FOR DELETE
  USING (auth.uid() = user_id);
```

## Storage Configuration

### Supabase Storage Bucket

```sql
-- Create portfolio-images bucket (run via Supabase dashboard or migration)
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-images', 'portfolio-images', true);

-- RLS Policies for storage bucket
CREATE POLICY "Anyone can view portfolio images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio-images');

CREATE POLICY "Users can upload own portfolio images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own portfolio images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own portfolio images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'portfolio-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Upload Validation Rules

**Photo Limits:**
- Free users: Max 5 portfolio images
- Pro users: Unlimited
- Lifetime Pro users: Unlimited (treated as Pro)

**File Requirements:**
- Formats: JPEG, PNG, WebP
- Max size: 5MB per image
- Client-side compression target: <1MB
- Naming: `{userId}/{timestamp}-{random}.{ext}`

## Employer Types

Expanded from 2 to 4 types:

1. **Contractor** - Has licenses to contract their own jobs
2. **Developer** - Big projects, looking for contractors
3. **Homeowner** - Individuals with homes, need workers/contractors for repairs/renovations
4. **Recruiter** - Staffing agencies (existing)

## Tools Selection

### Tool Categories

Workers see tools organized by trade specialty:

**Always Visible:**
- General / Multi-Trade
- User's primary trade category (based on profile.trade/sub_trade)

**Expandable:**
- All other trade categories via "+ Select tools from other trades" button

### Complete Tools List by Category

**General / Multi-Trade:**
- Drills, Hammer Drills, Impact Drivers, Impact Wrenches, Rotary Tools, Heat Guns, Shop Vacs, Laser Levels, Work Lights, Air Compressors, Common Hand Tools

**Carpentry / Framing:**
- Circular Saws, Worm-Drive Saws, Miter Saws, Table Saws, Sawzall, Framing Nailers, Brad Nailers, Pin Nailers, Power Planers, Track Saws, Panel Saws

**Finish Carpentry / Trim:**
- Miter Saws (Fine-Cut), Finish Nailers, Brad Nailers, Pin Nailers, Routers, Laminate Trimmers, Random Orbital Sanders, Detail Sanders, Electric Staplers, Power Caulking Guns

**Woodworking / Cabinetry:**
- Table Saws, Band Saws, Scroll Saws, Jointers, Thickness Planers, Routers, CNC Routers, Drill Presses, Wood Lathes, Mortisers, Dust Collectors, Sharpening Systems

**Metalworking / Fabrication:**
- Angle Grinders, Bench Grinders, Die Grinders, Band Saws (Metal), Drill Presses, Plasma Cutters, Oxy-Acetylene Torches, MIG Welders, TIG Welders, Stick Welders, Metal Lathes, Milling Machines

**Concrete / Masonry:**
- Rotary Hammers, Demolition Hammers, Jackhammers, Concrete Saws, Wet Tile Saws, Wall Chasers, Power Trowels, Concrete Vibrators, Rebar Cutters, Rebar Benders

**Electrical:**
- Hammer Drills, Rotary Hammers, Cable Pullers, Electric Conduit Benders, Mag Drills, Knockout Punches (Powered), Power Fish Tapes, Wire Strippers (Powered), Power Screwdrivers

**Plumbing / Pipefitting:**
- Pipe Cutters (Powered), Pipe Threaders, Pipe Benders, Power Augers, Drain Snakes, Press Tools (PEX/Copper), Sawzall, Inspection Cameras

**HVAC / Sheet Metal:**
- Power Shears, Nibblers, Seamers (Powered), Crimpers, Duct Cutters, Angle Grinders, Core Drills, Vacuum Pumps (Electric), Flaring Tools (Powered)

**Drywall / Painting:**
- Auto-Feed Screw Guns, Drywall Sanders (Pole Sanders), Texture Sprayers, Airless Paint Sprayers, Power Mixers, Electric Staplers

**Flooring:**
- Floor Sanders, Edge Sanders, Tile Saws, Power Scrapers, Heat Guns, Adhesive Spreaders (Powered), Oscillating Multi-Tools

**Landscaping / Outdoor:**
- Chainsaws, Pole Saws, Hedge Trimmers, Leaf Blowers, Pressure Washers, Earth Augers, Log Splitters, Lawn Edgers

**Automotive / Mechanical:**
- Impact Wrenches, Electric Ratchets, Die Grinders, Polishers, Sanders, Tire Changers (Powered), Brake Lathes, Engine Hoists (Electric)

### Storage

Tools are stored as a flat `text[]` array in the profiles table. Categories are only used for selection UI, not for storage or display.

## Early Adopter Lifetime Pro

### Quotas

- **Workers:** First 50 by `created_at`
- **Contractors:** First 25 by `created_at`
- **Developers:** First 25 by `created_at`
- **Homeowners:** First 25 by `created_at`
- **Recruiters:** First 25 by `created_at`

**Total:** 150 lifetime Pro users

### Implementation

**Auto-grant via migration script:**
- Queries users by role/employer_type ordered by `created_at ASC`
- Sets `is_lifetime_pro = true` for first N users
- Records `lifetime_pro_granted_at` timestamp

**Admin manual grant/revoke:**
- Admin dashboard action to grant/revoke
- Logs to `admin_activity_log` table
- Records `lifetime_pro_granted_by` admin ID

### Subscription Logic

**Helper function:**
```typescript
function hasProAccess(profile: Profile): boolean {
  return profile.is_lifetime_pro || profile.subscription_status === 'pro';
}
```

**Replace all subscription checks with helper throughout codebase**

**Stripe webhook protection:**
- Check `is_lifetime_pro` before updating subscription_status
- Skip downgrades for lifetime Pro users
- Allow them to cancel Stripe subscriptions without losing access

### Display

**Badge:** "Founding Member" with purple-to-pink gradient background and star icon

## Public Profile Structure

### Tab Navigation

Worker public profiles have 6 tabs:

1. **About** - Bio, trade, location, years of experience, tools owned, skills
2. **Portfolio** - Work photos in grid layout
3. **Experience/Resume** - Work history
4. **Education** - Educational background
5. **Certifications** - Verified credentials with photos
6. **References** - Professional references

### Visibility

- All tabs publicly viewable by everyone
- No authentication required to view worker profiles

## Profile Editing Structure

### Tab Navigation

Worker profile editing has 4 tabs:

1. **Basic Info** - Name, phone, trade, location, bio, tools selector
2. **Portfolio** - Upload/delete/reorder photos
3. **Experience** - Work history management
4. **Certifications** - Upload certifications

## Implementation Checklist

### Phase 1: Database & Storage
- [ ] Create migration: Add fields to profiles table (has_tools, tools_owned, is_lifetime_pro, etc.)
- [ ] Create migration: Update employer_type constraint
- [ ] Create migration: Create portfolio_images table
- [ ] Create migration: Create portfolio-images storage bucket
- [ ] Create migration: Add RLS policies for portfolio_images table
- [ ] Create migration: Add RLS policies for portfolio-images bucket
- [ ] Update lib/types/profile.types.ts with new fields

### Phase 2: Server Actions
- [ ] Create features/portfolio/actions/portfolio-actions.ts
  - uploadPortfolioPhoto()
  - deletePortfolioPhoto()
  - reorderPortfolioPhotos()
- [ ] Create lib/utils/subscription.ts helper functions
  - hasProAccess()
  - isLifetimePro()
  - getSubscriptionBadge()
- [ ] Update features/profile/actions/profile-actions.ts
  - Add updateToolsOwned() action
- [ ] Create features/admin/actions/lifetime-pro-actions.ts
  - grantLifetimePro()
  - revokeLifetimePro()
- [ ] Update all existing actions to use hasProAccess() helper
- [ ] Update Stripe webhook handler to protect lifetime Pro users

### Phase 3: UI Components
- [ ] Create features/portfolio/components/portfolio-manager.tsx
- [ ] Create features/profile/components/tools-selector.tsx
- [ ] Create features/profiles/components/public-profile-tabs.tsx
- [ ] Create features/profile/components/profile-edit-tabs.tsx
- [ ] Create components/common/subscription-badge.tsx
- [ ] Update features/profile/components/profile-edit-form.tsx (integrate ToolsSelector)

### Phase 4: Routes & Pages
- [ ] Update app/dashboard/profile/edit/page.tsx to use ProfileEditTabs
- [ ] Update worker public profile to use PublicProfileTabs
- [ ] Add admin UI for granting lifetime Pro (optional)

### Phase 5: Early Adopter Script
- [ ] Create scripts/grant-early-adopter-pro.ts
- [ ] Run script to grant initial lifetime Pro users
- [ ] Verify grants in database

### Phase 6: Testing
- [ ] Write component tests for PortfolioManager
- [ ] Write component tests for ToolsSelector
- [ ] Write unit tests for subscription helpers
- [ ] Write E2E tests for portfolio uploads
- [ ] Write E2E tests for tools selection
- [ ] Write E2E tests for lifetime Pro badges
- [ ] Test Stripe webhook protection for lifetime Pro

### Phase 7: Dependencies
- [ ] Install @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- [ ] Verify browser-image-compression is installed

## Migration Order

Run migrations in this exact order:

1. `XXX_add_profile_tools_and_lifetime_pro.sql` - Profile table updates
2. `XXX_update_employer_type_constraint.sql` - Employer types
3. `XXX_create_portfolio_images_table.sql` - Portfolio table
4. `XXX_create_portfolio_storage_bucket.sql` - Storage bucket (via Supabase dashboard)
5. `XXX_add_portfolio_rls_policies.sql` - RLS policies

## Key Considerations

### Storage Costs
- Monitor portfolio-images bucket size
- Pro users with unlimited uploads could accumulate significant storage
- Client-side compression helps minimize costs (target <1MB per image)

### Performance
- Portfolio images use display_order for sorting
- Index on portfolio_images.user_id for fast lookups
- Public profile tabs lazy-load data via React Query

### Lifetime Pro Protection
- Webhook handler checks is_lifetime_pro before any subscription updates
- Helper function centralizes all Pro access checks
- Admin activity log tracks all lifetime Pro grants/revokes

### Tools Data Structure
- Stored as simple text array (not categorized in DB)
- Categories only used in UI for selection
- Display is flat list for simplicity

### Employer Types
- Ensure all signup flows handle new types (developer, homeowner)
- Update any employer-type-specific logic
- Job posting restrictions may need updates

## Post-Implementation Tasks

- [ ] Monitor early adopter counts (ensure exactly 50/25/25/25/25)
- [ ] Test storage bucket permissions in production
- [ ] Verify image compression is working (check uploaded file sizes)
- [ ] Update documentation with new employer types
- [ ] Add analytics tracking for portfolio uploads
- [ ] Consider adding "Featured Work" option (pin 1-3 portfolio images to top)

## Design Decisions

**Why unlimited for Pro instead of 10-15?**
- Simplifies messaging ("unlimited" is clearer than arbitrary limits)
- Storage costs are manageable with compression
- Differentiates Pro more strongly from Free

**Why flat list for tools display instead of categorized?**
- Simpler UI on public profile
- Easier to scan quickly
- Categories are helpful for selection but not viewing

**Why Option C (primary + additional categories) for tools selection?**
- Balances simplicity with flexibility
- Most workers only need their trade's tools
- Cross-trade workers can still select from other categories
- Reduces cognitive load by showing relevant tools first

**Why 50 workers vs 25 for employers?**
- Workers are the supply side (need more early adopters)
- Encourages worker signups first to build supply
- Employers will follow once worker base is established

**Why "Founding Member" instead of "Lifetime Pro"?**
- More prestigious and exclusive feeling
- Emphasizes early supporter status
- Creates community identity

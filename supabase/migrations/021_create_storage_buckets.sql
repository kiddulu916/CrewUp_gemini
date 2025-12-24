-- ============================================================================
-- STORAGE BUCKET CREATION
-- ============================================================================
--
-- This migration creates the storage buckets only.
-- Storage policies must be created via the Supabase Dashboard due to permission requirements.
--
-- After running this migration, create policies via Dashboard > Storage > Policies
-- See STORAGE_POLICIES.md for the exact policies to create.
--
-- ============================================================================

-- Create application-drafts bucket with file constraints
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'application-drafts',
  'application-drafts',
  false,
  10485760, -- 10MB in bytes
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Create applications bucket with file constraints
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'applications',
  'applications',
  false,
  10485760, -- 10MB in bytes
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Note: Storage RLS policies must be created via the Supabase Dashboard
-- Navigate to: Dashboard > Storage > [bucket name] > Policies
-- See crewup/supabase/STORAGE_POLICIES.md for policy definitions

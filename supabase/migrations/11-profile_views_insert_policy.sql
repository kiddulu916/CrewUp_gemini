-- Migration: Add INSERT policy for profile_views table
-- Allow authenticated users to insert profile view records

-- Profile Views: Anyone authenticated can insert views (except self-views which are prevented in application code)
CREATE POLICY "Authenticated users can insert profile views" ON "public"."profile_views"
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND auth.uid() = viewer_id
        AND auth.uid() != viewed_profile_id
    );

-- Add profile_image_url column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.profile_image_url IS 'Public URL of user profile picture from Supabase Storage';

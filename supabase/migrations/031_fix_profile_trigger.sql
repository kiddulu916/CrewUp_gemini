-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved trigger function with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_email TEXT;
BEGIN
  -- Get name from metadata or generate placeholder
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    'User-' || substring(NEW.id::text, 1, 8)
  );

  -- Get email
  user_email := COALESCE(NEW.email, 'no-email@krewup.com');

  -- Insert profile with all required fields
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    subscription_status,
    trade,
    location,
    bio,
    phone,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    user_email,
    user_name,
    'worker',
    'free',
    'General Laborer',
    'Update your location',
    'Ready to work hard and learn new skills on site!',
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create trigger on_auth_user_created';
  END IF;
END $$;

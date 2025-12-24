-- Add missing columns to certifications table
-- These columns are required for the certification verification feature

ALTER TABLE certifications
ADD COLUMN IF NOT EXISTS certification_number TEXT NULL,
ADD COLUMN IF NOT EXISTS issued_by TEXT NULL,
ADD COLUMN IF NOT EXISTS issue_date DATE NULL;

-- Rename image_url to photo_url for consistency with code
ALTER TABLE certifications
RENAME COLUMN image_url TO photo_url;

-- Add comments
COMMENT ON COLUMN certifications.certification_number IS 'Certification/license number for verification purposes';
COMMENT ON COLUMN certifications.issued_by IS 'Organization that issued the certification';
COMMENT ON COLUMN certifications.issue_date IS 'Date when certification was issued';
COMMENT ON COLUMN certifications.photo_url IS 'URL to uploaded certification photo for verification';

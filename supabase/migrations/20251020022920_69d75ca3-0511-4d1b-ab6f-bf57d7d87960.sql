-- Remove title column from published_poems table
ALTER TABLE published_poems DROP COLUMN IF EXISTS title;

-- Remove title column from saved_poems table
ALTER TABLE saved_poems DROP COLUMN IF EXISTS title;

-- Migration: Add supplier_name column to supplier_ratings table
-- Date: $(date)

-- Add supplier_name column to supplier_ratings table
ALTER TABLE supplier_ratings 
ADD COLUMN IF NOT EXISTS supplier_name TEXT;

-- Populate existing records with supplier names
UPDATE supplier_ratings 
SET supplier_name = s.name 
FROM suppliers s 
WHERE supplier_ratings.supplier_id = s.id 
AND supplier_ratings.supplier_name IS NULL;

-- Create index for better performance on supplier name searches
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier_name ON supplier_ratings(supplier_name);

-- Add comment
COMMENT ON COLUMN supplier_ratings.supplier_name IS 'Cached supplier name for performance and historical integrity';

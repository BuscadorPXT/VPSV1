
-- Migration: Add approval system to supplier ratings
-- Date: 2025-01-15

-- Add approval fields to supplier_ratings table
ALTER TABLE supplier_ratings 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Create index for better performance on approval queries
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_approval ON supplier_ratings(is_approved, created_at);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_approved_by ON supplier_ratings(approved_by);

-- Update existing ratings to be approved (for backward compatibility)
UPDATE supplier_ratings SET is_approved = true WHERE is_approved = false;

-- Update the aggregation function to only consider approved ratings
CREATE OR REPLACE FUNCTION update_supplier_rating_aggregates(supplier_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE suppliers 
  SET 
    average_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM supplier_ratings 
      WHERE supplier_id = supplier_id_param AND is_approved = true
    ), 0.00),
    rating_count = COALESCE((
      SELECT COUNT(*)
      FROM supplier_ratings 
      WHERE supplier_id = supplier_id_param AND is_approved = true
    ), 0)
  WHERE id = supplier_id_param;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN supplier_ratings.is_approved IS 'Whether the rating has been approved by an admin';
COMMENT ON COLUMN supplier_ratings.approved_by IS 'ID of the admin who approved the rating';
COMMENT ON COLUMN supplier_ratings.approved_at IS 'When the rating was approved';

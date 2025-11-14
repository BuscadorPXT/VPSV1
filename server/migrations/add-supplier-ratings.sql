
-- Migration: Add supplier ratings system
-- Date: $(date)

-- Add rating fields to suppliers table
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Create supplier_ratings table
CREATE TABLE IF NOT EXISTS supplier_ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, supplier_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_user_id ON supplier_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ratings_supplier_id ON supplier_ratings(supplier_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_average_rating ON suppliers(average_rating);

-- Function to update supplier rating aggregates
CREATE OR REPLACE FUNCTION update_supplier_rating_aggregates(supplier_id_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE suppliers 
  SET 
    average_rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM supplier_ratings 
      WHERE supplier_id = supplier_id_param
    ), 0.00),
    rating_count = COALESCE((
      SELECT COUNT(*)
      FROM supplier_ratings 
      WHERE supplier_id = supplier_id_param
    ), 0)
  WHERE id = supplier_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update aggregates when ratings change
CREATE OR REPLACE FUNCTION trigger_update_supplier_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_supplier_rating_aggregates(NEW.supplier_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_supplier_rating_aggregates(OLD.supplier_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS supplier_rating_aggregates_trigger ON supplier_ratings;
CREATE TRIGGER supplier_rating_aggregates_trigger
  AFTER INSERT OR UPDATE OR DELETE ON supplier_ratings
  FOR EACH ROW EXECUTE FUNCTION trigger_update_supplier_aggregates();

COMMENT ON TABLE supplier_ratings IS 'User ratings and reviews for suppliers';
COMMENT ON COLUMN supplier_ratings.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN suppliers.average_rating IS 'Calculated average rating from all user reviews';
COMMENT ON COLUMN suppliers.rating_count IS 'Total number of ratings received';

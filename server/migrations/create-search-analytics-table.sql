
-- Create search analytics table for tracking popular searches
CREATE TABLE IF NOT EXISTS search_analytics (
  id SERIAL PRIMARY KEY,
  query VARCHAR(255) NOT NULL,
  user_id INTEGER,
  searched_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_searched_at ON search_analytics(searched_at);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query_date ON search_analytics(query, searched_at);

-- Add foreign key constraint if users table exists
-- ALTER TABLE search_analytics ADD CONSTRAINT fk_search_analytics_user_id 
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

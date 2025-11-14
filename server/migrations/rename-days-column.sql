
-- Rename column from days_without_payment to days_until_renewal
-- and update the logic to calculate days until renewal instead of days without payment

-- First, rename the column
ALTER TABLE subscription_management 
RENAME COLUMN days_without_payment TO days_until_renewal;

-- Update existing records to calculate days until renewal
-- (This will recalculate based on renewal_date - current_date)
UPDATE subscription_management 
SET days_until_renewal = CASE 
  WHEN renewal_date IS NOT NULL THEN 
    (DATE(renewal_date) - CURRENT_DATE)
  ELSE 0 
END;

-- Update the comment for the column
COMMENT ON COLUMN subscription_management.days_until_renewal IS 'Days until subscription renewal (negative if expired)';

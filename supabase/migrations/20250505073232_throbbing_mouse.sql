/*
  # Fix item status history permissions

  1. Changes
    - Update RLS policies for item_status_history table
    - Allow public users to insert and view history records
    - Fix status transition handling
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view item history" ON item_status_history;
DROP POLICY IF EXISTS "Anyone can insert item history" ON item_status_history;

-- Create new policies with proper permissions
CREATE POLICY "Anyone can view item history"
  ON item_status_history
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert item history"
  ON item_status_history
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Update status transition function to handle all cases
CREATE OR REPLACE FUNCTION check_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the status change is valid
  IF OLD.status = 'found' AND NEW.status NOT IN ('pending', 'claimed') THEN
    RAISE EXCEPTION 'Invalid status transition from found to %', NEW.status;
  END IF;
  
  IF OLD.status = 'pending' AND NEW.status NOT IN ('found', 'claimed') THEN
    RAISE EXCEPTION 'Invalid status transition from pending to %', NEW.status;
  END IF;
  
  IF OLD.status = 'claimed' THEN
    RAISE EXCEPTION 'Cannot change status of claimed items';
  END IF;

  -- Ensure claim details are provided when needed
  IF NEW.status IN ('pending', 'claimed') AND (NEW.claimed_by IS NULL OR NEW.claimed_at IS NULL) THEN
    RAISE EXCEPTION 'Claim details are required';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
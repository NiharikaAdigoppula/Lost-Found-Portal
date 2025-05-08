/*
  # Fix claim submission and status handling

  1. Changes
    - Add trigger to prevent concurrent claims
    - Add constraint to ensure valid status transitions
    - Add validation for claim details
    
  2. Security
    - Maintain existing RLS policies
    - Add additional checks for status updates
*/

-- Add constraint to ensure valid status transitions
CREATE OR REPLACE FUNCTION check_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the status change is valid
  IF OLD.status = 'found' AND NEW.status NOT IN ('pending', 'claimed') THEN
    RAISE EXCEPTION 'Invalid status transition from found to %', NEW.status;
  END IF;
  
  IF OLD.status = 'pending' AND NEW.status NOT IN ('claimed') THEN
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

-- Create trigger for status transition validation
DROP TRIGGER IF EXISTS validate_status_transition ON lost_found_items;
CREATE TRIGGER validate_status_transition
  BEFORE UPDATE ON lost_found_items
  FOR EACH ROW
  EXECUTE FUNCTION check_status_transition();

-- Add function to prevent concurrent claims
CREATE OR REPLACE FUNCTION prevent_concurrent_claims()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND EXISTS (
    SELECT 1 FROM lost_found_items 
    WHERE id = NEW.id 
    AND status != 'found'
  ) THEN
    RAISE EXCEPTION 'Item is no longer available for claiming';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for concurrent claim prevention
DROP TRIGGER IF EXISTS check_concurrent_claims ON lost_found_items;
CREATE TRIGGER check_concurrent_claims
  BEFORE UPDATE ON lost_found_items
  FOR EACH ROW
  EXECUTE FUNCTION prevent_concurrent_claims();
/*
  # Fix item status history RLS policies

  1. Changes
    - Add insert policy for item_status_history table
    - Allow public users to insert history records
*/

-- Add policy to allow public users to insert history records
CREATE POLICY "Anyone can insert item history"
  ON item_status_history
  FOR INSERT
  TO public
  WITH CHECK (true);
/*
  # Add claim history tracking

  1. New Tables
    - `item_status_history`
      - `id` (uuid, primary key)
      - `item_id` (uuid, references lost_found_items)
      - `old_status` (text)
      - `new_status` (text)
      - `changed_by` (text)
      - `changed_at` (timestamp)
      - `notes` (text)

  2. Changes
    - Add trigger to automatically track status changes
    - Add function to handle status history updates
*/

-- Create the history table
CREATE TABLE IF NOT EXISTS item_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES lost_found_items(id),
  old_status text,
  new_status text,
  changed_by text,
  changed_at timestamptz DEFAULT now(),
  notes text
);

-- Enable RLS on history table
ALTER TABLE item_status_history ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing history
CREATE POLICY "Anyone can view item history"
  ON item_status_history
  FOR SELECT
  TO public
  USING (true);

-- Create function to handle status changes
CREATE OR REPLACE FUNCTION handle_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO item_status_history (
      item_id,
      old_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.claimed_by,
      CASE 
        WHEN NEW.status = 'pending' THEN 'Item claimed by user'
        WHEN NEW.status = 'claimed' THEN 'Claim confirmed by finder'
        ELSE 'Status updated'
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status changes
CREATE TRIGGER track_status_changes
  AFTER UPDATE ON lost_found_items
  FOR EACH ROW
  EXECUTE FUNCTION handle_status_change();
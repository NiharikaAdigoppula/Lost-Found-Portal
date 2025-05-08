/*
  # Add claim management and category fields

  1. Changes
    - Add claimed_by column for tracking who claimed an item
    - Add claimed_at timestamp for when the item was claimed
    - Add category field for better item organization
    - Update status check constraint to include 'pending' status
    
  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE lost_found_items
ADD COLUMN IF NOT EXISTS claimed_by text,
ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
ADD COLUMN category text NOT NULL DEFAULT 'others' CHECK (category IN ('electronics', 'documents', 'accessories', 'others'));

-- Update the status check constraint to include 'pending'
ALTER TABLE lost_found_items
DROP CONSTRAINT IF EXISTS lost_found_items_status_check;

ALTER TABLE lost_found_items
ADD CONSTRAINT lost_found_items_status_check 
CHECK (status IN ('found', 'claimed', 'pending'));
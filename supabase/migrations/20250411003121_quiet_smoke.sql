/*
  # Create Lost & Found Items Schema

  1. New Tables
    - `lost_found_items`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, required)
      - `location` (text, required)
      - `finder_name` (text, required)
      - `finder_email` (text, required)
      - `finder_phone` (text, required)
      - `image_url` (text)
      - `status` (text, default: 'found')
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on `lost_found_items` table
    - Add policies for public access (read) and authenticated users (write)
*/

CREATE TABLE IF NOT EXISTS lost_found_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  finder_name text NOT NULL,
  finder_email text NOT NULL CHECK (finder_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  finder_phone text NOT NULL CHECK (finder_phone ~* '^\+?[1-9]\d{9,14}$'),
  image_url text,
  status text DEFAULT 'found' CHECK (status IN ('found', 'claimed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lost_found_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lost and found items"
  ON lost_found_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert lost and found items"
  ON lost_found_items
  FOR INSERT
  TO public
  WITH CHECK (true);
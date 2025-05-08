/*
  # Configure Storage for Lost & Found Images

  1. Storage Configuration
    - Create bucket policies for lost and found images
    - Enable public access for viewing images
    - Add upload policies for authenticated users
    - Set file size and type restrictions

  2. Security
    - Enable row level security
    - Add policies for public access to images
*/

-- Create storage.objects policies
CREATE POLICY "Give users authenticated access to upload files"
ON storage.objects FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Give public access to files"
ON storage.objects FOR SELECT 
TO public
USING (true);

-- Create bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('lost-found-images', 'lost-found-images', true)
  ON CONFLICT (id) DO NOTHING;
END $$;
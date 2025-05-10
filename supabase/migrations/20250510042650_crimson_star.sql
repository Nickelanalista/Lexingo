/*
  # Add avatar storage and profile management features
  
  1. Storage
    - Create avatars bucket for profile pictures
    - Set up storage policies
  
  2. Security
    - Enable storage access for authenticated users
*/

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);

-- Set up storage policies
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (ARRAY[auth.uid()]::text[] <@ string_to_array(name, '/'))
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (ARRAY[auth.uid()]::text[] <@ string_to_array(name, '/'))
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (ARRAY[auth.uid()]::text[] <@ string_to_array(name, '/'))
  );
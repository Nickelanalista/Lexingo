/*
  # Add INSERT policy for profiles table
  
  1. Security Changes
    - Add policy to allow authenticated users to create their own profile
    - Policy ensures:
      - User can only create a profile with their own auth.uid()
      - Email must match their auth.email()
*/

-- Create INSERT policy for profiles
CREATE POLICY "Users can create own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id AND 
    auth.email() = email
  );
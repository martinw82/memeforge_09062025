/*
  # Add Comments System

  1. New Tables
    - `comments`
      - `id` (uuid, primary key)
      - `meme_id` (uuid, foreign key to memes.id)
      - `user_id` (uuid, foreign key to auth.users.id)
      - `content` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `comments` table
    - Add policy for authenticated users to insert comments
    - Add policy for all users to read comments
    - Add policy for users to delete their own comments

  3. Performance
    - Add indexes for meme_id and created_at
    - Add content length validation
*/

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_id uuid REFERENCES memes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 1000),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policies for comments table
CREATE POLICY "Comments are publicly readable"
  ON comments
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_meme_id ON comments(meme_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
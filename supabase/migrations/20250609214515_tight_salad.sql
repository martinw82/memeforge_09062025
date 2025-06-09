/*
  # Create memes table and related tables

  1. New Tables
    - `memes`
      - `id` (uuid, primary key)
      - `image_url` (text, not null)
      - `name` (text, not null)
      - `description` (text)
      - `creator_id` (uuid, references auth.users.id)
      - `created_at` (timestamp)
      - `likes_count` (integer, default 0)
      - `is_nft` (boolean, default false)
      - `nft_tx_hash` (text, unique)
      - `chain_type` (varchar, default 'algorand')
      - `chain_id` (varchar)
      - `contract_address` (varchar)
      - `top_text` (text)
      - `bottom_text` (text)
    - `likes`
      - `user_id` (uuid, references auth.users.id)
      - `meme_id` (uuid, references memes.id)
      - `created_at` (timestamp)
    - `saves`
      - `user_id` (uuid, references auth.users.id)
      - `meme_id` (uuid, references memes.id)
      - `created_at` (timestamp)
    - `user_blockchain_preferences`
      - `user_id` (uuid, references auth.users.id)
      - `preferred_chain` (varchar, default 'algorand')
      - `algorand_wallet_type` (varchar)
      - `evm_wallet_type` (varchar)
      - `wallet_address` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Public read access for memes
*/

-- Create memes table
CREATE TABLE IF NOT EXISTS memes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  name text NOT NULL,
  description text,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  likes_count integer DEFAULT 0,
  is_nft boolean DEFAULT false,
  nft_tx_hash text UNIQUE,
  chain_type varchar(20) DEFAULT 'algorand',
  chain_id varchar(50),
  contract_address varchar(100),
  top_text text,
  bottom_text text
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meme_id uuid REFERENCES memes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, meme_id)
);

-- Create saves table
CREATE TABLE IF NOT EXISTS saves (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meme_id uuid REFERENCES memes(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, meme_id)
);

-- Create user_blockchain_preferences table
CREATE TABLE IF NOT EXISTS user_blockchain_preferences (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  preferred_chain varchar(20) DEFAULT 'algorand',
  algorand_wallet_type varchar(50),
  evm_wallet_type varchar(50),
  wallet_address text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE memes ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blockchain_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for memes table
CREATE POLICY "Memes are publicly readable"
  ON memes
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can create their own memes"
  ON memes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own memes"
  ON memes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own memes"
  ON memes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- Policies for likes table
CREATE POLICY "Users can read all likes"
  ON likes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own likes"
  ON likes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for saves table
CREATE POLICY "Users can read their own saves"
  ON saves
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own saves"
  ON saves
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for user_blockchain_preferences table
CREATE POLICY "Users can read their own preferences"
  ON user_blockchain_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences"
  ON user_blockchain_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memes_creator_id ON memes(creator_id);
CREATE INDEX IF NOT EXISTS idx_memes_created_at ON memes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memes_likes_count ON memes(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_likes_meme_id ON likes(meme_id);
CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_meme_id ON saves(meme_id);

-- Function to update likes count
CREATE OR REPLACE FUNCTION update_meme_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE memes SET likes_count = likes_count + 1 WHERE id = NEW.meme_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE memes SET likes_count = likes_count - 1 WHERE id = OLD.meme_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update likes count
DROP TRIGGER IF EXISTS trigger_update_meme_likes_count ON likes;
CREATE TRIGGER trigger_update_meme_likes_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_meme_likes_count();
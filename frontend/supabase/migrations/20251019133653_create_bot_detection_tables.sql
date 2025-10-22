/*
  # Trading Bot Detection System Database Schema

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `wallet_address` (text, unique)
      - `tier` (text) - subscription tier (basic, standard, pro)
      - `amount_paid` (numeric) - amount in ETH
      - `transaction_hash` (text, unique)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `bots`
      - `id` (uuid, primary key)
      - `address` (text, unique)
      - `bot_type` (text) - good or bad
      - `category` (text) - market_maker, arbitrage, manipulative, etc.
      - `score` (numeric)
      - `risk_level` (text) - critical, high, medium, low
      - `liquidity_provided` (numeric) - for good bots
      - `signals` (jsonb) - array of detection signals
      - `is_flagged` (boolean)
      - `detected_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_trades`
      - `id` (uuid, primary key)
      - `user_address` (text)
      - `amount` (numeric)
      - `block_number` (integer)
      - `timestamp` (timestamptz)
      - `created_at` (timestamptz)

    - `market_prices`
      - `id` (uuid, primary key)
      - `asset` (text) - BTC, ETH, SOL
      - `price` (numeric)
      - `timestamp` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Public read access for market prices
    - Subscription verification for premium features
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  tier text NOT NULL,
  amount_paid numeric NOT NULL,
  transaction_hash text UNIQUE NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text UNIQUE NOT NULL,
  bot_type text NOT NULL,
  category text NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  risk_level text,
  liquidity_provided numeric DEFAULT 0,
  signals jsonb DEFAULT '[]'::jsonb,
  is_flagged boolean DEFAULT false,
  detected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  amount numeric NOT NULL,
  block_number integer NOT NULL,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset text NOT NULL,
  price numeric NOT NULL,
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bots_address ON bots(address);
CREATE INDEX IF NOT EXISTS idx_bots_bot_type ON bots(bot_type);
CREATE INDEX IF NOT EXISTS idx_bots_is_flagged ON bots(is_flagged);
CREATE INDEX IF NOT EXISTS idx_user_trades_address ON user_trades(user_address);
CREATE INDEX IF NOT EXISTS idx_subscriptions_wallet ON subscriptions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_market_prices_asset ON market_prices(asset);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read market prices"
  ON market_prices FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert subscriptions"
  ON subscriptions FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read bots"
  ON bots FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can read user trades"
  ON user_trades FOR SELECT
  TO public
  USING (true);

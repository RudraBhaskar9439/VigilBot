import { createClient } from '@supabase/supabase-js';
// Remove 'import dotenv from "dotenv";'
// Remove 'dotenv.config();'

// Access environment variables using import.meta.env with the correct prefix
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables! Make sure they are correctly prefixed (e.g., VITE_SUPABASE_URL) and defined in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Subscription {
  id: string;
  wallet_address: string;
  tier: string;
  amount_paid: number;
  transaction_hash: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bot {
  id: string;
  address: string;
  bot_type: string;
  category: string;
  score: number;
  risk_level?: string;
  liquidity_provided: number;
  signals: any[];
  is_flagged: boolean;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserTrade {
  id: string;
  user_address: string;
  amount: number;
  block_number: number;
  timestamp: string;
  created_at: string;
}

export interface MarketPrice {
  id: string;
  asset: string;
  price: number;
  timestamp: string;
  created_at: string;
}
/**
 * Test Supabase Connection and Subscription Operations
 * 
 * Run this script to verify your Supabase setup:
 * npx tsx src/scripts/testSupabaseConnection.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env file
function loadEnvVariables() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    console.log('💡 Create a .env file in the frontend directory with:');
    console.log('   VITE_SUPABASE_URL=your_supabase_url');
    console.log('   VITE_SUPABASE_ANON_KEY=your_anon_key');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars: Record<string, string> = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

const env = loadEnvVariables();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file!');
  console.log('💡 Make sure your .env file contains:');
  console.log('   VITE_SUPABASE_URL=your_supabase_url');
  console.log('   VITE_SUPABASE_ANON_KEY=your_anon_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  try {
    // Test 1: Check Supabase connection
    console.log('1️⃣ Testing database connection...');
    const { error } = await supabase.from('subscriptions').select('count');
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.log('\n💡 Make sure you have:');
      console.log('   - Run the migration SQL in Supabase dashboard');
      console.log('   - Set VITE_SUPABASE_URL in your .env file');
      console.log('   - Set VITE_SUPABASE_ANON_KEY in your .env file');
      return;
    }
    
    console.log('✅ Connection successful!\n');

    // Test 2: Check if tables exist
    console.log('2️⃣ Checking if subscriptions table exists...');
    const { error: tableError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table check failed:', tableError.message);
      console.log('\n💡 Run the migration SQL from:');
      console.log('   frontend/supabase/migrations/20251019133653_create_bot_detection_tables.sql');
      return;
    }
    
    console.log('✅ Subscriptions table exists!\n');

    // Test 3: Get subscription count
    console.log('3️⃣ Counting subscriptions...');
    const { data: allSubs, error: countError } = await supabase
      .from('subscriptions')
      .select('*');
    
    if (countError) {
      console.error('❌ Failed to count subscriptions:', countError.message);
    } else {
      console.log(`✅ Found ${allSubs?.length || 0} subscriptions\n`);
    }

    // Test 4: Create a test subscription
    console.log('4️⃣ Creating test subscription...');
    const testWallet = '0xtest' + Date.now();
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    try {
      const { data: testSub, error: insertError } = await supabase
        .from('subscriptions')
        .insert([{
          wallet_address: testWallet.toLowerCase(),
          tier: 'basic',
          amount_paid: 0,
          transaction_hash: 'TEST_' + Date.now(),
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
          is_active: true,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      console.log('✅ Test subscription created:');
      console.log(`   ID: ${testSub.id}`);
      console.log(`   Wallet: ${testSub.wallet_address}`);
      console.log(`   Tier: ${testSub.tier}`);
      console.log(`   Active: ${testSub.is_active}\n`);

      // Test 5: Retrieve the test subscription
      console.log('5️⃣ Retrieving test subscription...');
      const { data: retrieved, error: selectError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('wallet_address', testWallet.toLowerCase())
        .single();
      
      if (selectError) {
        console.log('❌ Failed to retrieve subscription:', selectError.message);
      } else if (retrieved) {
        console.log('✅ Subscription retrieved successfully!\n');
      }

      // Test 6: Check if subscription is valid
      console.log('6️⃣ Validating subscription...');
      const isValid = retrieved && retrieved.is_active && new Date(retrieved.end_date) > new Date();
      console.log(`✅ Subscription valid: ${isValid}\n`);

      // Test 7: Clean up test data
      console.log('7️⃣ Cleaning up test data...');
      const { error: deleteError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('wallet_address', testWallet.toLowerCase());
      
      if (deleteError) {
        console.error('❌ Failed to delete test subscription:', deleteError.message);
      } else {
        console.log('✅ Test subscription deleted\n');
      }

    } catch (err: any) {
      console.error('❌ Test subscription operations failed:', err.message);
      console.log('\n💡 Check your RLS policies in Supabase dashboard');
    }

    console.log('🎉 All tests completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('   1. Check SUPABASE_SUBSCRIPTION_GUIDE.md for detailed usage');
    console.log('   2. Use SubscriptionService in your components');
    console.log('   3. Add SubscriptionManager component to your admin panel');

  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   - Verify your .env file has correct Supabase credentials');
    console.log('   - Check Supabase dashboard for any errors');
    console.log('   - Ensure migrations have been applied');
  }
}

// Run the test
testConnection();

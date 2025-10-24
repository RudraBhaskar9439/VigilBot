import { supabase, Subscription } from './supabase';

export interface CreateSubscriptionParams {
  walletAddress: string;
  tier: 'basic' | 'standard' | 'pro';
  amountPaid: number;
  transactionHash: string;
  durationMonths: number;
}

export interface UpdateSubscriptionParams {
  walletAddress: string;
  isActive?: boolean;
  endDate?: string;
}

/**
 * Subscription Service
 * Handles all subscription-related operations with Supabase
 */
export class SubscriptionService {
  /**
   * Create a new subscription
   */
  static async createSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
    const { walletAddress, tier, amountPaid, transactionHash, durationMonths } = params;
    
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([
        {
          wallet_address: walletAddress.toLowerCase(),
          tier,
          amount_paid: amountPaid,
          transaction_hash: transactionHash,
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
          is_active: true,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw new Error(`Failed to create subscription: ${error.message}`);
    return data as Subscription;
  }

  /**
   * Update an existing subscription (upsert)
   */
  static async upsertSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
    const { walletAddress, tier, amountPaid, transactionHash, durationMonths } = params;
    
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + durationMonths);

    const { data, error } = await supabase
      .from('subscriptions')
      .upsert(
        [
          {
            wallet_address: walletAddress.toLowerCase(),
            tier,
            amount_paid: amountPaid,
            transaction_hash: transactionHash,
            start_date: now.toISOString(),
            end_date: endDate.toISOString(),
            is_active: true,
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
          },
        ],
        { onConflict: 'wallet_address' }
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to upsert subscription: ${error.message}`);
    return data as Subscription;
  }

  /**
   * Get subscription by wallet address
   */
  static async getSubscription(walletAddress: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw new Error(`Failed to get subscription: ${error.message}`);
    }

    return data as Subscription;
  }

  /**
   * Get all active subscriptions
   */
  static async getActiveSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get active subscriptions: ${error.message}`);
    return data as Subscription[];
  }

  /**
   * Get all subscriptions (admin)
   */
  static async getAllSubscriptions(): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get all subscriptions: ${error.message}`);
    return data as Subscription[];
  }

  /**
   * Check if subscription is active and valid
   */
  static async isSubscriptionValid(walletAddress: string): Promise<boolean> {
    const subscription = await this.getSubscription(walletAddress);
    
    if (!subscription || !subscription.is_active) return false;
    
    const now = new Date();
    const endDate = new Date(subscription.end_date);
    
    return endDate > now;
  }

  /**
   * Deactivate a subscription
   */
  static async deactivateSubscription(walletAddress: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress.toLowerCase());

    if (error) throw new Error(`Failed to deactivate subscription: ${error.message}`);
  }

  /**
   * Extend subscription
   */
  static async extendSubscription(
    walletAddress: string,
    additionalMonths: number
  ): Promise<Subscription> {
    const subscription = await this.getSubscription(walletAddress);
    
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const currentEndDate = new Date(subscription.end_date);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + additionalMonths);

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        end_date: newEndDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress.toLowerCase())
      .select()
      .single();

    if (error) throw new Error(`Failed to extend subscription: ${error.message}`);
    return data as Subscription;
  }

  /**
   * Get subscription statistics
   */
  static async getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    byTier: { basic: number; standard: number; pro: number };
  }> {
    const allSubs = await this.getAllSubscriptions();
    const now = new Date();

    const stats = {
      total: allSubs.length,
      active: 0,
      expired: 0,
      byTier: { basic: 0, standard: 0, pro: 0 },
    };

    allSubs.forEach((sub) => {
      const endDate = new Date(sub.end_date);
      if (sub.is_active && endDate > now) {
        stats.active++;
      } else {
        stats.expired++;
      }

      if (sub.tier === 'basic') stats.byTier.basic++;
      else if (sub.tier === 'standard') stats.byTier.standard++;
      else if (sub.tier === 'pro') stats.byTier.pro++;
    });

    return stats;
  }

  /**
   * Clean up expired subscriptions (set is_active to false)
   */
  static async cleanupExpiredSubscriptions(): Promise<number> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('is_active', true)
      .lt('end_date', now)
      .select();

    if (error) throw new Error(`Failed to cleanup expired subscriptions: ${error.message}`);
    return data?.length || 0;
  }
}

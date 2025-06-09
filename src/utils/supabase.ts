import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper functions for common operations
export const supabaseHelpers = {
  // Auth helpers
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  // Meme helpers
  async getMemes(limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('memes')
      .select(`
        *,
        creator:creator_id(email),
        likes!inner(user_id),
        saves!inner(user_id)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    return { data, error };
  },

  async getUserMemes(userId: string, limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from('memes')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    return { data, error };
  },

  async createMeme(meme: {
    image_url: string;
    name: string;
    description?: string;
    top_text?: string;
    bottom_text?: string;
    is_nft?: boolean;
    nft_tx_hash?: string;
    chain_type?: string;
    chain_id?: string;
    contract_address?: string;
  }) {
    const { data, error } = await supabase
      .from('memes')
      .insert(meme)
      .select()
      .single();
    
    return { data, error };
  },

  // Like helpers
  async toggleLike(memeId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if like exists
    const { data: existingLike } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', user.id)
      .eq('meme_id', memeId)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('meme_id', memeId);
      
      return { liked: false, error };
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: user.id, meme_id: memeId });
      
      return { liked: true, error };
    }
  },

  async getUserLikes(userId: string) {
    const { data, error } = await supabase
      .from('likes')
      .select('meme_id')
      .eq('user_id', userId);
    
    return { data: data?.map(like => like.meme_id) || [], error };
  },

  // Save helpers
  async toggleSave(memeId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if save exists
    const { data: existingSave } = await supabase
      .from('saves')
      .select('*')
      .eq('user_id', user.id)
      .eq('meme_id', memeId)
      .single();

    if (existingSave) {
      // Unsave
      const { error } = await supabase
        .from('saves')
        .delete()
        .eq('user_id', user.id)
        .eq('meme_id', memeId);
      
      return { saved: false, error };
    } else {
      // Save
      const { error } = await supabase
        .from('saves')
        .insert({ user_id: user.id, meme_id: memeId });
      
      return { saved: true, error };
    }
  },

  async getUserSaves(userId: string) {
    const { data, error } = await supabase
      .from('saves')
      .select('meme_id')
      .eq('user_id', userId);
    
    return { data: data?.map(save => save.meme_id) || [], error };
  },

  // Comment helpers
  async getComments(memeId: string, limit = 10, offset = 0) {
    const { data, error }= await supabase
      .from('comments')
      .select(`
        *,
        author:user_id(email)
      `)
      .eq('meme_id', memeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    return { data, error };
  },

  async createComment(memeId: string, content: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        meme_id: memeId,
        content: content.trim(),
      })
      .select(`
        *,
        author:user_id(email)
      `)
      .single();
    
    return { data, error };
  },

  async deleteComment(commentId: string) {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    
    return { error };
  },

  async getCommentsCount(memeId: string) {
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('meme_id', memeId);
    
    return { count: count || 0, error };
  },

  // Blockchain preferences helpers
  async updateBlockchainPreferences(preferences: {
    preferred_chain?: string;
    algorand_wallet_type?: string;
    evm_wallet_type?: string;
    wallet_address?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_blockchain_preferences')
      .upsert({
        user_id: user.id,
        ...preferences,
      })
      .select()
      .single();
    
    return { data, error };
  },

  async getBlockchainPreferences(userId: string) {
    const { data, error } = await supabase
      .from('user_blockchain_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    return { data, error };
  },

  // Sponsored content helpers
  async getSponsoredTemplates() {
    const { data, error } = await supabase
      .from('sponsored_templates')
      .select(`
        *,
        sponsor:sponsor_id (*)
      `)
      .eq('is_active', true)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .order('priority', { ascending: false });

    return { data, error };
  },

  async getSponsoredWatermarks() {
    const { data, error } = await supabase
      .from('sponsored_watermarks')
      .select(`
        *,
        sponsor:sponsor_id (*)
      `)
      .eq('is_active', true);

    return { data, error };
  },

  async getRandomSponsoredWatermark() {
    const { data, error } = await this.getSponsoredWatermarks();
    
    if (error || !data || data.length === 0) {
      return { data: null, error };
    }

    // Randomly select a watermark
    const randomIndex = Math.floor(Math.random() * data.length);
    return { data: data[randomIndex], error: null };
  },

  // Premium subscription helpers
  async getPlans() {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    return { data, error };
  },

  async checkUserPremium(userId: string) {
    const { data, error } = await supabase
      .rpc('is_user_premium', { user_uuid: userId });

    return { data, error };
  },

  async getUserSubscription(userId: string) {
    const { data, error } = await supabase
      .rpc('get_user_subscription', { user_uuid: userId });

    return { data, error };
  },

  async createCheckoutSession(planId: string) {
    // In a real implementation, this would call a Supabase Edge Function
    // that creates a Stripe checkout session
    
    // For now, we'll simulate the response
    const mockCheckoutUrl = `https://checkout.stripe.com/pay/cs_test_${Math.random().toString(36).substr(2, 9)}`;
    
    return { 
      data: { checkout_url: mockCheckoutUrl }, 
      error: null 
    };
  },

  async cancelSubscription(subscriptionId: string) {
    // In a real implementation, this would call a Supabase Edge Function
    // that cancels the Stripe subscription
    
    // For now, we'll simulate updating the subscription status
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .select()
      .single();

    return { data, error };
  },

  async createSubscription(subscriptionData: {
    plan_id: string;
    stripe_customer_id: string;
    stripe_subscription_id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        ...subscriptionData,
      })
      .select()
      .single();

    return { data, error };
  },

  async updateSubscription(subscriptionId: string, updates: {
    status?: string;
    current_period_start?: string;
    current_period_end?: string;
    cancel_at_period_end?: boolean;
  }) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId)
      .select()
      .single();

    return { data, error };
  },
};
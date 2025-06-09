export interface Database {
  public: {
    Tables: {
      memes: {
        Row: {
          id: string;
          image_url: string;
          name: string;
          description: string | null;
          creator_id: string;
          created_at: string;
          likes_count: number;
          is_nft: boolean;
          nft_tx_hash: string | null;
          chain_type: string;
          chain_id: string | null;
          contract_address: string | null;
          top_text: string | null;
          bottom_text: string | null;
        };
        Insert: {
          id?: string;
          image_url: string;
          name: string;
          description?: string | null;
          creator_id?: string;
          created_at?: string;
          likes_count?: number;
          is_nft?: boolean;
          nft_tx_hash?: string | null;
          chain_type?: string;
          chain_id?: string | null;
          contract_address?: string | null;
          top_text?: string | null;
          bottom_text?: string | null;
        };
        Update: {
          id?: string;
          image_url?: string;
          name?: string;
          description?: string | null;
          creator_id?: string;
          created_at?: string;
          likes_count?: number;
          is_nft?: boolean;
          nft_tx_hash?: string | null;
          chain_type?: string;
          chain_id?: string | null;
          contract_address?: string | null;
          top_text?: string | null;
          bottom_text?: string | null;
        };
      };
      likes: {
        Row: {
          user_id: string;
          meme_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          meme_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          meme_id?: string;
          created_at?: string;
        };
      };
      saves: {
        Row: {
          user_id: string;
          meme_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          meme_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          meme_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          meme_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          meme_id: string;
          user_id?: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          meme_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      user_blockchain_preferences: {
        Row: {
          user_id: string;
          preferred_chain: string;
          algorand_wallet_type: string | null;
          evm_wallet_type: string | null;
          wallet_address: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          preferred_chain?: string;
          algorand_wallet_type?: string | null;
          evm_wallet_type?: string | null;
          wallet_address?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          preferred_chain?: string;
          algorand_wallet_type?: string | null;
          evm_wallet_type?: string | null;
          wallet_address?: string | null;
          created_at?: string;
        };
      };
      sponsors: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          website_url: string | null;
          contact_email: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          website_url?: string | null;
          contact_email: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          website_url?: string | null;
          contact_email?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      sponsored_templates: {
        Row: {
          id: string;
          template_name: string;
          template_url: string;
          sponsor_id: string;
          start_date: string;
          end_date: string;
          is_active: boolean;
          priority: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_name: string;
          template_url: string;
          sponsor_id: string;
          start_date: string;
          end_date: string;
          is_active?: boolean;
          priority?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_name?: string;
          template_url?: string;
          sponsor_id?: string;
          start_date?: string;
          end_date?: string;
          is_active?: boolean;
          priority?: number;
          created_at?: string;
        };
      };
      sponsored_watermarks: {
        Row: {
          id: string;
          sponsor_id: string;
          name: string;
          image_url: string;
          link_url: string | null;
          position: string;
          opacity: number;
          size: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          name: string;
          image_url: string;
          link_url?: string | null;
          position?: string;
          opacity?: number;
          size?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sponsor_id?: string;
          name?: string;
          image_url?: string;
          link_url?: string | null;
          position?: string;
          opacity?: number;
          size?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      ad_impressions: {
        Row: {
          id: string;
          sponsor_id: string;
          content_type: string;
          content_id: string;
          user_id: string | null;
          session_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          content_type: string;
          content_id: string;
          user_id?: string | null;
          session_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          sponsor_id?: string;
          content_type?: string;
          content_id?: string;
          user_id?: string | null;
          session_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          timestamp?: string;
        };
      };
      ad_clicks: {
        Row: {
          id: string;
          sponsor_id: string;
          content_type: string;
          content_id: string | null;
          link_url: string;
          user_id: string | null;
          session_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          sponsor_id: string;
          content_type: string;
          content_id?: string | null;
          link_url: string;
          user_id?: string | null;
          session_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          sponsor_id?: string;
          content_type?: string;
          content_id?: string | null;
          link_url?: string;
          user_id?: string | null;
          session_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          timestamp?: string;
        };
      };
      events: {
        Row: {
          id: string;
          user_id: string | null;
          event_name: string;
          properties: any | null;
          session_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          event_name: string;
          properties?: any | null;
          session_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          event_name?: string;
          properties?: any | null;
          session_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          timestamp?: string;
        };
      };
      plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          price: number;
          currency: string;
          features: any;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          interval_type: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          price: number;
          currency?: string;
          features?: any;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          interval_type?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          currency?: string;
          features?: any;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          interval_type?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: string;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          current_period_start: string;
          current_period_end: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          current_period_start?: string;
          current_period_end?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_user_premium: {
        Args: {
          user_uuid: string;
        };
        Returns: boolean;
      };
      get_user_subscription: {
        Args: {
          user_uuid: string;
        };
        Returns: {
          subscription_id: string;
          plan_id: string;
          plan_name: string;
          status: string;
          current_period_end: string;
          cancel_at_period_end: boolean;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

export type Meme = Database['public']['Tables']['memes']['Row'];
export type MemeInsert = Database['public']['Tables']['memes']['Insert'];
export type Like = Database['public']['Tables']['likes']['Row'];
export type Save = Database['public']['Tables']['saves']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];
export type UserBlockchainPreferences = Database['public']['Tables']['user_blockchain_preferences']['Row'];
export type Event = Database['public']['Tables']['events']['Row'];
export type EventInsert = Database['public']['Tables']['events']['Insert'];

// Sponsored content types
export type Sponsor = Database['public']['Tables']['sponsors']['Row'];
export type SponsoredTemplate = Database['public']['Tables']['sponsored_templates']['Row'];
export type SponsoredWatermark = Database['public']['Tables']['sponsored_watermarks']['Row'];
export type AdImpression = Database['public']['Tables']['ad_impressions']['Row'];
export type AdClick = Database['public']['Tables']['ad_clicks']['Row'];

// Premium subscription types
export type Plan = Database['public']['Tables']['plans']['Row'];
export type PlanInsert = Database['public']['Tables']['plans']['Insert'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];

export interface MemeWithDetails extends Meme {
  creator?: {
    email?: string;
  };
  isLiked?: boolean;
  isSaved?: boolean;
  comments_count?: number;
}

export interface CommentWithAuthor extends Comment {
  author: {
    email?: string;
  };
}

export interface AuthUser {
  id: string;
  email?: string;
  created_at: string;
}

export interface SponsoredTemplateWithSponsor extends SponsoredTemplate {
  sponsor: Sponsor;
}

export interface SponsoredWatermarkWithSponsor extends SponsoredWatermark {
  sponsor: Sponsor;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan;
}

export interface UserSubscriptionInfo {
  subscription_id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type WatermarkSize = 'small' | 'medium' | 'large';
export type ContentType = 'template' | 'watermark' | 'logo';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
export type PlanInterval = 'month' | 'year';

export interface TrackingEvent {
  sponsor_id: string;
  content_type: ContentType;
  content_id?: string;
  user_id?: string;
  session_id?: string;
}

export interface TrackingClickEvent extends TrackingEvent {
  link_url: string;
}

export interface PlanFeatures {
  ad_free?: boolean;
  exclusive_templates?: boolean;
  high_res_download?: boolean;
  priority_support?: boolean;
  unlimited_nft_mints?: boolean;
  yearly_bonus?: boolean;
}
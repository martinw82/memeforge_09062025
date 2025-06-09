export interface AnalyticsEvent {
  id?: string;
  user_id?: string;
  event_name: string;
  properties?: Record<string, any>;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
}

export interface EventProperties {
  // App events
  app_loaded?: {
    version?: string;
    platform?: string;
    user_agent?: string;
  };

  // Template events
  template_selected?: {
    template_id: string;
    template_name: string;
    is_sponsored?: boolean;
    is_premium?: boolean;
    sponsor_id?: string;
  };
  
  custom_template_uploaded?: {
    file_size?: number;
    file_type?: string;
  };

  // Meme generation events
  meme_generated?: {
    template_id?: string;
    has_top_text: boolean;
    has_bottom_text: boolean;
    font_used?: string;
    has_watermark?: boolean;
    watermark_sponsor_id?: string;
    is_premium?: boolean;
    high_res?: boolean;
  };

  meme_downloaded?: {
    meme_id?: string;
    format?: string;
    is_premium?: boolean;
    quality?: string;
  };

  meme_shared?: {
    meme_id?: string;
    share_method?: string;
    platform?: string;
    is_premium?: boolean;
    quality?: string;
  };

  ai_caption_generated?: {
    tone?: string;
    suggestions_count?: number;
    suggestion_selected?: boolean;
  };

  // NFT events
  nft_mint_attempt?: {
    chain_type: string;
    chain_id: string;
    wallet_type: string;
  };

  nft_mint_success?: {
    chain_type: string;
    chain_id: string;
    transaction_hash: string;
    token_id?: string;
  };

  nft_mint_failure?: {
    chain_type: string;
    chain_id: string;
    error_message: string;
  };

  // Social events
  meme_liked?: {
    meme_id: string;
    creator_id?: string;
    is_own_meme?: boolean;
  };

  meme_unliked?: {
    meme_id: string;
    creator_id?: string;
  };

  meme_saved?: {
    meme_id: string;
    creator_id?: string;
  };

  meme_unsaved?: {
    meme_id: string;
    creator_id?: string;
  };

  comment_created?: {
    meme_id: string;
    comment_length: number;
  };

  comment_deleted?: {
    comment_id: string;
    meme_id: string;
  };

  // Auth events
  user_signed_up?: {
    auth_method?: string;
  };

  user_signup_attempt?: {
    auth_method?: string;
  };

  user_signup_failure?: {
    auth_method?: string;
    error_message?: string;
  };

  user_signin_attempt?: {
    auth_method?: string;
  };

  user_signin_failure?: {
    auth_method?: string;
    error_message?: string;
  };

  user_logged_in?: {
    auth_method?: string;
  };

  user_logged_out?: Record<string, never>;

  auth_modal_opened?: {
    mode?: string;
  };

  auth_mode_switched?: {
    from_mode?: string;
    to_mode?: string;
  };

  // Wallet events
  wallet_connected?: {
    chain_type: string;
    chain_id: string;
    wallet_type: string;
  };

  wallet_disconnected?: {
    chain_type: string;
    chain_id: string;
    wallet_type: string;
  };

  chain_switched?: {
    from_chain: string;
    to_chain: string;
  };

  // Premium/Subscription events
  premium_features_viewed?: {
    is_modal?: boolean;
    is_premium?: boolean;
  };

  premium_template_blocked?: {
    template_id: string;
    template_name: string;
  };

  premium_feature_blocked?: {
    feature: string;
  };

  subscription_checkout_attempt?: {
    plan_id: string;
    user_id?: string;
  };

  subscription_checkout_failed?: {
    plan_id: string;
    error_message?: string;
  };

  subscription_checkout_redirected?: {
    plan_id: string;
    checkout_url?: string;
  };

  subscription_cancel_attempt?: {
    subscription_id: string;
    plan_id: string;
  };

  subscription_cancel_failed?: {
    subscription_id: string;
    error_message?: string;
  };

  subscription_cancelled?: {
    subscription_id: string;
    plan_id: string;
  };

  subscription_refreshed?: {
    user_id?: string;
  };

  customer_portal_accessed?: {
    subscription_id?: string;
  };

  // Search and filter events
  template_searched?: {
    search_term: string;
    results_count: number;
  };

  sponsored_filter_toggled?: {
    show_sponsored_only: boolean;
  };

  // Navigation events
  page_viewed?: {
    page: string;
    referrer?: string;
  };

  tab_switched?: {
    from_tab: string;
    to_tab: string;
  };

  // Error events
  error_occurred?: {
    error_type: string;
    error_message: string;
    component?: string;
    stack_trace?: string;
  };

  // Performance events
  performance_metric?: {
    metric_name: string;
    metric_value: number;
    unit?: string;
  };
}

export type EventName = keyof EventProperties;

export interface AnalyticsConfig {
  enabled: boolean;
  debug: boolean;
  batchSize: number;
  flushInterval: number;
  sessionTimeout: number;
}

export interface SessionInfo {
  id: string;
  startTime: number;
  lastActivity: number;
  pageViews: number;
  events: number;
}
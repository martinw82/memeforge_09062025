import { supabase } from './supabase';
import { TrackingEvent, TrackingClickEvent } from '../types/supabase';

// Generate session ID for anonymous tracking
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('meme_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('meme_session_id', sessionId);
  }
  return sessionId;
};

// Get basic client information for tracking
const getClientInfo = () => {
  return {
    user_agent: navigator.userAgent,
    session_id: getSessionId(),
  };
};

// Tracking functions
export const trackingAPI = {
  // Track impression events
  async trackImpression(event: TrackingEvent): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const clientInfo = getClientInfo();

      const { error } = await supabase
        .from('ad_impressions')
        .insert({
          sponsor_id: event.sponsor_id,
          content_type: event.content_type,
          content_id: event.content_id || '',
          user_id: user?.id || null,
          ...clientInfo,
        });

      if (error) {
        console.error('Error tracking impression:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking impression:', error);
      return { success: false, error: 'Failed to track impression' };
    }
  },

  // Track click events
  async trackClick(event: TrackingClickEvent): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const clientInfo = getClientInfo();

      const { error } = await supabase
        .from('ad_clicks')
        .insert({
          sponsor_id: event.sponsor_id,
          content_type: event.content_type,
          content_id: event.content_id || null,
          link_url: event.link_url,
          user_id: user?.id || null,
          ...clientInfo,
        });

      if (error) {
        console.error('Error tracking click:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking click:', error);
      return { success: false, error: 'Failed to track click' };
    }
  },

  // Batch track multiple impressions (for performance)
  async trackBatchImpressions(events: TrackingEvent[]): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const clientInfo = getClientInfo();

      const impressions = events.map(event => ({
        sponsor_id: event.sponsor_id,
        content_type: event.content_type,
        content_id: event.content_id || '',
        user_id: user?.id || null,
        ...clientInfo,
      }));

      const { error } = await supabase
        .from('ad_impressions')
        .insert(impressions);

      if (error) {
        console.error('Error tracking batch impressions:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error tracking batch impressions:', error);
      return { success: false, error: 'Failed to track impressions' };
    }
  },

  // Track template selection
  async trackTemplateSelection(templateId: string, sponsorId: string): Promise<void> {
    await this.trackImpression({
      sponsor_id: sponsorId,
      content_type: 'template',
      content_id: templateId,
    });
  },

  // Track watermark application
  async trackWatermarkApplication(watermarkId: string, sponsorId: string): Promise<void> {
    await this.trackImpression({
      sponsor_id: sponsorId,
      content_type: 'watermark',
      content_id: watermarkId,
    });
  },

  // Track sponsor link click
  async trackSponsorClick(sponsorId: string, linkUrl: string, contentType: 'template' | 'watermark' | 'logo' = 'logo'): Promise<void> {
    await this.trackClick({
      sponsor_id: sponsorId,
      content_type: contentType,
      link_url: linkUrl,
    });
  },
};

// Sponsored content fetching functions
export const sponsoredContentAPI = {
  // Get active sponsored templates
  async getSponsoredTemplates(): Promise<{ data: any[] | null; error: any }> {
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

  // Get active sponsored watermarks
  async getSponsoredWatermarks(): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await supabase
      .from('sponsored_watermarks')
      .select(`
        *,
        sponsor:sponsor_id (*)
      `)
      .eq('is_active', true);

    return { data, error };
  },

  // Get sponsor by ID
  async getSponsor(sponsorId: string): Promise<{ data: any | null; error: any }> {
    const { data, error } = await supabase
      .from('sponsors')
      .select('*')
      .eq('id', sponsorId)
      .eq('is_active', true)
      .single();

    return { data, error };
  },

  // Get random sponsored watermark for application
  async getRandomSponsoredWatermark(): Promise<{ data: any | null; error: any }> {
    const { data, error } = await this.getSponsoredWatermarks();
    
    if (error || !data || data.length === 0) {
      return { data: null, error };
    }

    // Randomly select a watermark
    const randomIndex = Math.floor(Math.random() * data.length);
    return { data: data[randomIndex], error: null };
  },
};

// Throttled impression tracking to prevent spam
class ImpressionThrottle {
  private trackedEvents = new Set<string>();
  private throttleTime = 5000; // 5 seconds

  shouldTrack(eventKey: string): boolean {
    if (this.trackedEvents.has(eventKey)) {
      return false;
    }

    this.trackedEvents.add(eventKey);
    setTimeout(() => {
      this.trackedEvents.delete(eventKey);
    }, this.throttleTime);

    return true;
  }
}

export const impressionThrottle = new ImpressionThrottle();

// Helper to create unique event keys
export const createEventKey = (sponsorId: string, contentType: string, contentId?: string): string => {
  return `${sponsorId}-${contentType}-${contentId || 'none'}`;
};
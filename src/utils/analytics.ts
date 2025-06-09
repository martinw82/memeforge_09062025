import { supabase } from './supabase';
import { AnalyticsEvent, EventName, EventProperties, AnalyticsConfig, SessionInfo } from '../types/analytics';

class Analytics {
  private config: AnalyticsConfig = {
    enabled: true,
    debug: import.meta.env.DEV,
    batchSize: 10,
    flushInterval: 5000, // 5 seconds
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
  };

  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private session: SessionInfo;

  constructor() {
    this.session = this.initializeSession();
    this.startPeriodicFlush();
    this.setupBeforeUnload();

    if (this.config.debug) {
      console.log('Analytics initialized with session:', this.session.id);
    }
  }

  private initializeSession(): SessionInfo {
    const now = Date.now();
    let sessionId = sessionStorage.getItem('analytics_session_id');
    let sessionStart = sessionStorage.getItem('analytics_session_start');
    let lastActivity = sessionStorage.getItem('analytics_last_activity');

    // Check if session has expired
    if (
      !sessionId || 
      !lastActivity || 
      now - parseInt(lastActivity) > this.config.sessionTimeout
    ) {
      sessionId = `session_${now}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStart = now.toString();
      sessionStorage.setItem('analytics_session_id', sessionId);
      sessionStorage.setItem('analytics_session_start', sessionStart);
    }

    sessionStorage.setItem('analytics_last_activity', now.toString());

    return {
      id: sessionId,
      startTime: parseInt(sessionStart || now.toString()),
      lastActivity: now,
      pageViews: 0,
      events: 0,
    };
  }

  private updateSession() {
    const now = Date.now();
    this.session.lastActivity = now;
    this.session.events++;
    sessionStorage.setItem('analytics_last_activity', now.toString());
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private setupBeforeUnload() {
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });

    // Also flush on visibility change (when user switches tabs)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  async trackEvent<T extends EventName>(
    eventName: T,
    properties?: EventProperties[T],
    options?: {
      immediate?: boolean;
      userId?: string;
    }
  ): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const event: AnalyticsEvent = {
        event_name: eventName,
        properties: properties || {},
        user_id: options?.userId || user?.id || undefined,
        session_id: this.session.id,
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      if (this.config.debug) {
        console.log('Tracking event:', event);
      }

      this.updateSession();

      if (options?.immediate) {
        await this.sendEvent(event);
      } else {
        this.eventQueue.push(event);
        
        if (this.eventQueue.length >= this.config.batchSize) {
          await this.flush();
        }
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  async trackPageView(page: string, referrer?: string): Promise<void> {
    this.session.pageViews++;
    await this.trackEvent('page_viewed', {
      page,
      referrer: referrer || document.referrer || undefined,
    });
  }

  async identifyUser(userId: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent('user_identified', {
      user_id: userId,
      ...properties,
    }, { userId, immediate: true });
  }

  async trackError(
    error: Error,
    context?: {
      component?: string;
      action?: string;
      additional?: Record<string, any>;
    }
  ): Promise<void> {
    await this.trackEvent('error_occurred', {
      error_type: error.name,
      error_message: error.message,
      component: context?.component,
      stack_trace: error.stack,
      ...context?.additional,
    }, { immediate: true });
  }

  async trackPerformance(metricName: string, value: number, unit?: string): Promise<void> {
    await this.trackEvent('performance_metric', {
      metric_name: metricName,
      metric_value: value,
      unit,
    });
  }

  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const { error } = await supabase
        .from('events')
        .insert(event);

      if (error) {
        console.error('Failed to send analytics event:', error);
      }
    } catch (error) {
      console.error('Error sending analytics event:', error);
    }
  }

  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    try {
      const { error } = await supabase
        .from('events')
        .insert(events);

      if (error) {
        console.error('Failed to send analytics events:', error);
      } else if (this.config.debug) {
        console.log(`Sent ${events.length} analytics events`);
      }
    } catch (error) {
      console.error('Error sending analytics events:', error);
    }
  }

  async flush(isBeforeUnload = false): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    if (isBeforeUnload) {
      // Use sendBeacon for reliable delivery during page unload
      try {
        const payload = JSON.stringify(eventsToSend);
        navigator.sendBeacon('/api/analytics', payload);
      } catch (error) {
        // Fallback to regular send
        await this.sendEvents(eventsToSend);
      }
    } else {
      await this.sendEvents(eventsToSend);
    }
  }

  getSession(): SessionInfo {
    return { ...this.session };
  }

  configure(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.debug) {
      console.log('Analytics configuration updated:', this.config);
    }
  }

  async getEventHistory(limit = 100): Promise<AnalyticsEvent[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching event history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching event history:', error);
      return [];
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    this.flush(true);
  }
}

// Create singleton instance
export const analytics = new Analytics();

// Convenience functions
export const trackEvent = analytics.trackEvent.bind(analytics);
export const trackPageView = analytics.trackPageView.bind(analytics);
export const trackError = analytics.trackError.bind(analytics);
export const trackPerformance = analytics.trackPerformance.bind(analytics);
export const identifyUser = analytics.identifyUser.bind(analytics);

// Performance tracking utilities
export const measurePerformance = async (
  name: string,
  fn: () => Promise<any>
): Promise<any> => {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    await trackPerformance(name, duration, 'ms');
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    await trackPerformance(`${name}_error`, duration, 'ms');
    throw error;
  }
};

export default analytics;
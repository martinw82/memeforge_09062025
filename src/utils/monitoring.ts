import { analytics, trackError, trackPerformance } from './analytics';

interface PerformanceMetrics {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

interface ErrorReport {
  message: string;
  stack?: string;
  component?: string;
  userId?: string;
  url: string;
  userAgent: string;
  timestamp: number;
  additionalData?: Record<string, any>;
}

class ProductionMonitoring {
  private performanceMetrics: PerformanceMetrics[] = [];
  private errorReports: ErrorReport[] = [];
  private vitalsObserver: PerformanceObserver | null = null;

  constructor() {
    this.initializePerformanceMonitoring();
    this.initializeErrorMonitoring();
    this.initializeVitalsMonitoring();
  }

  private initializePerformanceMonitoring() {
    // Monitor navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.captureNavigationMetrics();
      }, 100);
    });

    // Monitor resource loading
    if ('PerformanceObserver' in window) {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            this.trackResourceMetric(entry as PerformanceResourceTiming);
          }
        });
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('Resource performance monitoring not supported');
      }
    }
  }

  private initializeErrorMonitoring() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        stack: event.error?.stack,
        component: 'GlobalErrorHandler',
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        component: 'PromiseRejectionHandler',
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        additionalData: {
          reason: event.reason,
        },
      });
    });
  }

  private initializeVitalsMonitoring() {
    // Core Web Vitals monitoring
    if ('PerformanceObserver' in window) {
      try {
        // Largest Contentful Paint (LCP)
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.trackVitalMetric('LCP', lastEntry.startTime);
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'first-input') {
              const fid = (entry as any).processingStart - entry.startTime;
              this.trackVitalMetric('FID', fid);
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Cumulative Layout Shift (CLS)
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });
          this.trackVitalMetric('CLS', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        this.vitalsObserver = clsObserver;
      } catch (error) {
        console.warn('Web Vitals monitoring not fully supported');
      }
    }
  }

  private captureNavigationMetrics() {
    if (!('performance' in window) || !('getEntriesByType' in performance)) {
      return;
    }

    const [navigationEntry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    
    if (navigationEntry) {
      const metrics = {
        'DNS Lookup': navigationEntry.domainLookupEnd - navigationEntry.domainLookupStart,
        'TCP Connection': navigationEntry.connectEnd - navigationEntry.connectStart,
        'Request': navigationEntry.responseStart - navigationEntry.requestStart,
        'Response': navigationEntry.responseEnd - navigationEntry.responseStart,
        'DOM Processing': navigationEntry.domContentLoadedEventStart - navigationEntry.responseEnd,
        'Load Complete': navigationEntry.loadEventEnd - navigationEntry.loadEventStart,
        'Total Load Time': navigationEntry.loadEventEnd - navigationEntry.fetchStart,
        'Time to Interactive': navigationEntry.domInteractive - navigationEntry.fetchStart,
        'DOM Content Loaded': navigationEntry.domContentLoadedEventEnd - navigationEntry.fetchStart,
      };

      Object.entries(metrics).forEach(([name, value]) => {
        if (value > 0) {
          this.trackPerformanceMetric(name, value, 'ms');
        }
      });
    }
  }

  private trackResourceMetric(entry: PerformanceResourceTiming) {
    const duration = entry.responseEnd - entry.startTime;
    const resourceType = this.getResourceType(entry.name);
    
    this.trackPerformanceMetric(
      `Resource Load - ${resourceType}`,
      duration,
      'ms'
    );

    // Track slow resources
    if (duration > 1000) {
      this.trackPerformanceMetric(
        'Slow Resource',
        duration,
        'ms',
        { resourceUrl: entry.name, resourceType }
      );
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'JavaScript';
    if (url.includes('.css')) return 'CSS';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) return 'Image';
    if (url.includes('.woff') || url.includes('.ttf')) return 'Font';
    if (url.includes('api/') || url.includes('.json')) return 'API';
    return 'Other';
  }

  private trackVitalMetric(name: string, value: number) {
    this.trackPerformanceMetric(`Core Web Vital - ${name}`, value, 'ms');
    
    // Track analytics event for vitals
    trackPerformance(`web_vital_${name.toLowerCase()}`, value, 'ms');
  }

  private trackPerformanceMetric(
    name: string, 
    value: number, 
    unit: string, 
    additionalData?: Record<string, any>
  ) {
    const metric: PerformanceMetrics = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };

    this.performanceMetrics.push(metric);
    
    // Track in analytics
    trackPerformance(name.toLowerCase().replace(/\s+/g, '_'), value, unit);

    // Log slow operations
    if (value > 3000 && unit === 'ms') {
      console.warn(`Slow operation detected: ${name} took ${value}ms`, additionalData);
    }
  }

  private reportError(errorReport: ErrorReport) {
    this.errorReports.push(errorReport);
    
    // Track in analytics
    trackError(new Error(errorReport.message), {
      component: errorReport.component || 'Unknown',
      action: 'global_error',
      additional: errorReport.additionalData,
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error reported:', errorReport);
    }
  }

  // Public methods for manual tracking
  trackUserAction(action: string, duration?: number, metadata?: Record<string, any>) {
    if (duration) {
      this.trackPerformanceMetric(`User Action - ${action}`, duration, 'ms', metadata);
    }
  }

  trackAPICall(endpoint: string, duration: number, status: number, metadata?: Record<string, any>) {
    this.trackPerformanceMetric(
      `API Call - ${endpoint}`,
      duration,
      'ms',
      { status, ...metadata }
    );

    // Track slow API calls
    if (duration > 2000) {
      this.trackPerformanceMetric(
        'Slow API Call',
        duration,
        'ms',
        { endpoint, status, ...metadata }
      );
    }
  }

  trackComponentRender(componentName: string, duration: number) {
    this.trackPerformanceMetric(
      `Component Render - ${componentName}`,
      duration,
      'ms'
    );
  }

  // Get monitoring data
  getPerformanceReport(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  getErrorReport(): ErrorReport[] {
    return [...this.errorReports];
  }

  // Memory monitoring
  trackMemoryUsage() {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      this.trackPerformanceMetric('Memory Used', memInfo.usedJSHeapSize / 1024 / 1024, 'MB');
      this.trackPerformanceMetric('Memory Total', memInfo.totalJSHeapSize / 1024 / 1024, 'MB');
      this.trackPerformanceMetric('Memory Limit', memInfo.jsHeapSizeLimit / 1024 / 1024, 'MB');
    }
  }

  // Cleanup
  destroy() {
    if (this.vitalsObserver) {
      this.vitalsObserver.disconnect();
    }
  }
}

// Create singleton instance
export const monitoring = new ProductionMonitoring();

// Convenience functions
export const trackUserAction = monitoring.trackUserAction.bind(monitoring);
export const trackAPICall = monitoring.trackAPICall.bind(monitoring);
export const trackComponentRender = monitoring.trackComponentRender.bind(monitoring);

// Export monitoring instance
export default monitoring;
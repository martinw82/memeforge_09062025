// Security utilities for production deployment

interface SecurityConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableXFrameOptions: boolean;
  enableXContentTypeOptions: boolean;
  enableReferrerPolicy: boolean;
}

class SecurityManager {
  private config: SecurityConfig = {
    enableCSP: true,
    enableHSTS: true,
    enableXFrameOptions: true,
    enableXContentTypeOptions: true,
    enableReferrerPolicy: true,
  };

  constructor() {
    this.initializeSecurity();
  }

  private initializeSecurity() {
    this.setupContentSecurityPolicy();
    this.setupInputSanitization();
    this.setupStorageEncryption();
    this.monitorSecurityViolations();
  }

  private setupContentSecurityPolicy() {
    if (!this.config.enableCSP) return;

    // CSP is typically set via meta tag or server headers
    // This is for client-side monitoring and violations
    const cspConfig = {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Vite in development
        "https://js.stripe.com",
        "https://checkout.stripe.com",
        "https://netlify-ai-caption-backend.netlify.app",
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind
        "https://fonts.googleapis.com",
      ],
      'img-src': [
        "'self'",
        "data:",
        "blob:",
        "https://images.pexels.com",
        "https://ipfs.io",
        "https://gateway.pinata.cloud",
      ],
      'connect-src': [
        "'self'",
        "https://*.supabase.co",
        "https://api.stripe.com",
        "https://netlify-ai-caption-backend.netlify.app",
        "https://mfimgshr.netlify.app",
        "https://*.algonode.cloud",
        "https://bridge.walletconnect.org",
      ],
      'font-src': [
        "'self'",
        "https://fonts.gstatic.com",
      ],
      'frame-src': [
        "https://js.stripe.com",
        "https://checkout.stripe.com",
      ],
    };

    // Log CSP configuration in development
    if (import.meta.env.DEV) {
      console.log('CSP Configuration:', cspConfig);
    }
  }

  private setupInputSanitization() {
    // Input sanitization utilities
    this.sanitizeHTML = this.sanitizeHTML.bind(this);
    this.validateEmail = this.validateEmail.bind(this);
    this.sanitizeURL = this.sanitizeURL.bind(this);
  }

  private setupStorageEncryption() {
    // Enhanced localStorage wrapper with encryption for sensitive data
    this.secureStorage = {
      setItem: (key: string, value: string, encrypt = false) => {
        try {
          if (encrypt) {
            // In production, would use proper encryption
            value = btoa(value); // Simple base64 encoding for demo
          }
          localStorage.setItem(key, value);
        } catch (error) {
          console.error('Secure storage setItem failed:', error);
        }
      },
      
      getItem: (key: string, decrypt = false) => {
        try {
          let value = localStorage.getItem(key);
          if (value && decrypt) {
            value = atob(value); // Simple base64 decoding for demo
          }
          return value;
        } catch (error) {
          console.error('Secure storage getItem failed:', error);
          return null;
        }
      },
      
      removeItem: (key: string) => {
        localStorage.removeItem(key);
      },
    };
  }

  private monitorSecurityViolations() {
    // CSP violation monitoring
    document.addEventListener('securitypolicyviolation', (event) => {
      console.warn('CSP Violation:', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        originalPolicy: event.originalPolicy,
      });

      // Report to analytics
      if (typeof window !== 'undefined' && window.analytics) {
        window.analytics.trackError(new Error('CSP Violation'), {
          component: 'SecurityManager',
          action: 'csp_violation',
          additional: {
            violatedDirective: event.violatedDirective,
            blockedURI: event.blockedURI,
          },
        });
      }
    });
  }

  // Public security utilities
  sanitizeHTML(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  sanitizeURL(url: string): string {
    try {
      const urlObj = new URL(url);
      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Invalid protocol');
      }
      return urlObj.toString();
    } catch (error) {
      console.warn('URL sanitization failed:', url);
      return '';
    }
  }

  validateWalletAddress(address: string, type: 'algorand' | 'ethereum'): boolean {
    if (type === 'algorand') {
      // Algorand addresses are 58 characters long and base32 encoded
      return /^[A-Z2-7]{58}$/.test(address);
    } else if (type === 'ethereum') {
      // Ethereum addresses are 42 characters long and hex encoded
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }
    return false;
  }

  // Rate limiting for API calls
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  checkRateLimit(key: string, maxRequests = 10, timeWindow = 60000): boolean {
    const now = Date.now();
    const existing = this.rateLimitMap.get(key);

    if (!existing || now > existing.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + timeWindow });
      return true;
    }

    if (existing.count >= maxRequests) {
      return false;
    }

    existing.count++;
    return true;
  }

  // Secure data transmission
  prepareSecurePayload(data: Record<string, any>): Record<string, any> {
    // Remove sensitive fields from client-side data
    const sensitiveFields = ['password', 'apiKey', 'privateKey', 'secret'];
    const cleanData = { ...data };

    sensitiveFields.forEach(field => {
      if (field in cleanData) {
        delete cleanData[field];
      }
    });

    // Add integrity check
    cleanData._timestamp = Date.now();
    cleanData._checksum = this.generateChecksum(cleanData);

    return cleanData;
  }

  private generateChecksum(data: Record<string, any>): string {
    // Simple checksum for integrity verification
    return btoa(JSON.stringify(data)).slice(0, 16);
  }

  // Security headers for fetch requests
  getSecureHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'Cache-Control': 'no-cache',
    };
  }

  // Public storage interface
  secureStorage: {
    setItem: (key: string, value: string, encrypt?: boolean) => void;
    getItem: (key: string, decrypt?: boolean) => string | null;
    removeItem: (key: string) => void;
  };
}

// Create singleton instance
export const security = new SecurityManager();

// Export utilities
export const {
  sanitizeHTML,
  validateEmail,
  sanitizeURL,
  validateWalletAddress,
  checkRateLimit,
  prepareSecurePayload,
  getSecureHeaders,
  secureStorage,
} = security;

export default security;
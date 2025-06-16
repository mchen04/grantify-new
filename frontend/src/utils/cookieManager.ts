// Cookie Management Utility
// Implements cookie functionality based on the cookie policy

export interface CookiePreferences {
  essential: boolean; // Always true - required for basic functionality
  advertising: boolean; // Google AdSense cookies
  preferences: boolean; // UI preferences, filter settings, search preferences
  analytics: boolean; // Currently not used, but available for future
}

export const DEFAULT_COOKIE_PREFERENCES: CookiePreferences = {
  essential: true, // Always required
  advertising: false,
  preferences: false,
  analytics: false, // Not implemented per policy
};

// Cookie names used by the application
export const COOKIE_NAMES = {
  CONSENT: 'grantify_cookie_consent',
  CONSENT_DATE: 'grantify_cookie_consent_date',
  PREFERENCES_VERSION: 'grantify_preferences_version',
  // Essential cookies (managed by browser/framework)
  SESSION: 'grantify_session',
  CSRF: 'grantify_csrf_token',
  // Preference cookies
  UI_THEME: 'grantify_ui_theme',
  FILTER_PREFERENCES: 'grantify_filter_preferences',
  SEARCH_PREFERENCES: 'grantify_search_preferences',
  ACCESSIBILITY: 'grantify_accessibility_settings',
  DASHBOARD_LAYOUT: 'grantify_dashboard_layout',
} as const;

class CookieManager {
  private preferences: CookiePreferences = { ...DEFAULT_COOKIE_PREFERENCES };
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSavedPreferences();
    }
  }

  /**
   * Initialize cookie manager and load saved preferences
   */
  initialize(): void {
    if (this.isInitialized) return;
    
    this.loadSavedPreferences();
    this.applyPreferences();
    this.isInitialized = true;
  }

  /**
   * Load saved cookie preferences from localStorage
   */
  private loadSavedPreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(COOKIE_NAMES.CONSENT);
      if (saved) {
        const parsed = JSON.parse(saved) as CookiePreferences;
        this.preferences = {
          ...DEFAULT_COOKIE_PREFERENCES,
          ...parsed,
          essential: true, // Always ensure essential is true
        };
      }
    } catch (error) {
      
      this.preferences = { ...DEFAULT_COOKIE_PREFERENCES };
    }
  }

  /**
   * Save cookie preferences to localStorage
   */
  private savePreferences(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(COOKIE_NAMES.CONSENT, JSON.stringify(this.preferences));
      localStorage.setItem(COOKIE_NAMES.CONSENT_DATE, new Date().toISOString());
      localStorage.setItem(COOKIE_NAMES.PREFERENCES_VERSION, '1.0');
    } catch (error) {
      
    }
  }

  /**
   * Update cookie preferences and apply changes
   */
  updatePreferences(newPreferences: Partial<CookiePreferences>): void {
    const oldPreferences = { ...this.preferences };
    
    this.preferences = {
      ...this.preferences,
      ...newPreferences,
      essential: true, // Always ensure essential is true
    };

    this.savePreferences();
    this.applyPreferences();
    
    // Emit event for other components to react to changes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cookiePreferencesChanged', {
        detail: { 
          old: oldPreferences, 
          new: this.preferences 
        }
      }));
    }
  }

  /**
   * Apply current preferences (enable/disable functionality)
   */
  private applyPreferences(): void {
    if (typeof window === 'undefined') return;

    // Handle advertising cookies (Google AdSense)
    if (this.preferences.advertising) {
      this.enableAdSense();
    } else {
      this.disableAdSense();
    }

    // Handle analytics cookies (currently not implemented per policy)
    if (this.preferences.analytics) {
      this.enableAnalytics();
    } else {
      this.disableAnalytics();
    }

    // Preference cookies are handled by individual components
    // They check permissions before setting cookies
  }

  /**
   * Enable Google AdSense
   */
  private enableAdSense(): void {
    if (typeof window !== 'undefined') {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      if ((window as any).adsbygoogle.pauseAdRequests) {
        (window as any).adsbygoogle.pauseAdRequests = 0;
      }
    }
  }

  /**
   * Disable Google AdSense
   */
  private disableAdSense(): void {
    if (typeof window !== 'undefined') {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.pauseAdRequests = 1;
    }
  }

  /**
   * Enable analytics (placeholder for future implementation)
   */
  private enableAnalytics(): void {
    // Currently not implemented per cookie policy
  }

  /**
   * Disable analytics (placeholder for future implementation)
   */
  private disableAnalytics(): void {
    // Currently not implemented per cookie policy
  }

  /**
   * Get current cookie preferences
   */
  getPreferences(): CookiePreferences {
    return { ...this.preferences };
  }

  /**
   * Check if user has made a cookie choice
   */
  hasConsent(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(COOKIE_NAMES.CONSENT) !== null;
  }

  /**
   * Check if specific cookie type is allowed
   */
  isAllowed(cookieType: keyof CookiePreferences): boolean {
    return this.preferences[cookieType];
  }

  /**
   * Reset all preferences and clear stored data
   */
  resetPreferences(): void {
    if (typeof window === 'undefined') return;

    // Clear consent data
    localStorage.removeItem(COOKIE_NAMES.CONSENT);
    localStorage.removeItem(COOKIE_NAMES.CONSENT_DATE);
    localStorage.removeItem(COOKIE_NAMES.PREFERENCES_VERSION);

    // Clear preference cookies if they exist
    if (this.preferences.preferences) {
      this.clearPreferenceCookies();
    }

    // Reset to defaults
    this.preferences = { ...DEFAULT_COOKIE_PREFERENCES };
    this.applyPreferences();

    // Emit reset event
    window.dispatchEvent(new CustomEvent('cookiePreferencesReset'));
  }

  /**
   * Clear all preference cookies
   */
  private clearPreferenceCookies(): void {
    if (typeof window === 'undefined') return;

    const preferenceCookies = [
      COOKIE_NAMES.UI_THEME,
      COOKIE_NAMES.FILTER_PREFERENCES,
      COOKIE_NAMES.SEARCH_PREFERENCES,
      COOKIE_NAMES.ACCESSIBILITY,
      COOKIE_NAMES.DASHBOARD_LAYOUT,
    ];

    preferenceCookies.forEach(cookieName => {
      // Clear from localStorage
      localStorage.removeItem(cookieName);
      
      // Clear HTTP cookies by setting them to expire
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
  }

  /**
   * Accept all cookies
   */
  acceptAll(): void {
    this.updatePreferences({
      essential: true,
      advertising: true,
      preferences: true,
      analytics: false, // Keep false as per policy
    });
  }

  /**
   * Accept only essential cookies
   */
  acceptEssentialOnly(): void {
    this.updatePreferences({
      essential: true,
      advertising: false,
      preferences: false,
      analytics: false,
    });
  }
}

// Preference Cookie Utilities
export class PreferenceCookieManager {
  private cookieManager: CookieManager;

  constructor(cookieManager: CookieManager) {
    this.cookieManager = cookieManager;
  }

  /**
   * Set a preference cookie if allowed
   */
  setPreference(key: string, value: any, expirationDays: number = 365): boolean {
    if (!this.cookieManager.isAllowed('preferences')) {
      
      return false;
    }

    if (typeof window === 'undefined') return false;

    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
      
      // Also set as HTTP cookie for server-side access if needed
      const expires = new Date();
      expires.setTime(expires.getTime() + (expirationDays * 24 * 60 * 60 * 1000));
      document.cookie = `${key}=${encodeURIComponent(stringValue)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      return true;
    } catch (error) {
      
      return false;
    }
  }

  /**
   * Get a preference cookie value
   */
  getPreference<T = string>(key: string, defaultValue?: T): T | undefined {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const value = localStorage.getItem(key);
      if (value === null) return defaultValue;
      
      // Try to parse as JSON, fall back to string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      
      return defaultValue;
    }
  }

  /**
   * Remove a preference cookie
   */
  removePreference(key: string): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(key);
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }

  /**
   * Check if preferences cookies are allowed
   */
  isAllowed(): boolean {
    return this.cookieManager.isAllowed('preferences');
  }
}

// Create singleton instances
export const cookieManager = new CookieManager();
export const preferenceCookieManager = new PreferenceCookieManager(cookieManager);

// Initialize when module loads
if (typeof window !== 'undefined') {
  cookieManager.initialize();
}

export default cookieManager;
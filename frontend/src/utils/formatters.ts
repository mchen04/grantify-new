/**
 * Utility functions for formatting and displaying data consistently across the application
 */

/**
 * Format a date string to a human-readable format
 * @param dateString - ISO date string or null
 * @returns Formatted date string
 */
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'No deadline specified';
  
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Calculate days remaining from a date string
 * @param dateString - ISO date string or null
 * @returns Number of days remaining or null if no date
 */
export const calculateDaysRemaining = (dateString: string | null): number | null => {
  if (!dateString) return null;
  
  return Math.ceil(
    (new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
};

/**
 * Format a number as currency
 * @param amount - Amount to format or null
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === undefined) return 'Not specified';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Truncate text with ellipsis if it exceeds the specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis or original text
 */
export const truncateText = (text: string | null | undefined, maxLength: number): string => {
  if (!text) return 'No description available';
  
  return text.length > maxLength
    ? `${text.substring(0, maxLength)}...`
    : text;
};

/**
 * Get appropriate deadline color based on days remaining
 * @param daysRemaining - Number of days remaining or null
 * @returns CSS class name for the appropriate color
 */
export const getDeadlineColorClass = (daysRemaining: number | null): string => {
  if (daysRemaining === null) return 'text-green-600';
  if (daysRemaining < 30) return 'text-red-600';
  if (daysRemaining < 60) return 'text-orange-600';
  return 'text-green-600';
};

/**
 * Parse text content to extract URLs and convert them to clickable links
 * @param text - Text content that may contain URLs
 * @returns Array of text segments and link objects
 */
export const parseTextWithLinks = (text: string): Array<{ type: 'text' | 'link'; content: string; url?: string; title?: string }> => {
  if (!text) return [];

  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const segments: Array<{ type: 'text' | 'link'; content: string; url?: string; title?: string }> = [];
  
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }

    const url = match[0];
    const title = extractTitleFromUrl(url);
    
    segments.push({
      type: 'link',
      content: title,
      url: url,
      title: url
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return segments;
};

/**
 * Extract a readable title from a URL
 * @param url - URL to extract title from
 * @returns Formatted title for the link
 */
const extractTitleFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    if (pathname === '/' || pathname === '') {
      return urlObj.hostname;
    }
    
    const filename = pathname.split('/').pop() || '';
    if (filename.includes('.')) {
      const name = filename.split('.')[0];
      const extension = filename.split('.').pop()?.toUpperCase();
      return `${name.replace(/[-_]/g, ' ')} (${extension})`;
    }
    
    return filename.replace(/[-_]/g, ' ') || urlObj.hostname;
  } catch {
    return 'External Link';
  }
};
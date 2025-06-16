"use client";

/**
 * Collection of SVG icons used in the grant card components
 */
export const GrantCardIcons = {
  /**
   * Save icon (bookmark)
   * @param fill - Whether to fill the icon (for active state)
   */
  Save: ({ fill = false }: { fill?: boolean }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      fill={fill ? "currentColor" : "none"} 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" 
      />
    </svg>
  ),

  /**
   * Ignore icon (X)
   * @param fill - Whether to fill the icon (for active state)
   */
  Ignore: ({ fill = false }: { fill?: boolean }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      fill={fill ? "currentColor" : "none"} 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M6 18L18 6M6 6l12 12" 
      />
    </svg>
  ),

  /**
   * Apply icon (checkmark in circle)
   * @param fill - Whether to fill the icon (for active state)
   */
  Apply: ({ fill = false }: { fill?: boolean }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      fill={fill ? "currentColor" : "none"} 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  ),

  /**
   * Share icon
   */
  Share: () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className="h-5 w-5" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" 
      />
    </svg>
  )
};

export default GrantCardIcons;
import { formatCurrency, formatDate, truncateText, calculateDaysRemaining } from '../formatters'

describe('Formatters', () => {
  describe('formatCurrency', () => {
    it('should format null as "Not specified"', () => {
      expect(formatCurrency(null)).toBe('Not specified')
    })

    it('should format undefined as "Not specified"', () => {
      expect(formatCurrency(undefined)).toBe('Not specified')
    })

    it('should format amounts with currency format', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000')
      expect(formatCurrency(1500000)).toBe('$1,500,000')
      expect(formatCurrency(1000)).toBe('$1,000')
      expect(formatCurrency(1500)).toBe('$1,500')
    })

    it('should format small amounts without decimals', () => {
      expect(formatCurrency(500)).toBe('$500')
      expect(formatCurrency(100)).toBe('$100')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0')
    })
  })

  describe('formatDate', () => {
    it('should format valid date strings', () => {
      const result = formatDate('2024-12-31')
      // Note: Date may be parsed differently based on timezone
      expect(result).toMatch(/Dec 3[01], 2024/)
    })

    it('should handle null dates', () => {
      expect(formatDate(null)).toBe('No deadline specified')
    })

    it('should handle empty string dates', () => {
      expect(formatDate('')).toBe('No deadline specified')
    })
  })

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated at the specified limit'
      const result = truncateText(longText, 20)
      expect(result).toBe('This is a very long ...')
      expect(result.length).toBe(23) // 20 + "..."
    })

    it('should not truncate short text', () => {
      const shortText = 'Short text'
      const result = truncateText(shortText, 20)
      expect(result).toBe('Short text')
    })

    it('should handle null/undefined/empty string', () => {
      expect(truncateText('', 20)).toBe('No description available')
      expect(truncateText(null, 20)).toBe('No description available')
      expect(truncateText(undefined, 20)).toBe('No description available')
    })
  })

  describe('calculateDaysRemaining', () => {
    it('should return null for null dates', () => {
      expect(calculateDaysRemaining(null)).toBeNull()
    })

    it('should calculate days for future dates', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const result = calculateDaysRemaining(futureDate.toISOString())
      expect(result).toBeGreaterThan(9)
      expect(result).toBeLessThan(11)
    })

    it('should calculate negative days for past dates', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      const result = calculateDaysRemaining(pastDate.toISOString())
      expect(result).toBeLessThan(0)
    })
  })
})
import { DEFAULT_FILTER_VALUES } from '../constants'

describe('Constants', () => {
  describe('DEFAULT_FILTER_VALUES', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_FILTER_VALUES.searchTerm).toBe('')
      expect(DEFAULT_FILTER_VALUES.sortBy).toBe('relevance')
      expect(DEFAULT_FILTER_VALUES.page).toBe(1)
      expect(DEFAULT_FILTER_VALUES.limit).toBe(20)
    })

    it('should have all required properties', () => {
      const requiredProperties = [
        'searchTerm',
        'sortBy', 
        'page',
        'limit',
        'fundingMin',
        'fundingMax',
        'deadlineMinDays',
        'deadlineMaxDays'
      ]
      
      requiredProperties.forEach(prop => {
        expect(DEFAULT_FILTER_VALUES).toHaveProperty(prop)
      })
    })
  })
})
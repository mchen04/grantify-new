import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import useFetchGrants from '../useFetchGrants'
import { mockGrants } from '../../../__tests__/utils/test-utils'

// Mock the API client
jest.mock('@/lib/apiClient', () => ({
  get: jest.fn(),
}))

import { get } from '@/lib/apiClient'
const mockedGet = get as jest.MockedFunction<typeof get>

describe('useFetchGrants', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHook(() => useFetchGrants())
      
      expect(result.current.grants).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.hasMore).toBe(true)
      expect(result.current.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      })
    })
  })

  describe('Search Functionality', () => {
    it('searches grants successfully', async () => {
      const mockResponse = {
        grants: mockGrants,
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          pages: 1,
        },
        filters: {
          agencies: ['Test Agency'],
          categories: ['Research'],
        },
      }

      mockedGet.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useFetchGrants())

      act(() => {
        result.current.searchGrants({ searchTerm: 'cancer' })
      })

      // Should be loading initially
      expect(result.current.loading).toBe(true)

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.grants).toEqual(mockGrants)
      expect(result.current.pagination).toEqual(mockResponse.pagination)
      expect(result.current.availableFilters).toEqual(mockResponse.filters)
      expect(result.current.error).toBeNull()
    })

    it('handles search errors gracefully', async () => {
      const errorMessage = 'Network error'
      mockedGet.mockRejectedValueOnce(new Error(errorMessage))

      const { result } = renderHook(() => useFetchGrants())

      act(() => {
        result.current.searchGrants({ searchTerm: 'cancer' })
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe(errorMessage)
      expect(result.current.grants).toEqual([])
    })

    it('builds correct API parameters', async () => {
      const mockResponse = {
        grants: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        filters: {},
      }

      mockedGet.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useFetchGrants())

      const filters = {
        searchTerm: 'cancer research',
        agencies: ['NIH'],
        categories: ['Health'],
        fundingMin: 100000,
        fundingMax: 500000,
        sortBy: 'relevance' as const,
      }

      act(() => {
        result.current.searchGrants(filters)
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockedGet).toHaveBeenCalledWith('/api/grants', {
        searchTerm: 'cancer research',
        agencies: 'NIH',
        categories: 'Health',
        fundingMin: 100000,
        fundingMax: 500000,
        sortBy: 'relevance',
        page: 1,
        limit: 20,
      })
    })

    it('handles pagination correctly', async () => {
      const mockResponse = {
        grants: mockGrants,
        pagination: { page: 1, limit: 20, total: 100, pages: 5 },
        filters: {},
      }

      mockedGet.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useFetchGrants())

      act(() => {
        result.current.searchGrants({ searchTerm: 'test' }, 2)
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockedGet).toHaveBeenCalledWith('/api/grants', expect.objectContaining({
        page: 2,
      }))
    })
  })

  describe('Load More Functionality', () => {
    it('loads more grants and appends to existing list', async () => {
      const initialResponse = {
        grants: [mockGrants[0]],
        pagination: { page: 1, limit: 1, total: 2, pages: 2 },
        filters: {},
      }

      const moreResponse = {
        grants: [mockGrants[1]],
        pagination: { page: 2, limit: 1, total: 2, pages: 2 },
        filters: {},
      }

      mockedGet.mockResolvedValueOnce(initialResponse)

      const { result } = renderHook(() => useFetchGrants())

      // Initial search
      act(() => {
        result.current.searchGrants({ searchTerm: 'test' })
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.grants).toHaveLength(1)
      expect(result.current.hasMore).toBe(true)

      // Load more
      mockedGet.mockResolvedValueOnce(moreResponse)

      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.grants).toHaveLength(2)
      expect(result.current.grants).toEqual(mockGrants)
      expect(result.current.hasMore).toBe(false)
    })

    it('handles load more errors without affecting existing grants', async () => {
      const initialResponse = {
        grants: [mockGrants[0]],
        pagination: { page: 1, limit: 1, total: 2, pages: 2 },
        filters: {},
      }

      mockedGet.mockResolvedValueOnce(initialResponse)

      const { result } = renderHook(() => useFetchGrants())

      // Initial search
      act(() => {
        result.current.searchGrants({ searchTerm: 'test' })
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Load more fails
      mockedGet.mockRejectedValueOnce(new Error('Load more failed'))

      act(() => {
        result.current.loadMore()
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.grants).toHaveLength(1) // Original grants preserved
      expect(result.current.error).toBe('Load more failed')
    })

    it('does not load more when hasMore is false', () => {
      const { result } = renderHook(() => useFetchGrants())

      // Set hasMore to false
      act(() => {
        result.current.searchGrants({ searchTerm: 'test' })
      })

      // Mock response with no more pages
      const mockResponse = {
        grants: mockGrants,
        pagination: { page: 1, limit: 20, total: 2, pages: 1 },
        filters: {},
      }

      mockedGet.mockResolvedValueOnce(mockResponse)

      act(() => {
        result.current.loadMore()
      })

      // Should not make additional API call
      expect(mockedGet).toHaveBeenCalledTimes(1)
    })
  })

  describe('Clear Functionality', () => {
    it('clears grants and resets state', async () => {
      const mockResponse = {
        grants: mockGrants,
        pagination: { page: 1, limit: 20, total: 2, pages: 1 },
        filters: {},
      }

      mockedGet.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useFetchGrants())

      // Search first
      act(() => {
        result.current.searchGrants({ searchTerm: 'test' })
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.grants).toHaveLength(2)

      // Clear
      act(() => {
        result.current.clearGrants()
      })

      expect(result.current.grants).toEqual([])
      expect(result.current.error).toBeNull()
      expect(result.current.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      })
    })
  })

  describe('Edge Cases', () => {
    it('handles empty search results', async () => {
      const mockResponse = {
        grants: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        filters: {},
      }

      mockedGet.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useFetchGrants())

      act(() => {
        result.current.searchGrants({ searchTerm: 'nonexistent' })
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.grants).toEqual([])
      expect(result.current.hasMore).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('handles malformed API responses', async () => {
      mockedGet.mockResolvedValueOnce({} as any) // Malformed response

      const { result } = renderHook(() => useFetchGrants())

      act(() => {
        result.current.searchGrants({ searchTerm: 'test' })
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
    })

    it('cancels previous request when new search is initiated', async () => {
      const { result } = renderHook(() => useFetchGrants())

      // Start first search
      act(() => {
        result.current.searchGrants({ searchTerm: 'first' })
      })

      // Immediately start second search
      act(() => {
        result.current.searchGrants({ searchTerm: 'second' })
      })

      // Should only have made the most recent call
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockedGet).toHaveBeenLastCalledWith('/api/grants', expect.objectContaining({
        searchTerm: 'second',
      }))
    })
  })

  describe('Filter Handling', () => {
    it('handles array filters correctly', async () => {
      const mockResponse = {
        grants: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        filters: {},
      }

      mockedGet.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useFetchGrants())

      act(() => {
        result.current.searchGrants({
          agencies: ['NIH', 'NSF'],
          categories: ['Health', 'Research'],
        })
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockedGet).toHaveBeenCalledWith('/api/grants', expect.objectContaining({
        agencies: 'NIH,NSF',
        categories: 'Health,Research',
      }))
    })

    it('excludes undefined and null values from API params', async () => {
      const mockResponse = {
        grants: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        filters: {},
      }

      mockedGet.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useFetchGrants())

      act(() => {
        result.current.searchGrants({
          searchTerm: 'test',
          fundingMin: undefined,
          fundingMax: null,
          agencies: [],
        })
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const call = mockedGet.mock.calls[0][1]
      expect(call).not.toHaveProperty('fundingMin')
      expect(call).not.toHaveProperty('fundingMax')
      expect(call).not.toHaveProperty('agencies')
    })
  })
})
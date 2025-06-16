import React from 'react'
import { screen, waitFor, within } from '@testing-library/react'
import { render, mockGrants } from '../utils/test-utils'
import SearchBar from '@/components/features/search/SearchBar'
import SearchResults from '@/components/features/search/SearchResults'
import { SearchContextProvider } from '@/contexts/SearchContext'

// Mock the API client
jest.mock('@/lib/apiClient')

describe('Search Flow Integration', () => {
  const SearchPage = () => {
    const [searchTerm, setSearchTerm] = React.useState('')
    const [isSearching, setIsSearching] = React.useState(false)
    const [grants, setGrants] = React.useState([])
    const [filters, setFilters] = React.useState({})

    const handleSearch = async (e: any, term?: string) => {
      e?.preventDefault()
      setIsSearching(true)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const searchValue = term || searchTerm
      if (searchValue.toLowerCase().includes('cancer')) {
        setGrants(mockGrants)
      } else {
        setGrants([])
      }
      
      setIsSearching(false)
    }

    return (
      <SearchContextProvider>
        <div>
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onSubmit={handleSearch}
            isSearching={isSearching}
          />
          <SearchResults
            grants={grants}
            loading={isSearching}
            error={null}
            hasMore={false}
            onLoadMore={() => {}}
            availableFilters={{}}
            onGrantSave={() => {}}
            onGrantApply={() => {}}
            onGrantIgnore={() => {}}
            onGrantShare={() => {}}
            activeFilter={filters}
          />
        </div>
      </SearchContextProvider>
    )
  }

  it('completes full search flow successfully', async () => {
    const { user } = render(<SearchPage />)

    // 1. Enter search term
    const searchInput = screen.getByPlaceholderText(/Search grants/)
    await user.type(searchInput, 'cancer research')

    // 2. Submit search
    const searchButton = screen.getByRole('button', { name: /search/i })
    await user.click(searchButton)

    // 3. Show loading state
    expect(screen.getByText('Searching...')).toBeInTheDocument()

    // 4. Display results
    await waitFor(() => {
      expect(screen.getByText('Matched Grants')).toBeInTheDocument()
    })

    // 5. Verify grants are displayed
    expect(screen.getByText('Test Research Grant')).toBeInTheDocument()
    expect(screen.getByText('Environmental Research Grant')).toBeInTheDocument()
  })

  it('handles empty search results', async () => {
    const { user } = render(<SearchPage />)

    const searchInput = screen.getByPlaceholderText(/Search grants/)
    await user.type(searchInput, 'nonexistent topic')

    const searchButton = screen.getByRole('button', { name: /search/i })
    await user.click(searchButton)

    await waitFor(() => {
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument()
    })

    // Should show empty state or no results message
    expect(screen.queryByText('Test Research Grant')).not.toBeInTheDocument()
  })

  it('allows popular search terms to trigger search', async () => {
    const { user } = render(<SearchPage />)

    // Click on popular search term
    const popularTerm = screen.getByText('Research grants')
    await user.click(popularTerm)

    // Should trigger search automatically
    await waitFor(() => {
      expect(screen.getByText('Matched Grants')).toBeInTheDocument()
    })

    // Input should be updated
    const searchInput = screen.getByPlaceholderText(/Search grants/)
    expect(searchInput).toHaveValue('research grants')
  })

  it('maintains search state during interactions', async () => {
    const { user } = render(<SearchPage />)

    // Perform search
    const searchInput = screen.getByPlaceholderText(/Search grants/)
    await user.type(searchInput, 'cancer research')
    
    const searchButton = screen.getByRole('button', { name: /search/i })
    await user.click(searchButton)

    await waitFor(() => {
      expect(screen.getByText('Test Research Grant')).toBeInTheDocument()
    })

    // Interact with grant card
    const saveButton = screen.getAllByTitle('Save Grant')[0]
    await user.click(saveButton)

    // Search results should still be visible
    expect(screen.getByText('Test Research Grant')).toBeInTheDocument()
    expect(searchInput).toHaveValue('cancer research')
  })
})
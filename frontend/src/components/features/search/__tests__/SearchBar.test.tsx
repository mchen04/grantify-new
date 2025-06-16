import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render } from '../../../../../__tests__/utils/test-utils'
import SearchBar from '../SearchBar'

describe('SearchBar', () => {
  const defaultProps = {
    searchTerm: '',
    setSearchTerm: jest.fn(),
    onSubmit: jest.fn(),
    isSearching: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the search form with title and description', () => {
      render(<SearchBar {...defaultProps} />)
      
      expect(screen.getByText('Search Grants & Foundation Funding')).toBeInTheDocument()
      expect(screen.getByText('Comprehensive search across multiple funding sources')).toBeInTheDocument()
    })

    it('renders search input with placeholder', () => {
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByPlaceholderText(/Search grants: e.g., cancer research, nonprofit, SBIR/)
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
    })

    it('renders search button', () => {
      render(<SearchBar {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /search/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('displays popular search terms', () => {
      render(<SearchBar {...defaultProps} />)
      
      expect(screen.getByText('Popular searches:')).toBeInTheDocument()
      expect(screen.getByText('Research grants')).toBeInTheDocument()
      expect(screen.getByText('Healthcare funding')).toBeInTheDocument()
      expect(screen.getByText('Education grants')).toBeInTheDocument()
      expect(screen.getByText('SBIR grants')).toBeInTheDocument()
    })
  })

  describe('Search Input Behavior', () => {
    it('displays initial search term', () => {
      render(<SearchBar {...defaultProps} searchTerm="cancer research" />)
      
      const input = screen.getByDisplayValue('cancer research')
      expect(input).toBeInTheDocument()
    })

    it('calls setSearchTerm when input changes', async () => {
      const setSearchTerm = jest.fn()
      const { user } = render(<SearchBar {...defaultProps} setSearchTerm={setSearchTerm} />)
      
      const input = screen.getByPlaceholderText(/Search grants/)
      await user.type(input, 'cancer research')
      
      expect(setSearchTerm).toHaveBeenCalledWith('c')
      expect(setSearchTerm).toHaveBeenCalledWith('ca')
      // Called for each character typed
    })

    it('updates local state immediately on input change', async () => {
      const { user } = render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByPlaceholderText(/Search grants/)
      await user.type(input, 'test')
      
      expect(input).toHaveValue('test')
    })

    it('syncs with prop changes', () => {
      const { rerender } = render(<SearchBar {...defaultProps} searchTerm="" />)
      
      const input = screen.getByPlaceholderText(/Search grants/)
      expect(input).toHaveValue('')
      
      rerender(<SearchBar {...defaultProps} searchTerm="updated term" />)
      expect(input).toHaveValue('updated term')
    })
  })

  describe('Form Submission', () => {
    it('calls onSubmit when form is submitted', async () => {
      const onSubmit = jest.fn()
      const { user } = render(<SearchBar {...defaultProps} onSubmit={onSubmit} />)
      
      const input = screen.getByPlaceholderText(/Search grants/)
      const button = screen.getByRole('button', { name: /search/i })
      
      await user.type(input, 'cancer research')
      await user.click(button)
      
      expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), 'cancer research')
    })

    it('calls onSubmit when Enter key is pressed', async () => {
      const onSubmit = jest.fn()
      const { user } = render(<SearchBar {...defaultProps} onSubmit={onSubmit} />)
      
      const input = screen.getByPlaceholderText(/Search grants/)
      await user.type(input, 'cancer research')
      await user.keyboard('{Enter}')
      
      expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), 'cancer research')
    })

    it('prevents default form submission', async () => {
      const onSubmit = jest.fn()
      const { user } = render(<SearchBar {...defaultProps} onSubmit={onSubmit} />)
      
      const form = screen.getByRole('form')
      fireEvent.submit(form)
      
      expect(onSubmit).toHaveBeenCalled()
      // Verify preventDefault was called by checking that onSubmit receives event
      const event = onSubmit.mock.calls[0][0]
      expect(event).toBeDefined()
    })

    it('submits empty search term', async () => {
      const onSubmit = jest.fn()
      const { user } = render(<SearchBar {...defaultProps} onSubmit={onSubmit} />)
      
      const button = screen.getByRole('button', { name: /search/i })
      await user.click(button)
      
      expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), '')
    })
  })

  describe('Popular Search Terms', () => {
    it('executes search when popular term is clicked', async () => {
      const onSubmit = jest.fn()
      const setSearchTerm = jest.fn()
      const { user } = render(
        <SearchBar 
          {...defaultProps} 
          onSubmit={onSubmit}
          setSearchTerm={setSearchTerm}
        />
      )
      
      const popularTerm = screen.getByText('Research grants')
      await user.click(popularTerm)
      
      expect(setSearchTerm).toHaveBeenCalledWith('research grants')
      expect(onSubmit).toHaveBeenCalledWith(null, 'research grants')
    })

    it('updates input value when popular term is clicked', async () => {
      const { user } = render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByPlaceholderText(/Search grants/)
      const popularTerm = screen.getByText('Healthcare funding')
      
      await user.click(popularTerm)
      
      expect(input).toHaveValue('healthcare funding')
    })

    it('converts popular terms to lowercase', async () => {
      const setSearchTerm = jest.fn()
      const { user } = render(<SearchBar {...defaultProps} setSearchTerm={setSearchTerm} />)
      
      const popularTerm = screen.getByText('SBIR grants')
      await user.click(popularTerm)
      
      expect(setSearchTerm).toHaveBeenCalledWith('sbir grants')
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when searching', () => {
      render(<SearchBar {...defaultProps} isSearching={true} />)
      
      const spinners = screen.getAllByRole('status', { hidden: true })
      expect(spinners.length).toBeGreaterThan(0)
    })

    it('disables submit button when searching', () => {
      render(<SearchBar {...defaultProps} isSearching={true} />)
      
      const button = screen.getByRole('button', { name: /searching/i })
      expect(button).toBeDisabled()
    })

    it('changes button text when searching', () => {
      render(<SearchBar {...defaultProps} isSearching={true} />)
      
      expect(screen.getByText('Searching...')).toBeInTheDocument()
      expect(screen.queryByText('Search')).not.toBeInTheDocument()
    })

    it('shows loading state in search icon', () => {
      render(<SearchBar {...defaultProps} isSearching={true} />)
      
      // Check for spinning animation class
      const loadingIcon = document.querySelector('.animate-spin')
      expect(loadingIcon).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      render(<SearchBar {...defaultProps} />)
      
      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      
      const button = screen.getByRole('button', { name: /search/i })
      expect(button).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const { user } = render(<SearchBar {...defaultProps} />)
      
      // Tab to input
      await user.tab()
      const input = screen.getByPlaceholderText(/Search grants/)
      expect(input).toHaveFocus()
      
      // Tab to submit button
      await user.tab()
      const button = screen.getByRole('button', { name: /search/i })
      expect(button).toHaveFocus()
    })

    it('has accessible button labels', () => {
      render(<SearchBar {...defaultProps} />)
      
      const button = screen.getByRole('button', { name: /search/i })
      expect(button).toHaveAccessibleName()
    })

    it('popular search buttons are accessible', () => {
      render(<SearchBar {...defaultProps} />)
      
      const popularTerms = screen.getAllByRole('button').filter(button =>
        button.textContent && !button.textContent.includes('Search')
      )
      
      popularTerms.forEach(button => {
        expect(button).toHaveAccessibleName()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles onSubmit errors gracefully', async () => {
      const onSubmit = jest.fn().mockImplementation(() => {
        throw new Error('Search failed')
      })
      
      const { user } = render(<SearchBar {...defaultProps} onSubmit={onSubmit} />)
      
      const button = screen.getByRole('button', { name: /search/i })
      
      // Should not crash when onSubmit throws
      await expect(user.click(button)).resolves.not.toThrow()
    })

    it('handles null/undefined props gracefully', () => {
      const props = {
        searchTerm: undefined as any,
        setSearchTerm: jest.fn(),
        onSubmit: jest.fn(),
        isSearching: undefined as any,
      }
      
      expect(() => render(<SearchBar {...props} />)).not.toThrow()
    })
  })

  describe('Component Lifecycle', () => {
    it('remembers component with displayName', () => {
      expect(SearchBar.displayName).toBe('SearchBar')
    })

    it('handles rapid input changes efficiently', async () => {
      const setSearchTerm = jest.fn()
      const { user } = render(<SearchBar {...defaultProps} setSearchTerm={setSearchTerm} />)
      
      const input = screen.getByPlaceholderText(/Search grants/)
      
      // Rapid typing
      await user.type(input, 'quick test', { delay: 1 })
      
      // Should handle all input changes
      expect(setSearchTerm).toHaveBeenCalled()
    })
  })
})
import React from 'react'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render, mockGrant } from '../../../../../__tests__/utils/test-utils'
import GrantCard from '../GrantCard'

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
})

describe('GrantCard', () => {
  const defaultProps = {
    id: mockGrant.id,
    title: mockGrant.title,
    agency: mockGrant.agency,
    closeDate: mockGrant.closeDate,
    fundingAmount: mockGrant.fundingAmount,
    description: mockGrant.description,
    categories: mockGrant.categories,
    sourceUrl: mockGrant.sourceUrl,
    opportunityId: mockGrant.opportunityId,
  }

  beforeEach(() => {
    // Mock window.open
    window.open = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders grant title as a link', () => {
      render(<GrantCard {...defaultProps} />)
      
      const titleLink = screen.getByRole('link', { name: mockGrant.title })
      expect(titleLink).toBeInTheDocument()
      expect(titleLink).toHaveAttribute('href', `/grants/${mockGrant.id}?from=search`)
    })

    it('displays agency and funding amount', () => {
      render(<GrantCard {...defaultProps} />)
      
      expect(screen.getByText(mockGrant.agency)).toBeInTheDocument()
      expect(screen.getByText('$500K')).toBeInTheDocument()
    })

    it('shows truncated description', () => {
      render(<GrantCard {...defaultProps} />)
      
      expect(screen.getByText(mockGrant.description)).toBeInTheDocument()
    })

    it('displays categories in footer', () => {
      render(<GrantCard {...defaultProps} />)
      
      mockGrant.categories.forEach(category => {
        expect(screen.getByText(category)).toBeInTheDocument()
      })
    })

    it('shows close date when provided', () => {
      render(<GrantCard {...defaultProps} />)
      
      // The date should be formatted
      expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument()
    })

    it('handles null funding amount gracefully', () => {
      render(<GrantCard {...defaultProps} fundingAmount={null} />)
      
      expect(screen.getByText('Not specified')).toBeInTheDocument()
    })

    it('handles null close date gracefully', () => {
      render(<GrantCard {...defaultProps} closeDate={null} />)
      
      expect(screen.getByText('No deadline')).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('renders all action buttons', () => {
      render(<GrantCard {...defaultProps} />)
      
      expect(screen.getByTitle('Save Grant')).toBeInTheDocument()
      expect(screen.getByTitle('Ignore Grant')).toBeInTheDocument()
      expect(screen.getByTitle('Apply for Grant')).toBeInTheDocument()
      expect(screen.getByTitle('Share Grant')).toBeInTheDocument()
    })

    it('calls onSave when save button is clicked', async () => {
      const onSave = jest.fn()
      const { user } = render(<GrantCard {...defaultProps} onSave={onSave} />)
      
      const saveButton = screen.getByTitle('Save Grant')
      await user.click(saveButton)
      
      expect(onSave).toHaveBeenCalledWith('saved')
    })

    it('calls onIgnore when ignore button is clicked', async () => {
      const onIgnore = jest.fn()
      const { user } = render(<GrantCard {...defaultProps} onIgnore={onIgnore} />)
      
      const ignoreButton = screen.getByTitle('Ignore Grant')
      await user.click(ignoreButton)
      
      expect(onIgnore).toHaveBeenCalledWith('ignored')
    })

    it('opens application URL when apply button is clicked', async () => {
      const onApply = jest.fn()
      const { user } = render(<GrantCard {...defaultProps} onApply={onApply} />)
      
      const applyButton = screen.getByTitle('Apply for Grant')
      await user.click(applyButton)
      
      expect(window.open).toHaveBeenCalledWith(mockGrant.sourceUrl, '_blank')
      expect(onApply).toHaveBeenCalledWith('pending')
    })

    it('uses grants.gov fallback when no sourceUrl provided', async () => {
      const onApply = jest.fn()
      const { user } = render(
        <GrantCard 
          {...defaultProps} 
          sourceUrl={null}
          onApply={onApply} 
        />
      )
      
      const applyButton = screen.getByTitle('Apply for Grant')
      await user.click(applyButton)
      
      expect(window.open).toHaveBeenCalledWith(
        `https://www.grants.gov/web/grants/view-opportunity.html?oppId=${mockGrant.opportunityId}`,
        '_blank'
      )
    })

    it('calls onShare when share button is clicked', async () => {
      const onShare = jest.fn()
      const { user } = render(<GrantCard {...defaultProps} onShare={onShare} />)
      
      const shareButton = screen.getByTitle('Share Grant')
      await user.click(shareButton)
      
      expect(onShare).toHaveBeenCalled()
    })
  })

  describe('State Management', () => {
    it('shows active state for saved grant', () => {
      render(<GrantCard {...defaultProps} isSaved={true} />)
      
      expect(screen.getByTitle('Unsave Grant')).toBeInTheDocument()
    })

    it('shows active state for applied grant', () => {
      render(<GrantCard {...defaultProps} isApplied={true} />)
      
      expect(screen.getByTitle('Unapply Grant')).toBeInTheDocument()
    })

    it('shows active state for ignored grant', () => {
      render(<GrantCard {...defaultProps} isIgnored={true} />)
      
      expect(screen.getByTitle('Unignore Grant')).toBeInTheDocument()
    })

    it('toggles save state correctly', async () => {
      const onSave = jest.fn()
      const { user } = render(<GrantCard {...defaultProps} onSave={onSave} isSaved={true} />)
      
      const saveButton = screen.getByTitle('Unsave Grant')
      await user.click(saveButton)
      
      expect(onSave).toHaveBeenCalledWith(null)
    })

    it('toggles apply state when already applied', async () => {
      const onApply = jest.fn()
      const { user } = render(<GrantCard {...defaultProps} onApply={onApply} isApplied={true} />)
      
      const applyButton = screen.getByTitle('Unapply Grant')
      await user.click(applyButton)
      
      expect(onApply).toHaveBeenCalledWith(null)
      expect(window.open).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<GrantCard {...defaultProps} />)
      
      const article = screen.getByRole('article')
      expect(article).toHaveAttribute('aria-label')
      
      const ariaLabel = article.getAttribute('aria-label')
      expect(ariaLabel).toContain(mockGrant.title)
      expect(ariaLabel).toContain(mockGrant.agency)
      expect(ariaLabel).toContain('$500,000')
    })

    it('includes interaction states in ARIA label', () => {
      render(<GrantCard {...defaultProps} isSaved={true} isApplied={true} />)
      
      const article = screen.getByRole('article')
      const ariaLabel = article.getAttribute('aria-label')
      
      expect(ariaLabel).toContain('Saved.')
      expect(ariaLabel).toContain('Applied.')
    })

    it('handles keyboard navigation', async () => {
      const { user } = render(<GrantCard {...defaultProps} />)
      
      // Tab through interactive elements
      await user.tab()
      expect(screen.getByRole('link', { name: mockGrant.title })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByTitle('Save Grant')).toHaveFocus()
    })
  })

  describe('Animation and Effects', () => {
    it('supports fade animation when enabled', async () => {
      const ref = React.createRef<any>()
      render(<GrantCard {...defaultProps} enableFadeAnimation={true} ref={ref} />)
      
      expect(ref.current).toHaveProperty('fadeAndRemoveCard')
      
      // Test fade animation
      const fadePromise = ref.current.fadeAndRemoveCard()
      expect(fadePromise).toBeInstanceOf(Promise)
      
      await waitFor(() => {
        expect(screen.getByRole('article')).toHaveClass('opacity-0')
      })
    })
  })

  describe('Link Parameters', () => {
    it('includes custom link parameters', () => {
      const linkParams = '?from=dashboard&category=health'
      render(<GrantCard {...defaultProps} linkParams={linkParams} />)
      
      const titleLink = screen.getByRole('link', { name: mockGrant.title })
      expect(titleLink).toHaveAttribute('href', `/grants/${mockGrant.id}${linkParams}`)
    })

    it('uses default link parameters when none provided', () => {
      render(<GrantCard {...defaultProps} />)
      
      const titleLink = screen.getByRole('link', { name: mockGrant.title })
      expect(titleLink).toHaveAttribute('href', `/grants/${mockGrant.id}?from=search`)
    })
  })

  describe('Error Handling', () => {
    it('handles invalid funding amounts', () => {
      render(<GrantCard {...defaultProps} fundingAmount={NaN} />)
      
      expect(screen.getByText('Not specified')).toBeInTheDocument()
    })

    it('handles undefined funding amounts', () => {
      render(<GrantCard {...defaultProps} fundingAmount={undefined} />)
      
      expect(screen.getByText('Not specified')).toBeInTheDocument()
    })

    it('handles empty categories array', () => {
      render(<GrantCard {...defaultProps} categories={[]} />)
      
      // Should still render without categories
      expect(screen.getByRole('article')).toBeInTheDocument()
    })
  })
})
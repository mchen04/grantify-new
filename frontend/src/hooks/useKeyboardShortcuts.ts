import { useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ShortcutHandler {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  // Global shortcuts
  const globalShortcuts: ShortcutHandler[] = [
    {
      key: 'k',
      ctrl: true,
      meta: true,
      handler: () => {
        // Focus search bar
        const searchInput = document.querySelector('input[placeholder*="Search grants"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Open quick search'
    },
    {
      key: 'p',
      ctrl: true,
      meta: true,
      handler: () => {
        if (user) {
          router.push('/preferences');
        }
      },
      description: 'Open user preferences'
    },
    {
      key: '/',
      handler: () => {
        // Focus search bar when pressing /
        const searchInput = document.querySelector('input[placeholder*="Search grants"]') as HTMLInputElement;
        if (searchInput && document.activeElement?.tagName !== 'INPUT') {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: 'Focus search bar'
    },
    {
      key: '?',
      shift: true,
      handler: () => {
        // Show keyboard shortcuts help modal
        const event = new CustomEvent('showKeyboardHelp');
        window.dispatchEvent(event);
      },
      description: 'Show keyboard shortcuts'
    },
    {
      key: 'Escape',
      handler: () => {
        // Close modals, dropdowns, etc.
        const event = new CustomEvent('closeAllModals');
        window.dispatchEvent(event);
        
        // Remove focus from active element
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      },
      description: 'Close modals and dropdowns'
    }
  ];

  // Page-specific shortcuts (only implemented ones)
  const pageShortcuts: Record<string, ShortcutHandler[]> = {
    // Note: Most page-specific shortcuts are not yet implemented
    // Only including working shortcuts to avoid user confusion
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    try {
      // Don't trigger shortcuts when typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        // Exception for / key to focus search
        if (event.key !== '/' || event.target instanceof HTMLInputElement) {
          return;
        }
      }

      // Check global shortcuts
      const allShortcuts = [
        ...globalShortcuts,
        ...(pageShortcuts[pathname] || [])
      ];

      for (const shortcut of allShortcuts) {
        const ctrlOrMeta = shortcut.ctrl || shortcut.meta;
        const isCtrlPressed = event.ctrlKey || event.metaKey;
        
        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (!ctrlOrMeta || isCtrlPressed) &&
          (!shortcut.shift || event.shiftKey)
        ) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    } catch (error) {
      
    }
  }, [pathname, user, globalShortcuts, pageShortcuts]);

  // Stabilize event listener registration
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts: [
      ...globalShortcuts,
      ...(pageShortcuts[pathname] || [])
    ]
  };
}
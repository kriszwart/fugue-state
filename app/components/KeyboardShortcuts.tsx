'use client'

import { useEffect } from 'react'

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !(e.ctrlKey || e.metaKey)
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey
        const altMatch = shortcut.alt ? e.altKey : !e.altKey
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()

        if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault()
          shortcut.action()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])
}

// Common shortcuts for the studio
export const STUDIO_SHORTCUTS = {
  FOCUS_CHAT: { key: 'k', ctrl: true, description: 'Focus chat input' },
  SEND_MESSAGE: { key: 'Enter', description: 'Send message (when chat focused)' },
  NEW_LINE: { key: 'Enter', shift: true, description: 'New line in chat' },
  CLEAR_CHAT: { key: 'l', ctrl: true, shift: true, description: 'Clear chat' },
  UPLOAD_FILE: { key: 'u', ctrl: true, description: 'Upload file' },
  SETTINGS: { key: ',', ctrl: true, description: 'Open settings' },
}











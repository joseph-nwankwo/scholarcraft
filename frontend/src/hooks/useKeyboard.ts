import { useEffect, useCallback } from 'react'

type KeyCombo = string
type KeyHandler = (e: KeyboardEvent) => void

function parseKeyCombo(combo: KeyCombo): { key: string; meta: boolean; ctrl: boolean; shift: boolean; alt: boolean } {
  const parts = combo.toLowerCase().split('+')
  return {
    key: parts[parts.length - 1],
    meta: parts.includes('meta') || parts.includes('cmd'),
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
  }
}

export function useKeyboard(combos: Record<KeyCombo, KeyHandler>) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      for (const [combo, fn] of Object.entries(combos)) {
        const parsed = parseKeyCombo(combo)
        const keyMatches = e.key.toLowerCase() === parsed.key
        const metaMatches = parsed.meta === (e.metaKey || e.ctrlKey)
        const ctrlMatches = !parsed.meta && parsed.ctrl === e.ctrlKey
        const shiftMatches = parsed.shift === e.shiftKey
        const altMatches = parsed.alt === e.altKey

        if (keyMatches && (metaMatches || ctrlMatches) && shiftMatches && altMatches) {
          e.preventDefault()
          fn(e)
        }
      }
    },
    [combos]
  )

  useEffect(() => {
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handler])
}

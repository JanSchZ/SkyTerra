import { useState, useRef, useCallback, useEffect } from 'react'

export default function useModal() {
  const [isOpen, setIsOpen] = useState(false)
  const lastFocused = useRef<Element | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  const open = useCallback(() => {
    lastFocused.current = document.activeElement
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusable = modalRef.current.querySelector<HTMLElement>('[tabindex]')
      ;(focusable || modalRef.current).focus()
    } else if (!isOpen && lastFocused.current instanceof HTMLElement) {
      lastFocused.current.focus()
    }
  }, [isOpen])

  return { isOpen, open, close, modalRef }
}

// Uso:
// const { isOpen, open, close, modalRef } = useModal();

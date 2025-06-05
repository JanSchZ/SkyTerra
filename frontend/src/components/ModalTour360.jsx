import React, { useEffect } from 'react'

export default function ModalTour360({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape' || (e.metaKey && e.key.toLowerCase() === 'w')) {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const handleOutside = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center glass shadow-glass backdrop-blur-2xl"
      style={{ backdropFilter: 'blur(40px) saturate(160%)' }}
      onClick={handleOutside}
    >
      <div className="animate-fadeBlurIn scale-95" role="dialog">
        {children}
      </div>
    </div>
  )
}

// Uso:
// const { isOpen, open, close, modalRef } = useModal();
// <ModalTour360 open={isOpen} onClose={close}>
//   ...contenido...
// </ModalTour360>

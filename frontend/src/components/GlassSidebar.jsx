import React, { useState } from 'react'

export default function GlassSidebar({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="md:hidden fixed top-4 left-4 z-50 glass rounded-glass p-2 shadow-glass"
        aria-label="Menu"
        onClick={() => setOpen(true)}
      >
        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <aside
        className={`fixed top-0 left-0 h-full w-[300px] glass shadow-glass transition-[transform,opacity] duration-400 ease-[cubic-bezier(.4,0,.2,1)] ${open ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'} md:static md:translate-x-0 md:opacity-100`}
      >
        <button
          className="md:hidden absolute top-4 right-4 p-2"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
        {children}
      </aside>
      {open && (
        <div className="md:hidden fixed inset-0" onClick={() => setOpen(false)} />
      )}
    </>
  )
}

// Uso:
// <GlassSidebar>
//   ...contenido...
// </GlassSidebar>

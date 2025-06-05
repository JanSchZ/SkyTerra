import React, { useState } from 'react'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export default function GlassTopBar() {
  const [dark, setDark] = useState(false)
  const toggle = () => setDark(!dark)
  return (
    <header className="glass h-14 sticky top-0 flex items-center justify-between px-4 shadow-glass z-40">
      <div className="text-lg font-semibold">SkyTerra</div>
      <button
        aria-label="Toggle theme"
        onClick={toggle}
        className="transition-transform duration-300"
        style={{ transform: dark ? 'rotate(180deg)' : 'rotate(0deg)' }}
      >
        {dark ? <MoonIcon className="w-6 h-6" /> : <SunIcon className="w-6 h-6" />}
      </button>
    </header>
  )
}

// Uso:
// <GlassTopBar />

import React from 'react'

export default function GlassCardTerreno({ terreno, onClick }) {
  return (
    <div
      className="glass shadow-glass rounded-glass p-4 cursor-pointer transition-transform duration-250 hover:scale-[1.02]"
      onClick={onClick}
    >
      <div className="h-32 mb-2 bg-gray-300 rounded-md"></div>
      <h3 className="font-medium mb-1">{terreno?.titulo}</h3>
      <p className="text-sm mb-2">{terreno?.precio}</p>
      <span className="px-2 py-1 text-xs rounded-md text-white" style={{background:'var(--st-accent)'}}>Nuevo</span>
    </div>
  )
}

// Uso:
// <GlassCardTerreno terreno={t} onClick={() => openModal(t.id)} />

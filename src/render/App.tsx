import React from 'react'

function App() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">Electron + Vite + React + TypeScript 🚀</h1>
      <p>Дата: {new Date().toLocaleString()}</p>
    </div>
  )
}

export default App
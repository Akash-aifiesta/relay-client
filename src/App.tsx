import { useState } from 'react'
import { Sidebar } from './components/Sidebar.js'
import { ChatWindow } from './components/ChatWindow.js'
import { SettingsModal } from './components/SettingsModal.js'

export default function App() {
  const [key, setKey] = useState(0)
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="app">
      <Sidebar
        onNewChat={() => setKey((k) => k + 1)}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ChatWindow key={key} onNewChat={() => setKey((k) => k + 1)} />
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

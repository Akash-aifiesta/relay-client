import { useState } from 'react'
import { Sidebar } from './components/Sidebar.js'
import { ChatWindow } from './components/ChatWindow.js'
import { SettingsModal } from './components/SettingsModal.js'
import { clearStore } from './state/chat-store.js'

export default function App() {
  const [key, setKey] = useState(0)
  const [showSettings, setShowSettings] = useState(false)

  function handleNewChat() {
    clearStore()
    setKey((k) => k + 1)
  }

  return (
    <div className="app">
      <Sidebar
        onNewChat={handleNewChat}
        onOpenSettings={() => setShowSettings(true)}
      />
      <ChatWindow key={key} onNewChat={handleNewChat} />
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

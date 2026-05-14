import { API_BASE_KEY } from '../services/stream-client.js'

interface Props {
  onNewChat: () => void
  onOpenSettings: () => void
}

export function Sidebar({ onNewChat, onOpenSettings }: Props) {
  const apiBase = localStorage.getItem(API_BASE_KEY) ?? ''
  const displayUrl = apiBase
    ? new URL(apiBase.startsWith('http') ? apiBase : `http://${apiBase}`).hostname
    : 'not set'

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect width="22" height="22" rx="6" fill="#10a37f"/>
          <path d="M11 5.5C8 5.5 6 7.5 6 10c0 1.5.7 2.8 1.8 3.7L7 17h8l-.8-3.3C15.3 12.8 16 11.5 16 10c0-2.5-2-4.5-5-4.5z" fill="white" fillOpacity="0.9"/>
        </svg>
        Stream Chat
      </div>

      <button className="new-chat-btn" onClick={onNewChat}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        New chat
      </button>

      <div className="sidebar-section">
        <div className="sidebar-label">API Target</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.8, wordBreak: 'break-all' }}>
          {displayUrl}
        </div>
      </div>

      <div className="sidebar-footer">
        <button className="settings-btn" onClick={onOpenSettings}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1.1 1.1M10.4 10.4l1.1 1.1M11.5 2.5l-1.1 1.1M3.6 10.4l-1.1 1.1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Change API URL
        </button>
      </div>
    </aside>
  )
}

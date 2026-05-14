import { useState, type FormEvent } from 'react'
import { API_BASE_KEY } from '../services/stream-client.js'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const [url, setUrl] = useState(() => localStorage.getItem(API_BASE_KEY) ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave(e: FormEvent) {
    e.preventDefault()
    const trimmed = url.trim().replace(/\/$/, '')
    if (trimmed) {
      localStorage.setItem(API_BASE_KEY, trimmed)
    } else {
      localStorage.removeItem(API_BASE_KEY)
    }
    setSaved(true)
    setTimeout(onClose, 600)
  }

  function handleClear() {
    localStorage.removeItem(API_BASE_KEY)
    setUrl('')
    setSaved(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">API Settings</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-field">
            <label className="modal-label" htmlFor="api-url">Base URL</label>
            <input
              id="api-url"
              className="modal-input"
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setSaved(false) }}
              placeholder="https://your-api.railway.app"
              autoFocus
            />
            <span className="modal-hint">
              Requests go to <code>{url.trim() || '(same origin)'}/stream</code> and <code>/resume</code>
            </span>
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-btn-ghost" onClick={handleClear}>
              Reset to default
            </button>
            <button type="submit" className={`modal-btn-primary ${saved ? 'saved' : ''}`}>
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

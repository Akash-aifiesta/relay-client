export type ConnectionState =
  | 'idle'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'replaying'
  | 'resumed'
  | 'completed'
  | 'error'

export interface ChatStore {
  chatId: string | null
  lastSeq: number
  userMessage: string | null
  tokens: string[]
  connectionState: ConnectionState
  errorMessage: string | null
}

// ── URL + localStorage persistence ───────────────────────────────────────
// URL:           ?chat=<chatId>   (set instantly on start, cleared on new chat)
// localStorage:  seq, userMessage (debounced writes, survive reload)

const MSG_KEY = 'rsc:msg'
const SEQ_KEY = 'rsc:seq'

export function loadStore(): ChatStore {
  const params = new URLSearchParams(window.location.search)
  const chatId = params.get('chat') ?? null
  const lastSeq = chatId ? Number(localStorage.getItem(SEQ_KEY) ?? '0') : 0
  const userMessage = chatId ? (localStorage.getItem(MSG_KEY) ?? null) : null
  return { chatId, lastSeq, userMessage, tokens: [], connectionState: 'idle', errorMessage: null }
}

export function saveStore(store: ChatStore): void {
  if (store.chatId) {
    localStorage.setItem(SEQ_KEY, String(store.lastSeq))
    if (store.userMessage) localStorage.setItem(MSG_KEY, store.userMessage)
  } else {
    localStorage.removeItem(SEQ_KEY)
    localStorage.removeItem(MSG_KEY)
  }
}

export function saveUserMessage(message: string): void {
  localStorage.setItem(MSG_KEY, message)
}

export function saveChatId(chatId: string): void {
  const params = new URLSearchParams(window.location.search)
  params.set('chat', chatId)
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
}

export function clearStore(): void {
  localStorage.removeItem(MSG_KEY)
  localStorage.removeItem(SEQ_KEY)
  window.history.replaceState(null, '', window.location.pathname)
}

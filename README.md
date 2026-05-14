# Stream Chat — Standalone Client

A deployable React client for the resumable SSE streaming chat system.  
Point it at any compatible API server at **runtime** — no rebuild ever required.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

To build for deployment:

```bash
npm run build      # outputs to dist/
```

`dist/` is a plain static site — deploy it to Netlify, Vercel, Railway Static, or any CDN.  
No server-side rendering, no environment variables needed at build time.

---

## Changing the API URL (runtime, no rebuild)

Click **"Change API URL"** in the bottom of the left sidebar.  
Paste the base URL of your API server (e.g. `https://my-api.railway.app`) and hit **Save**.

- The URL is written to `localStorage` key `rsc:api_base`.
- Every subsequent `/stream` and `/resume` request reads it from `localStorage` at call time.
- You can switch between multiple API instances instantly — just change the URL and start a new chat.
- Leaving it blank falls back to same-origin (useful if you're running client and API behind the same proxy locally).

**No build step. No environment variable. No page reload required.**

---

## API contract — what your server must implement

The client talks to exactly two endpoints. Both return an SSE stream.

---

### `POST /stream`

Starts a new streaming session.

**Request body (JSON):**

```json
{
  "message": "Explain distributed systems",
  "chatId": "optional-existing-id"
}
```

**Response headers:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**SSE events the client expects (in order):**

| Event            | Data shape                              | Required | When                              |
|------------------|-----------------------------------------|----------|-----------------------------------|
| `start`          | `{"chatId":"<string>"}`                 | Yes      | First event — gives the client its session ID |
| `token`          | `{"seq":<number>,"content":"<string>"}` | Yes      | One per token/chunk, seq is 1-based and strictly increasing |
| `ping`           | `{}`                                    | No       | Heartbeat every ~15s to keep connection alive |
| `done`           | `{}`                                    | Yes      | When generation is complete        |

**Example stream:**

```
event: start
data: {"chatId":"abc-123"}

event: token
data: {"seq":1,"content":"Distributed"}

event: token
data: {"seq":2,"content":"systems"}

event: ping
data: {}

event: token
data: {"seq":3,"content":"are"}

event: done
data: {}
```

**Behaviour rules:**

- Generation **must** continue even if the client disconnects. The stream must stay alive in the backend.
- `chatId` in the `start` event is what the client persists in `localStorage` and the URL (`?chat=<chatId>`).
- `seq` must be strictly increasing integers starting at 1. The client deduplicates by ignoring any `seq` it has already seen.

---

### `POST /resume`

Reconnects to an existing session and replays missed chunks.

**Request body (JSON):**

```json
{
  "chatId": "abc-123",
  "lastSequence": 42
}
```

`lastSequence` is the highest `seq` the client already received. Send `0` to get the full stream from the beginning.

**Error responses:**

| Status | When                              |
|--------|-----------------------------------|
| `404`  | `chatId` not found / expired      |
| `400`  | Missing or invalid fields         |

The client handles `404` by clearing state and showing a fresh chat screen. Any other error triggers exponential-backoff retry.

**SSE events the client expects (in order):**

| Event             | Data shape                              | Required | When                                  |
|-------------------|-----------------------------------------|----------|---------------------------------------|
| `token`           | `{"seq":<number>,"content":"<string>"}` | No       | Replayed chunks — only those with `seq > lastSequence` |
| `replay_complete` | `{}`                                    | Yes      | After all replayed chunks have been sent |
| `token`           | `{"seq":<number>,"content":"<string>"}` | No       | Live chunks from the ongoing stream   |
| `ping`            | `{}`                                    | No       | Heartbeat                             |
| `done`            | `{}`                                    | Yes      | When stream is complete               |

**Behaviour rules:**

- The server must replay **all** chunks with `seq > lastSequence` before emitting `replay_complete`.
- After `replay_complete`, continue delivering live chunks as they are generated.
- If the stream was already complete when `/resume` is called, emit any missing chunks, then `replay_complete`, then `done` immediately.
- The client deduplicates by `seq`, so replaying overlapping chunks is safe.

---

## CORS

If the client is deployed on a different origin than your API (the typical case), the API must return:

```
Access-Control-Allow-Origin: <client-origin>   (or *)
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

For POST SSE endpoints the browser will preflight with `OPTIONS` — make sure your server handles it.

---

## Client state persistence

The client persists two things to survive page reload:

| Storage        | Key         | Value                         |
|----------------|-------------|-------------------------------|
| `localStorage` | `rsc:msg`   | The user's original message   |
| URL params     | `?chat=`    | `chatId`                      |
| URL params     | `?seq=`     | `lastSequence`                |
| `localStorage` | `rsc:api_base` | The API base URL (set via settings) |

On page load, if `?chat=` is present, the client automatically calls `/resume` with `lastSequence=0` to replay the full stream. This means users can bookmark or share a URL and still see the complete response.

---

## Reconnect behaviour

The client implements exponential-backoff retry (up to 10 attempts, starting at 500ms, capped at 30s).

| Client state   | Meaning                                              |
|----------------|------------------------------------------------------|
| `idle`         | No active session                                    |
| `connected`    | Streaming live                                       |
| `disconnected` | Connection dropped, about to retry                   |
| `reconnecting` | Waiting for backoff delay before next retry          |
| `replaying`    | `/resume` called, receiving replayed chunks          |
| `resumed`      | Replay complete, back on live stream                 |
| `completed`    | Stream finished                                      |
| `error`        | Max retries exceeded                                 |

---

## Minimal server example (Node.js / Hono)

```ts
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { v4 as uuid } from 'uuid'

const app = new Hono()

// In-memory store — replace with Redis Streams for production
const sessions = new Map<string, { chunks: { seq: number; content: string }[]; done: boolean }>()

app.post('/stream', async (c) => {
  const { message } = await c.req.json()
  const chatId = uuid()
  const session = { chunks: [], done: false }
  sessions.set(chatId, session)

  // Generate in background — must NOT stop when client disconnects
  ;(async () => {
    const words = `You asked: ${message}`.split(' ')
    for (let i = 0; i < words.length; i++) {
      await new Promise(r => setTimeout(r, 100))
      session.chunks.push({ seq: i + 1, content: words[i] })
    }
    session.done = true
  })()

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({ event: 'start', data: JSON.stringify({ chatId }) })
    let i = 0
    while (true) {
      if (i < session.chunks.length) {
        const chunk = session.chunks[i++]
        await stream.writeSSE({ event: 'token', data: JSON.stringify(chunk) })
      } else if (session.done) {
        await stream.writeSSE({ event: 'done', data: '{}' })
        break
      } else {
        await new Promise(r => setTimeout(r, 50))
      }
    }
  })
})

app.post('/resume', async (c) => {
  const { chatId, lastSequence } = await c.req.json()
  const session = sessions.get(chatId)
  if (!session) return c.json({ error: 'stream not found' }, 404)

  return streamSSE(c, async (stream) => {
    // Phase 1: replay missed chunks
    for (const chunk of session.chunks.filter(ch => ch.seq > lastSequence)) {
      await stream.writeSSE({ event: 'token', data: JSON.stringify(chunk) })
    }
    await stream.writeSSE({ event: 'replay_complete', data: '{}' })

    // Phase 2: live continuation
    let i = session.chunks.length
    while (true) {
      if (i < session.chunks.length) {
        const chunk = session.chunks[i++]
        await stream.writeSSE({ event: 'token', data: JSON.stringify(chunk) })
      } else if (session.done) {
        await stream.writeSSE({ event: 'done', data: '{}' })
        break
      } else {
        await new Promise(r => setTimeout(r, 50))
      }
    }
  })
})

export default app
```

**For production:** replace the in-memory `sessions` map with Redis Streams (`XADD` / `XRANGE` / `XREAD BLOCK`) so that:
- generation survives server restarts
- `/resume` works even when it hits a different server instance than `/stream`
- streams can be replayed across browser sessions

---

## File structure

```
src/
  App.tsx                      — root, wires sidebar + chat window + settings modal
  components/
    ChatWindow.tsx             — input form, message rendering, stream control
    ConnectionStatus.tsx       — status pill (streaming / reconnecting / done / …)
    MessageList.tsx            — user + assistant message bubbles
    Sidebar.tsx                — nav, API target display, "Change API URL" button
    SettingsModal.tsx          — runtime URL editor (saves to localStorage)
  hooks/
    useStream.ts               — all streaming logic: start, resume, retry, cancel
  services/
    stream-client.ts           — fetch wrappers for /stream and /resume; getApiBase()
  state/
    chat-store.ts              — localStorage + URL param persistence helpers
```

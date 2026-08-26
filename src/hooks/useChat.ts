import { useCallback, useRef, useState } from 'react'
import { streamChat } from '../lib/api'
import type { Msg } from '../lib/types'

export function useChat(scopeId: string | null) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const abort = useRef<AbortController | null>(null)

  const patchLast = (fn: (m: Msg) => Msg) =>
    setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? fn(m) : m)))

  const send = useCallback(
    async (text: string) => {
      const question = text.trim()
      if (!question || busy) return

      const history: Msg[] = [...messages, { role: 'user', content: question }]
      setMessages([...history, { role: 'assistant', content: '' }])
      setBusy(true)
      abort.current = new AbortController()

      try {
        await streamChat(
          history,
          scopeId,
          {
            onSources: (sources) => patchLast((m) => ({ ...m, sources })),
            onDelta: (t) => patchLast((m) => ({ ...m, content: m.content + t })),
            onError: (message) => patchLast((m) => ({ ...m, error: message })),
          },
          abort.current.signal,
        )
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          patchLast((m) => ({ ...m, error: err?.message ?? 'Erreur réseau' }))
        }
      } finally {
        setBusy(false)
        abort.current = null
      }
    },
    [messages, busy, scopeId],
  )

  const stop = useCallback(() => abort.current?.abort(), [])
  const reset = useCallback(() => {
    abort.current?.abort()
    setMessages([])
  }, [])

  return { messages, busy, send, stop, reset }
}

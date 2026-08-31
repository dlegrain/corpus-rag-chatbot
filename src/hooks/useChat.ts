import { useCallback, useRef, useState } from 'react'
import { streamChat, type ChatMemory } from '../lib/api'
import { citedNumbers } from '../lib/citations'
import type { Msg } from '../lib/types'

/**
 * Ce que la conversation a déjà établi. Deux choses, extraites des réponses
 * passées :
 *
 * - `known` fige les numéros de citation, pour que `[2]` ne change pas de sens
 *   d'un tour à l'autre — les anciennes réponses restent affichées ;
 * - `cited` liste les passages que le modèle a **réellement** cités, pas les
 *   quatorze qui lui ont été montrés. Ce sont ceux sur lesquels porte la suite
 *   de l'échange, donc ceux qu'il vaut la peine de rappeler.
 */
function memoryOf(messages: Msg[]): ChatMemory {
  const known: Record<string, number> = {}
  const cited: number[] = []
  for (const m of messages) {
    if (m.role !== 'assistant' || !m.sources) continue
    const used = citedNumbers(m.content)
    for (const s of m.sources) {
      known[String(s.id)] = s.n
      if (used.has(s.n) && !cited.includes(s.id)) cited.push(s.id)
    }
  }
  return { known, cited }
}

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
      const memory = memoryOf(messages)
      setMessages([...history, { role: 'assistant', content: '' }])
      setBusy(true)
      abort.current = new AbortController()

      try {
        await streamChat(
          history,
          scopeId,
          memory,
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
        // Une bulle restée vide (erreur, interruption) ferait rejeter la requête
        // suivante par l'API : on la retire plutôt que de la traîner.
        setMessages((prev) =>
          prev.filter((m, i) => i !== prev.length - 1 || m.content.trim() !== '' || m.error),
        )
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

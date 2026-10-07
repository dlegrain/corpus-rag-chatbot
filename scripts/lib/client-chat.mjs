/**
 * Client de conversation pour les bancs d'essai : parle à /api/chat et
 * maintient l'état exactement comme le fait le navigateur (numéros de citation
 * déjà attribués, passages réellement cités). Sans cette fidélité, on testerait
 * un pipeline que personne n'exécute.
 */
export const BASE = process.env.BASE ?? 'http://localhost:8888'
export const CITE = /\[(\d{1,3})\]/g

export const gris = (s) => `\x1b[90m${s}\x1b[0m`
export const gras = (s) => `\x1b[1m${s}\x1b[0m`
export const vert = (s) => `\x1b[32m${s}\x1b[0m`
export const rouge = (s) => `\x1b[31m${s}\x1b[0m`

export const citesDe = (texte) => new Set(Array.from(texte.matchAll(CITE)).map((m) => Number(m[1])))

/** Reproduit `memoryOf` de src/hooks/useChat.ts. */
export function memoire(messages) {
  const known = {}
  const cited = []
  for (const m of messages) {
    if (m.role !== 'assistant' || !m.sources) continue
    const used = citesDe(m.content)
    for (const s of m.sources) {
      known[String(s.id)] = s.n
      if (used.has(s.n) && !cited.includes(s.id)) cited.push(s.id)
    }
  }
  return { known, cited }
}

/** `docIds` : les documents cochés, comme dans la colonne de gauche ; vide = tout le corpus. */
export async function demander(messages, question, docIds = []) {
  const history = [...messages, { role: 'user', content: question }]
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      docIds,
      ...memoire(messages),
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`)

  let plan = [],
    perimetre = [],
    sources = [],
    content = '',
    erreur = null,
    buffer = ''
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''
    for (const frame of frames) {
      const line = frame.trim()
      if (!line.startsWith('data:')) continue
      const evt = JSON.parse(line.slice(5))
      if (evt.type === 'plan') ((plan = evt.queries), (perimetre = evt.perimetre ?? []))
      else if (evt.type === 'sources') sources = evt.sources
      else if (evt.type === 'delta') content += evt.text
      else if (evt.type === 'error') erreur = evt.message
    }
  }
  return { messages: [...history, { role: 'assistant', content, sources }], plan, perimetre, sources, erreur }
}

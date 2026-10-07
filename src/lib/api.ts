import { chunkPages } from '../../shared/chunk.js'
import { extractPages } from './pdf'
import type { Doc, Msg, Source, UploadState } from './types'

const BATCH = 12 // chunks par appel : garde chaque function bien sous le timeout

export async function fetchDocuments(): Promise<Doc[]> {
  const res = await fetch('/api/documents')
  if (!res.ok) throw new Error('Chargement du corpus impossible')
  return (await res.json()).documents as Doc[]
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Suppression impossible')
}

async function post(body: unknown) {
  const res = await fetch('/api/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Échec de l’indexation')
  return json
}

/** Lit le PDF dans le navigateur, découpe, puis pousse les chunks par lots. */
export async function ingestFile(
  file: File,
  onState: (s: Partial<UploadState>) => void,
): Promise<'ok' | 'duplicate'> {
  const docId = crypto.randomUUID()

  onState({ phase: 'lecture', progress: 0 })
  const pages = await extractPages(file, (done, total) =>
    onState({ progress: Math.round((done / total) * 25), detail: `page ${done}/${total}` }),
  )

  const chunks = chunkPages(pages)
  if (chunks.length === 0) throw new Error('Aucun texte extractible (PDF scanné ?)')

  const started = await post({
    op: 'start',
    docId,
    filename: file.name,
    nPages: pages.length,
    sample: pages.slice(0, 2).join('\n').slice(0, 6000),
  })
  if (started.duplicate) {
    onState({ phase: 'doublon', progress: 100 })
    return 'duplicate'
  }

  onState({ phase: 'indexation', progress: 28, detail: `${chunks.length} passages` })
  for (let i = 0; i < chunks.length; i += BATCH) {
    await post({ op: 'chunks', docId, chunks: chunks.slice(i, i + BATCH) })
    const ratio = Math.min((i + BATCH) / chunks.length, 1)
    onState({ progress: 28 + Math.round(ratio * 70) })
  }

  await post({ op: 'finish', docId })
  onState({ phase: 'terminé', progress: 100, detail: `${chunks.length} passages indexés` })
  return 'ok'
}

type ChatEvents = {
  onSources: (s: Source[]) => void
  onDelta: (t: string) => void
  onError: (m: string) => void
}

/** Ce que la conversation a déjà établi : passages cités, numéros attribués. */
export type ChatMemory = { cited: number[]; known: Record<string, number> }

/** Consomme le flux SSE de /api/chat. */
export async function streamChat(
  messages: Msg[],
  /** Les documents cochés ; vide = tout le corpus. */
  docIds: string[],
  memory: ChatMemory,
  handlers: ChatEvents,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      docIds,
      cited: memory.cited,
      known: memory.known,
    }),
    signal,
  })
  if (!res.ok || !res.body) {
    handlers.onError("Le service de réponse n'est pas disponible.")
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const frames = buffer.split('\n\n')
    buffer = frames.pop() ?? ''
    for (const frame of frames) {
      const line = frame.trim()
      if (!line.startsWith('data:')) continue
      const evt = JSON.parse(line.slice(5))
      if (evt.type === 'sources') handlers.onSources(evt.sources)
      else if (evt.type === 'delta') handlers.onDelta(evt.text)
      else if (evt.type === 'error') handlers.onError(evt.message)
    }
  }
}

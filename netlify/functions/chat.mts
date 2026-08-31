import type { Config } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'
import { json } from '../lib/supabase.js'
import { sanitizeHistory, type Turn } from '../lib/history.js'
import { fetchCatalog, catalogForPrompt } from '../lib/catalog.js'
import { planSearch } from '../lib/plan.js'
import { search, recall, number, without } from '../lib/retrieve.js'
import { buildSystemPrompt, excerptOf, type Numbered } from '../lib/prompt.js'

type Body = {
  messages: Turn[]
  docId?: string | null
  /** Identifiants des passages réellement cités dans les réponses précédentes. */
  cited?: number[]
  /** Numéros de citation déjà attribués, pour qu'ils ne bougent plus. */
  known?: Record<string, number>
}

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const body = (await req.json()) as Body
  const history = sanitizeHistory(body.messages)
  if (history.length === 0) return json({ error: 'empty_question' }, 400)

  const scope = body.docId ?? null
  let fresh: Numbered[] = []
  let carried: Numbered[] = []
  let catalog = ''
  let hasDocs = false
  let queries: { q: string; doc: string | null }[] = []

  try {
    const docs = await fetchCatalog()
    hasDocs = docs.length > 0
    catalog = catalogForPrompt(docs)

    queries = await planSearch(history, docs, scope)
    const found = await search(queries)
    const recalled = without(
      await recall(body.cited ?? [], found.probe, found.passages),
      found.passages,
    )

    // Numérotés d'un seul tenant pour que les nouveaux numéros ne se marchent pas dessus.
    const all = number([...found.passages, ...recalled], body.known ?? {})
    fresh = all.slice(0, found.passages.length)
    carried = all.slice(found.passages.length)
  } catch (err: any) {
    console.error('[chat] retrieval', err?.message)
    return json({ error: 'retrieval_failed' }, 500)
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      // Le plan n'est pas affiché : il sert au banc d'essai et aux journaux.
      send({ type: 'plan', queries })
      send({
        type: 'sources',
        sources: [...fresh, ...carried].map((p) => ({
          id: p.id,
          n: p.n,
          documentId: p.document_id,
          title: p.title,
          authors: p.authors,
          year: p.year,
          journal: p.journal,
          page: p.page,
          similarity: Math.round(p.similarity * 100) / 100,
          excerpt: excerptOf(p.content),
          recalled: carried.includes(p),
        })),
      })

      try {
        const claude = anthropic.messages.stream({
          model: 'claude-opus-5',
          max_tokens: 4096,
          output_config: { effort: 'low' },
          system: buildSystemPrompt({ fresh, carried, catalog, hasDocs }),
          messages: history,
        })
        for await (const event of claude) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send({ type: 'delta', text: event.delta.text })
          }
        }
        send({ type: 'done' })
      } catch (err: any) {
        console.error('[chat] claude', err?.message)
        send({ type: 'error', message: err?.message ?? 'stream_failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export const config: Config = { path: '/api/chat' }

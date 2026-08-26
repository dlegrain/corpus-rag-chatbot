import type { Config } from '@netlify/functions'
import Anthropic from '@anthropic-ai/sdk'
import { db, json } from '../lib/supabase.js'
import { embedQuery } from '../lib/embed.js'
import { buildSystemPrompt, excerptOf, type Passage } from '../lib/prompt.js'

const MATCH_COUNT = 14

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const { messages, docId } = (await req.json()) as {
    messages: { role: 'user' | 'assistant'; content: string }[]
    docId?: string | null
  }
  const question = [...messages].reverse().find((m) => m.role === 'user')?.content?.trim()
  if (!question) return json({ error: 'empty_question' }, 400)

  let passages: Passage[] = []
  try {
    const embedding = await embedQuery(question)
    const { data, error } = await db().rpc('match_sci_chunks', {
      query_embedding: embedding,
      match_count: MATCH_COUNT,
      filter_doc: docId ?? null,
    })
    if (error) throw new Error(error.message)
    passages = (data ?? []) as Passage[]
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

      send({
        type: 'sources',
        sources: passages.map((p, i) => ({
          n: i + 1,
          documentId: p.document_id,
          title: p.title,
          authors: p.authors,
          year: p.year,
          journal: p.journal,
          page: p.page,
          similarity: Math.round(p.similarity * 100) / 100,
          excerpt: excerptOf(p.content),
        })),
      })

      try {
        const claude = anthropic.messages.stream({
          model: 'claude-opus-5',
          max_tokens: 4096,
          output_config: { effort: 'low' },
          system: buildSystemPrompt(passages),
          messages: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
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

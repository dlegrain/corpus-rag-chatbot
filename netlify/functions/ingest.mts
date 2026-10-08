import type { Config } from '@netlify/functions'
import { db, T, json } from '../lib/supabase.js'
import { embedBatch } from '../lib/embed.js'
import { extractMeta } from '../lib/metadata.js'

type Chunk = { content: string; page: number; chunk_index: number }

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const { op, docId } = body
  if (!docId) return json({ error: 'docId_required' }, 400)

  try {
    if (op === 'start') return await start(docId, body)
    if (op === 'chunks') return await chunks(docId, body.chunks as Chunk[])
    if (op === 'finish') return await finish(docId)
    return json({ error: 'unknown_op' }, 400)
  } catch (err: any) {
    console.error('[ingest]', op, err?.message)
    return json({ error: err?.message ?? 'ingest_failed' }, 500)
  }
}

async function start(docId: string, body: any) {
  const filename: string = body.filename ?? 'document.pdf'
  const existing = await db()
    .from(T.documents)
    .select('id')
    .eq('filename', filename)
    .maybeSingle()
  if (existing.data) return json({ duplicate: true, id: existing.data.id })

  const meta = await extractMeta(filename, body.sample ?? '')
  const { error } = await db().from(T.documents).insert({
    id: docId,
    filename,
    title: meta.title,
    authors: meta.authors,
    year: meta.year,
    journal: meta.journal,
    n_pages: body.nPages ?? null,
    status: 'indexing',
  })
  if (error) throw new Error(error.message)
  return json({ id: docId, ...meta })
}

async function chunks(docId: string, list: Chunk[]) {
  if (!Array.isArray(list) || list.length === 0) return json({ inserted: 0 })
  const vectors = await embedBatch(list.map((c) => c.content))
  const rows = list.map((c, i) => ({
    document_id: docId,
    chunk_index: c.chunk_index,
    page: c.page,
    content: c.content,
    embedding: vectors[i],
  }))
  const { error } = await db().from(T.chunks).insert(rows)
  if (error) throw new Error(error.message)
  return json({ inserted: rows.length })
}

async function finish(docId: string) {
  const { count } = await db()
    .from(T.chunks)
    .select('id', { count: 'exact', head: true })
    .eq('document_id', docId)
  const { data, error } = await db()
    .from(T.documents)
    .update({ n_chunks: count ?? 0, status: 'ready' })
    .eq('id', docId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return json(data)
}

export const config: Config = { path: '/api/ingest' }

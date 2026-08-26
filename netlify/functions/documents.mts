import type { Config } from '@netlify/functions'
import { db, json } from '../lib/supabase.js'

export default async (req: Request) => {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const { data, error } = await db()
      .from('sci_documents')
      .select('id, title, authors, year, journal, filename, n_pages, n_chunks, status, created_at')
      .order('year', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (error) return json({ error: error.message }, 500)
    return json({ documents: data })
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) return json({ error: 'id_required' }, 400)
    const { error } = await db().from('sci_documents').delete().eq('id', id)
    if (error) return json({ error: error.message }, 500)
    return json({ deleted: id })
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config: Config = { path: '/api/documents' }

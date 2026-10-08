import type { Config } from '@netlify/functions'
import { db, T, json } from '../lib/supabase.js'

export default async (req: Request) => {
  const url = new URL(req.url)

  if (req.method === 'GET') {
    const { data, error } = await db()
      .from(T.documents)
      .select('id, title, authors, year, journal, filename, n_pages, n_chunks, status, created_at')
      .order('year', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (error) return json({ error: error.message }, 500)
    // Quels documents ont leur PDF d'origine en stockage (ouverture à la page citée).
    // Un bucket absent n'est pas une erreur : ce corpus n'a simplement pas de PDF.
    const { data: fichiers } = await db().storage.from(T.bucket).list('', { limit: 1000 })
    const avecPdf = new Set((fichiers ?? []).map((f) => f.name.replace(/\.pdf$/, '')))
    return json({ documents: (data ?? []).map((d) => ({ ...d, has_pdf: avecPdf.has(d.id) })) })
  }

  if (req.method === 'DELETE') {
    const id = url.searchParams.get('id')
    if (!id) return json({ error: 'id_required' }, 400)
    const { error } = await db().from(T.documents).delete().eq('id', id)
    if (error) return json({ error: error.message }, 500)
    return json({ deleted: id })
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config: Config = { path: '/api/documents' }

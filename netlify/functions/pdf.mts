import type { Config } from '@netlify/functions'
import { db, T, json } from '../lib/supabase.js'

/** Le temps de lire et de feuilleter ; au-delà, rouvrir la source redemande un lien. */
const DUREE_LECTURE = 3600
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Lien de lecture signé vers le PDF d'origine d'un document, pour l'ouvrir à la page citée.
 *   GET /api/pdf?id=<docId>  → { url }   ou 404 si le document n'a pas de PDF déposé.
 *
 * Le PDF ne transite jamais par la function (réponse plafonnée à 6 Mo) : le navigateur le lit
 * directement dans le stockage. Seuls les PDF déposés par `scripts/upload-pdfs.mjs` existent :
 * un document ajouté par glisser-déposer garde l'affichage de l'extrait, sans popup.
 */
export default async (req: Request) => {
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (!UUID.test(id)) return json({ error: 'id_required' }, 400)
  const { data: doc } = await db().from(T.documents).select('status').eq('id', id).maybeSingle()
  if (!doc || doc.status !== 'ready') return json({ error: 'pdf_absent' }, 404)
  const { data, error } = await db().storage.from(T.bucket).createSignedUrl(`${id}.pdf`, DUREE_LECTURE)
  if (error || !data) return json({ error: 'pdf_absent' }, 404)
  return json({ url: data.signedUrl })
}

export const config: Config = { path: '/api/pdf' }

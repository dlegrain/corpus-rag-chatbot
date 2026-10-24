import type { Config } from '@netlify/functions'
import { json } from '../lib/supabase.js'
import { exigerAdmin } from '../lib/admin.js'
import { avecSentry } from '../lib/sentry.js'

/**
 * Vérifie le secret administrateur saisi dans l'interface, sans rien écrire :
 *   GET /api/admin  (en-tête x-corpus-admin)  → { admin: true }  ou 401.
 * L'interface n'affiche les boutons d'ajout et de retrait qu'après ce feu vert.
 */
export default avecSentry('admin', async (req: Request) => {
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)
  return exigerAdmin(req) ?? json({ admin: true })
})

export const config: Config = { path: '/api/admin' }

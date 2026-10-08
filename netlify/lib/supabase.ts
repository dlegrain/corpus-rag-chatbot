import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Noms des tables et fonctions SQL. Une même base Supabase peut porter plusieurs corpus :
 * chaque déploiement choisit le sien par `CORPUS_PREFIX` (défaut `sci`, le corpus d'origine).
 * Le schéma d'un nouveau préfixe se crée en remplaçant `sci` dans `supabase/schema.sql`.
 */
const PREFIX = process.env.CORPUS_PREFIX || 'sci'
export const T = {
  documents: `${PREFIX}_documents`,
  chunks: `${PREFIX}_chunks`,
  match: `match_${PREFIX}_chunks`,
  byIds: `${PREFIX}_chunks_by_ids`,
  /** Bucket privé des PDF d'origine (facultatif : sans lui, pas d'ouverture à la page citée). */
  bucket: `${PREFIX}-pdfs`,
}

let client: SupabaseClient | null = null

/** Service-role client — RLS is on, everything goes through the functions. */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string,
      { auth: { persistSession: false } },
    )
  }
  return client
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

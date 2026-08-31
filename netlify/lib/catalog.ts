import { db } from './supabase.js'

export type CatalogEntry = {
  id: string
  title: string
  authors: string | null
  year: number | null
  journal: string | null
}

/**
 * Le catalogue est ce qui permet de répondre aux questions portant sur la
 * bibliothèque elle-même (« quels articles parlent de X ? », « combien en
 * as-tu ? ») : une recherche de passages y répond très mal, parce que la
 * réponse n'est dans aucun passage.
 *
 * Il sert aussi au planificateur, qui a besoin des identifiants réels pour
 * traduire « compare cela à Alden 2022 » en un filtre par document.
 */
export async function fetchCatalog(): Promise<CatalogEntry[]> {
  const { data, error } = await db()
    .from('sci_documents')
    .select('id, title, authors, year, journal')
    .order('year', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as CatalogEntry[]
}

const label = (d: CatalogEntry) =>
  [d.authors ?? '—', d.year ? `(${d.year})` : null, '—', d.title, d.journal ? `· ${d.journal}` : null]
    .filter(Boolean)
    .join(' ')

/** Pour le planificateur : l'identifiant est nécessaire, il doit le recopier. */
export const catalogWithIds = (docs: CatalogEntry[]): string =>
  docs.map((d) => `${d.id} | ${label(d)}`).join('\n')

/**
 * Pour la génération : surtout pas de numéros en tête de ligne, ils entreraient
 * en concurrence avec la numérotation des citations [n].
 */
export const catalogForPrompt = (docs: CatalogEntry[]): string =>
  docs.map((d) => `- ${label(d)}`).join('\n')

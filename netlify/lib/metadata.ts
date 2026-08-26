import { parseFilename } from '../../shared/meta.js'

export type DocMeta = {
  title: string
  authors: string | null
  year: number | null
  journal: string | null
}

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    authors: { type: 'string' },
    year: { type: 'integer' },
    journal: { type: 'string' },
  },
  required: ['title', 'authors', 'year', 'journal'],
}

/**
 * Lit l'en-tête de l'article pour en tirer titre / auteurs / année / revue.
 * En cas d'échec (PDF scanné, quota, format inattendu) on retombe sur le nom de fichier.
 */
export async function extractMeta(filename: string, sample: string): Promise<DocMeta> {
  const fallback = parseFilename(filename) as DocMeta
  if (!sample || sample.length < 200) return fallback

  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': process.env.GEMINI_API_KEY as string,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    `Extrais les métadonnées bibliographiques de cet article scientifique.\n` +
                    `- "authors" : format "Nom AB et al." (premier auteur uniquement + "et al." s'il y en a plusieurs).\n` +
                    `- "journal" : abréviation de la revue si disponible.\n` +
                    `- Si une information est absente, mets "" (ou 0 pour l'année).\n\n` +
                    `Nom du fichier : ${filename}\n\n---\n${sample.slice(0, 6000)}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: SCHEMA,
            temperature: 0,
          },
        }),
      },
    )
    if (!res.ok) return fallback
    const json = await res.json()
    const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!raw) return fallback
    const m = JSON.parse(raw)
    return {
      title: (m.title || '').trim() || fallback.title,
      authors: (m.authors || '').trim() || fallback.authors,
      year: Number(m.year) > 1800 ? Number(m.year) : fallback.year,
      journal: (m.journal || '').trim() || fallback.journal,
    }
  } catch {
    return fallback
  }
}

import { DOMAINE } from '../../shared/domaine.js'
import { parseFilename } from '../../shared/meta.js'

export type DocMeta = {
  title: string
  authors: string | null
  year: number | null
  journal: string | null
}

// gemini-3.5-flash-lite : le Flash-Lite 3.x stable, rapide et peu cher, réflexion « minimal » par
// défaut. (gemini-2.5-flash-lite n'est plus servi aux clés récentes : 404.) Réglable sans redéploiement
// de code via GEMINI_META_MODEL ; GEMINI_META_THINKING si le modèle choisi n'accepte pas « minimal »
// (ex. gemini-3.8-flash : low / medium / high).
const MODEL = process.env.GEMINI_META_MODEL || 'gemini-3.5-flash-lite'
const THINKING = process.env.GEMINI_META_THINKING || 'minimal'
// Les jetons de réflexion sont décomptés de maxOutputTokens : une limite trop basse renvoie un
// candidat sans texte. Le JSON attendu fait ~100 jetons ; 2048 laisse toute la marge.
const MAX_OUTPUT_TOKENS = 2048

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

/** Échec visible dans les journaux de la fonction, sans bloquer l'import. */
function logFailure(filename: string, reason: string) {
  console.error(`[metadata] extraction Gemini (${MODEL}) échouée pour « ${filename} » : ${reason} — repli sur le nom de fichier`)
}

/**
 * Lit l'en-tête de l'article pour en tirer titre / auteurs / année / revue.
 * En cas d'échec (PDF scanné, quota, modèle retiré, format inattendu) on retombe sur le nom de
 * fichier — et l'échec est journalisé.
 */
export async function extractMeta(filename: string, sample: string): Promise<DocMeta> {
  const fallback = parseFilename(filename) as DocMeta
  if (!sample || sample.length < 200) return fallback

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
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
                  `Extrais les métadonnées de ce document (${DOMAINE.unite}).\n` +
                  `- "authors" : format "Nom AB et al." — nom de famille du premier auteur, puis ses initiales sans point, ` +
                  `+ " et al." seulement s'il y a plusieurs auteurs (ex. « Jean-Marc Dupont et Anne Martin » → "Dupont JM et al."). ` +
                  `Le premier mot sert d'étiquette de citation « Dupont et al. (2024) » : il doit être le nom de famille, jamais le prénom.\n` +
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
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          // Les modèles 2.x refusent thinkingLevel (HTTP 400) : on ne l'envoie qu'aux 3.x et suivants.
          ...(THINKING && !/^gemini-2\./.test(MODEL) ? { thinkingConfig: { thinkingLevel: THINKING } } : {}),
        },
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      let message = body.slice(0, 500)
      try {
        message = JSON.parse(body)?.error?.message ?? message
      } catch {}
      logFailure(filename, `HTTP ${res.status} — ${message}`)
      return fallback
    }
    const json = await res.json()
    const candidate = json?.candidates?.[0]
    const raw = candidate?.content?.parts?.find((p: { text?: string; thought?: boolean }) => p.text && !p.thought)?.text
    if (!raw) {
      const why = candidate?.finishReason ?? json?.promptFeedback?.blockReason ?? 'aucun candidat'
      logFailure(filename, `réponse sans texte (${why})`)
      return fallback
    }
    let m
    try {
      m = JSON.parse(raw)
    } catch {
      logFailure(filename, `JSON illisible (${candidate?.finishReason}) : ${raw.slice(0, 200)}`)
      return fallback
    }
    return {
      title: (m.title || '').trim() || fallback.title,
      authors: (m.authors || '').trim() || fallback.authors,
      year: Number(m.year) > 1800 ? Number(m.year) : fallback.year,
      journal: (m.journal || '').trim() || fallback.journal,
    }
  } catch (err) {
    logFailure(filename, `appel impossible — ${err instanceof Error ? err.message : String(err)}`)
    return fallback
  }
}

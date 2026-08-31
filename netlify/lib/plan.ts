import Anthropic from '@anthropic-ai/sdk'
import { catalogWithIds, type CatalogEntry } from './catalog.js'
import type { Turn } from './history.js'

export type SearchQuery = { q: string; doc: string | null }

const MODEL = process.env.ANTHROPIC_MODEL_PLAN ?? 'claude-haiku-4-5'
const MAX_QUERIES = 3
/** Les réponses passées servent de contexte, pas de matière : on les tronque. */
const ECHO = 600

const SCHEMA = {
  type: 'object',
  properties: {
    // Pas de `maxItems` : l'API le refuse dans un schéma de sortie structurée.
    // Le plafond tient dans la consigne, et `sanitize()` le fait respecter.
    queries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          doc: { type: ['string', 'null'] },
        },
        required: ['q', 'doc'],
        additionalProperties: false,
      },
    },
  },
  required: ['queries'],
  additionalProperties: false,
} as const

const instructions = (docs: CatalogEntry[]) => `Tu prépares les recherches d'un assistant documentaire adossé à un corpus d'articles scientifiques. Tu ne réponds jamais à l'utilisateur : tu rends uniquement un plan de recherche.

# Bibliothèque disponible

identifiant | auteurs (année) — titre · revue
${catalogWithIds(docs)}

# Ce que tu dois produire

De 0 à ${MAX_QUERIES} requêtes de recherche sémantique.

- **Chaque requête doit être autoportante.** Le dernier message peut être une relance elliptique (« et chez les plus de 65 ans ? », « pourquoi ? », « développe le point 2 »). Reconstitue le sujet à partir de l'échange : la requête doit rester compréhensible seule, sans la conversation.
- **Toute mise en regard de deux sources → deux requêtes, jamais une.** C'est impératif, pas une préférence : une requête unique produit un vecteur intermédiaire dominé par un seul des deux côtés, et l'autre article ressort sans aucun passage. Sont concernés « compare A et B », « qu'en dit X ? », « est-ce cohérent avec Y ? », « et dans l'étude de Z ? ». La requête qui vise un article nommé porte son identifiant dans \`doc\` ; celle qui porte le sujet général garde \`doc: null\`.

  La forme attendue, à instancier — ne recopie jamais ces libellés, ce sont des emplacements à remplir :

  \`\`\`
  requête 1 : <le sujet en cours de discussion, en termes techniques>          doc: null
  requête 2 : <le même sujet>                                                  doc: <identifiant de l'article nommé>
  \`\`\`
- **\`doc\` ne vaut un identifiant que si l'utilisateur désigne explicitement un article** (auteur, année, titre). Sinon \`null\`, pour chercher dans tout le corpus.
- **Reprends le vocabulaire technique tel qu'il figure dans les articles** — ils sont majoritairement en anglais. Une requête en français avec les termes techniques anglais fonctionne bien.

# Quand rendre une liste vide

\`queries: []\` — aucune recherche — dans deux cas seulement :
- la question ne porte que sur les **métadonnées** de la bibliothèque, celles qui figurent dans la liste ci-dessus : nombre d'articles, titres, auteurs, années, revues (« combien d'articles ? », « lesquels sont les plus récents ? », « as-tu quelque chose de Smith ? ») ;
- le tour n'appelle aucune source nouvelle (« merci », « bonjour », « reformule », « résume ce que tu viens de dire »).

Dès que la réponse suppose de savoir ce que les articles **contiennent** — populations, pays étudiés, méthodes, résultats, chiffres, conclusions — il faut chercher, même si la question ressemble à une question sur la bibliothèque. « Quels pays sont représentés dans le corpus ? » demande une recherche : le pays étudié n'est pas dans le titre.`

const shorten = (t: Turn): Turn =>
  t.role === 'assistant' && t.content.length > ECHO
    ? { ...t, content: t.content.slice(0, ECHO) + '…' }
    : t

/**
 * Un seul appel qui règle quatre choses : relance pronominale, comparaison
 * entre deux articles, résolution d'un article nommé en identifiant, et
 * détection des tours qui n'appellent aucune recherche.
 *
 * Jamais bloquant : en cas d'échec on retombe sur la question brute, qui est le
 * comportement d'avant.
 */
export async function planSearch(
  history: Turn[],
  docs: CatalogEntry[],
  scope: string | null,
): Promise<SearchQuery[]> {
  const question = [...history].reverse().find((m) => m.role === 'user')?.content ?? ''
  const fallback: SearchQuery[] = [{ q: question, doc: scope }]
  if (docs.length === 0) return []

  try {
    const res = await new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }).messages.create({
      model: MODEL,
      max_tokens: 500,
      system: instructions(docs),
      messages: history.slice(-6).map(shorten),
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
    })
    const text = res.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') return fallback
    const parsed = JSON.parse(text.text) as { queries?: SearchQuery[] }
    const retenues = sanitize(parsed.queries, docs, scope)
    // Une liste vidée par l'assainissement n'est pas un « aucune recherche
    // nécessaire » : c'est un plan inexploitable, on cherche quand même.
    return retenues.length === 0 && (parsed.queries ?? []).length > 0 ? fallback : retenues
  } catch (err: any) {
    console.error('[plan] repli sur la question brute —', err?.message)
    return fallback
  }
}

/** Le plan vient d'un modèle : on ne fait confiance ni aux identifiants ni au nombre. */
function sanitize(
  queries: SearchQuery[] | undefined,
  docs: CatalogEntry[],
  scope: string | null,
): SearchQuery[] {
  const known = new Set(docs.map((d) => d.id))
  return (queries ?? [])
    .filter((q) => typeof q?.q === 'string' && q.q.trim().length > 0)
    // Un gabarit recopié tel quel plutôt qu'instancié : mesuré une fois sur
    // quatorze quand la consigne portait un exemple concret. Chercher là-dessus
    // ne ramènerait que du bruit — mieux vaut retomber sur la question brute.
    .filter((q) => !/[<>]/.test(q.q))
    .slice(0, MAX_QUERIES)
    .map((q) => ({
      q: q.q.trim(),
      // Un document sélectionné dans la barre latérale est un choix explicite
      // de l'utilisateur : il prime sur ce que propose le planificateur.
      doc: scope ?? (q.doc && known.has(q.doc) ? q.doc : null),
    }))
}

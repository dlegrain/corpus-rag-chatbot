import { db } from './supabase.js'
import { embedQuery } from './embed.js'
import type { Passage } from './prompt.js'
import type { SearchQuery } from './plan.js'

export type Numbered = Passage & { n: number }

/**
 * Budget de passages selon le nombre de requêtes du plan : 1 → 20, 2 → 12, 3 → 9.
 *
 * Généreux à dessein. Un juge LLM comparant les réponses avant/après a tranché
 * cinq fois sur six en faveur de la version qui mobilisait le plus de
 * références distinctes — la diversité ne remplace pas la largeur, elle
 * décide seulement de la façon dont les places sont réparties. Sur un modèle
 * à 1 M de contexte, 24 passages coûtent ~8 000 jetons d'entrée : négligeable
 * devant la qualité de synthèse gagnée.
 */
const BUDGET = [20, 20, 12, 9]
/**
 * On demande plus de candidats que de places pour avoir de quoi diversifier.
 * Le coût est nul : c'est la même requête, quelques lignes de plus.
 */
const SUR_ECHANTILLON = 3
/** Plafond global après fusion : deux requêtes cumulaient sinon leurs plafonds. */
const TOTAL = 24
/** Un passage reporté est du contexte, pas de la matière : peu, et seulement s'il tient encore. */
const CARRY_MAX = 6
/** Plancher absolu, pour le cas où la recherche courante ne ramène presque rien. */
const CARRY_FLOOR = 0.45

/**
 * Une recherche par requête du plan, en parallèle, puis fusion. Deux requêtes
 * ciblant chacune un article garantissent des passages des deux côtés — ce
 * qu'une recherche unique sur une question de comparaison ne fait jamais.
 *
 * Rend aussi l'embedding de la première requête, qui sert de sonde pour juger
 * la pertinence des passages reportés.
 */
export async function search(
  queries: SearchQuery[],
): Promise<{ passages: Passage[]; probe: number[] | null }> {
  if (queries.length === 0) return { passages: [], probe: null }

  const count = BUDGET[Math.min(queries.length, BUDGET.length - 1)]
  const embeddings = await Promise.all(queries.map((q) => embedQuery(q.q)))
  /**
   * Les documents qu'une requête ciblée du plan couvre déjà. Une comparaison
   * produit souvent deux requêtes au texte identique, l'une filtrée sur
   * l'article visé, l'autre libre — et les meilleurs résultats de la libre sont
   * alors ce même article. Les deux côtés se confondent, et la comparaison
   * n'a plus qu'une jambe. La requête libre doit donc regarder ailleurs.
   */
  const dejaCouverts = new Set(queries.map((q) => q.doc).filter(Boolean) as string[])

  const runs = await Promise.all(
    queries.map(async (q, i) => {
      const { data, error } = await db().rpc('match_sci_chunks', {
        query_embedding: embeddings[i],
        match_count: q.doc ? count : count * SUR_ECHANTILLON,
        filter_doc: q.doc ?? null,
      })
      if (error) throw new Error(error.message)
      const rows = (data ?? []) as Passage[]
      // Une requête qui vise un document ne se diversifie pas, et ses passages
      // sont épinglés : c'est le mécanisme même de la comparaison, il faut de
      // la profondeur sur cet article et le plafond global ne doit pas l'éroder.
      if (q.doc) return rows.slice(0, count).map((p) => ({ p, epingle: true }))

      const ailleurs = rows.filter((p) => !dejaCouverts.has(p.document_id))
      // On n'écarte que s'il reste de quoi travailler : sur un corpus étroit,
      // mieux vaut des passages redondants que pas de passages du tout.
      const base = ailleurs.length >= count ? ailleurs : rows
      return diversifier(base, count).map((p) => ({ p, epingle: false }))
    }),
  )

  const tout = runs.flat()
  const epingles = new Set(tout.filter((x) => x.epingle).map((x) => x.p.id))
  const fusion = merge(tout.map((x) => x.p))
  const retenus = fusion.filter((p) => epingles.has(p.id))
  const libres = fusion.filter((p) => !epingles.has(p.id))

  return {
    passages: merge([...retenus, ...diversifier(libres, Math.max(0, TOTAL - retenus.length))]),
    probe: embeddings[0],
  }
}

/**
 * Sans plafond, un article long rafle toutes les places : la longueur d'un
 * document n'a rien à voir avec sa pertinence, mais elle lui donne
 * mécaniquement plus de tickets à la loterie du top-k. Mesuré sur ce corpus :
 * 8 passages sur 14 venaient en moyenne du même article, et deux tours sur
 * treize n'en citaient qu'un seul.
 *
 * Le plafond n'est pas rigide : s'il ne reste pas assez d'articles pertinents,
 * on complète avec les meilleurs candidats écartés plutôt que de rendre moins.
 */
function diversifier(passages: Passage[], count: number): Passage[] {
  const plafond = Math.max(3, Math.ceil(count / 4))
  const pris: Record<string, number> = {}
  const gardes: Passage[] = []
  const ecartes: Passage[] = []

  for (const p of passages) {
    if (gardes.length >= count) break
    const n = pris[p.document_id] ?? 0
    if (n < plafond) {
      pris[p.document_id] = n + 1
      gardes.push(p)
    } else {
      ecartes.push(p)
    }
  }
  return [...gardes, ...ecartes].slice(0, count)
}

/**
 * Les passages déjà cités plus haut dans l'échange, rechargés avec leur
 * similarité à la question courante. Le filtre est ce qui évite d'échanger
 * l'amnésie contre une fixation : si le sujet change, ils s'évincent seuls.
 *
 * Le seuil est **relatif** à ce que la recherche vient de trouver : un passage
 * reporté doit être au moins aussi pertinent que le passage frais médian. Un
 * seuil absolu ne tiendrait pas — les similarités varient beaucoup selon le
 * domaine et la longueur de la requête.
 *
 * La médiane, et non le minimum : depuis que la recherche diversifie, les
 * derniers passages frais viennent d'articles secondaires et tirent le
 * plancher vers le bas. Le minimum laissait alors repasser n'importe quoi.
 *
 * Sans sonde (tour sans recherche), on les garde tels quels : rester sur le
 * même sujet est précisément l'intention.
 */
export async function recall(
  ids: number[],
  probe: number[] | null,
  fresh: Passage[] = [],
): Promise<Passage[]> {
  if (ids.length === 0) return []
  const { data, error } = await db().rpc('sci_chunks_by_ids', {
    ids,
    query_embedding: probe ?? new Array(768).fill(0),
  })
  if (error) throw new Error(error.message)

  const found = (data ?? []) as Passage[]
  if (!probe) return merge(found).slice(0, CARRY_MAX)

  const plancher = Math.max(CARRY_FLOOR, mediane(fresh.map((p) => p.similarity)))
  // Diversifié aussi : sans ça le rappel réintroduit par la porte de service la
  // concentration que la recherche vient d'écarter.
  return diversifier(merge(found.filter((p) => p.similarity >= plancher)), CARRY_MAX)
}

const mediane = (xs: number[]): number => {
  if (xs.length === 0) return 0
  const tri = [...xs].sort((a, b) => a - b)
  return tri[Math.floor(tri.length / 2)]
}

/** Un même passage peut remonter de plusieurs requêtes : on garde le meilleur score. */
function merge(passages: Passage[]): Passage[] {
  const best = new Map<number, Passage>()
  for (const p of passages) {
    const seen = best.get(p.id)
    if (!seen || p.similarity > seen.similarity) best.set(p.id, p)
  }
  return [...best.values()].sort((a, b) => b.similarity - a.similarity)
}

/**
 * Numérotation stable sur toute la conversation. Sans ça, `[2]` désigne une
 * source différente à chaque tour, et les réponses déjà écrites — qui restent
 * dans l'historique — se mettent à pointer ailleurs.
 */
export function number(passages: Passage[], known: Record<string, number>): Numbered[] {
  let next = Math.max(0, ...Object.values(known)) + 1
  return passages.map((p) => {
    const n = known[String(p.id)] ?? next++
    return { ...p, n }
  })
}

/** Les passages reportés ne doivent pas réapparaître parmi les frais. */
export const without = (passages: Passage[], exclude: Passage[]): Passage[] => {
  const ids = new Set(exclude.map((p) => p.id))
  return passages.filter((p) => !ids.has(p.id))
}

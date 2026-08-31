/** Les numéros sont stables sur toute la conversation : ils peuvent dépasser 99. */
const CITE = /\[(\d{1,3})\]/g

export const citedNumbers = (text: string): Set<number> =>
  new Set(Array.from(text.matchAll(CITE)).map((m) => Number(m[1])))

/**
 * Les ancres sont préfixées par le message : la même source peut être listée
 * sous deux réponses, et deux `id` identiques dans le DOM feraient sauter tous
 * les renvois vers la première occurrence.
 *
 * `ancre` rend l'identifiant de la cible, ou `null` quand la source n'est
 * affichée nulle part : la numérotation étant stable sur toute la conversation,
 * le modèle peut légitimement citer un passage d'un tour précédent qui n'a pas
 * été rappelé à celui-ci. Mieux vaut alors un `[11]` en texte brut qu'un lien
 * qui ne mène nulle part.
 */
export const linkCitations = (text: string, ancre: (n: number) => string | null): string =>
  text.replace(CITE, (brut, n) => {
    const cible = ancre(Number(n))
    return cible ? `[${n}](#${cible})` : brut
  })

/** Les numéros sont stables sur toute la conversation : ils peuvent dépasser 99. */
const CITE = /\[(\d{1,3})\]/g

export const citedNumbers = (text: string): Set<number> =>
  new Set(Array.from(text.matchAll(CITE)).map((m) => Number(m[1])))

/**
 * Les ancres sont préfixées par le message : la même source peut être listée
 * sous deux réponses, et deux `id` identiques dans le DOM feraient sauter tous
 * les renvois vers la première occurrence.
 */
export const linkCitations = (text: string, prefix: string): string =>
  text.replace(CITE, (_, n) => `[${n}](#${prefix}-${n})`)

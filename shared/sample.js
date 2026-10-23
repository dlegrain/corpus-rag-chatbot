// Échantillon de texte envoyé à l'extraction des métadonnées (netlify/lib/metadata.ts).
// Partagé par le navigateur (src/lib/api.ts) et le script de seed.
const MAX_CHARS = 6000 // ce que lit le modèle
const MIN_CHARS = 200 // en dessous, extractMeta ne tente pas l'appel
const FRONT_PAGES = 12 // pages liminaires parcourues au plus
const PER_PAGE = 1500 // part de chaque page liminaire : une table des matières ne prend pas tout

/**
 * Un article porte titre, auteurs et année sur ses deux premières pages : on les envoie telles quelles.
 * Un livre ouvre souvent sur une couverture presque vide ; titre, auteurs et année sont alors sur la
 * page de titre intérieure et dans les mentions légales. On parcourt donc les pages liminaires en
 * prenant le début de chacune, jusqu'à remplir l'échantillon.
 * @param {string[]} pages
 * @returns {string}
 */
export function buildSample(pages) {
  const head = pages.slice(0, 2).join('\n')
  if (head.trim().length >= MIN_CHARS) return head.slice(0, MAX_CHARS)

  const parts = []
  let total = 0
  for (const page of pages.slice(0, FRONT_PAGES)) {
    const text = page.trim()
    if (!text) continue
    parts.push(text.slice(0, PER_PAGE))
    total += Math.min(text.length, PER_PAGE)
    if (total >= MAX_CHARS) break
  }
  return parts.join('\n\n').slice(0, MAX_CHARS)
}

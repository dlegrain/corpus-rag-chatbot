// Métadonnées déduites du nom de fichier, quand il suit une convention
// bibliographique : "Auteur AB et al. 2023 (Revue).pdf" -> auteurs / année / revue.
//
// C'est un simple filet de sécurité, pas la source principale : l'extraction
// réelle se fait par modèle sur l'en-tête du document (netlify/lib/metadata.ts).
// Un nom de fichier qui ne suit pas cette forme n'échoue pas — tout part alors
// dans `title`, avec l'année si le nom en contient une ; on n'invente ni auteur ni
// revue. Adaptez PATTERN si vos fichiers suivent une autre convention.
const PATTERN = /^(.+?)\s((?:1[89]|20)\d{2})\s*\((.*\p{L}.*)\)\s*$/u
// Suffixes ajoutés par le système à une copie : « (1) », « - copie », « Copy 2 »…
const COPY_SUFFIX = /(?:\s*\(\d{1,3}\)|[\s_-]+(?:copie|copy)(?:\s*\(?\d{1,3}\)?)?)$/i
// Une année isolée (pas un morceau d'identifiant comme 2001.01234).
const YEAR = /(?<![\d.])(?:1[89]|20)\d{2}(?!\.?\d)/g

/** @returns {{authors:string|null, year:number|null, journal:string|null, title:string}} */
export function parseFilename(filename) {
  let base = filename.replace(/\.pdf$/i, '').trim()
  // Un nom réduit à « (1) » garde son nom : mieux vaut un titre laid qu'un titre vide.
  while (COPY_SUFFIX.test(base) && base.replace(COPY_SUFFIX, '').trim()) base = base.replace(COPY_SUFFIX, '').trim()
  const m = base.match(PATTERN)
  if (!m) {
    const years = base.match(YEAR)
    return { authors: null, year: years ? Number(years.at(-1)) : null, journal: null, title: base }
  }
  const [, authors, year, journal] = m
  return {
    authors: authors.trim() || null,
    year: Number(year),
    journal: journal.trim() || null,
    title: base,
  }
}

/** Libellé court pour les citations : "AlMahasis et al. (2023)" */
export function shortLabel(doc) {
  const first = (doc.authors || doc.title || '').split(/\s+et al\.?/i)[0].split(/\s+/)[0]
  const etal = /et al/i.test(doc.authors || '') ? ' et al.' : ''
  return `${first || 'Document'}${etal}${doc.year ? ` (${doc.year})` : ''}`
}

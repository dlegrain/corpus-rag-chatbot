// Métadonnées déduites du nom de fichier, quand il suit une convention
// bibliographique : "Auteur AB et al. 2023 (Revue).pdf" -> auteurs / année / revue.
//
// C'est un simple filet de sécurité, pas la source principale : l'extraction
// réelle se fait par modèle sur l'en-tête du document (netlify/lib/metadata.ts).
// Un nom de fichier qui ne suit pas cette forme n'échoue pas — tout part alors
// dans `title`. Adaptez PATTERN si vos fichiers suivent une autre convention.
const PATTERN = /^(.*?)\s(\d{4})\s*\((.+)\)\s*$/

/** @returns {{authors:string|null, year:number|null, journal:string|null, title:string}} */
export function parseFilename(filename) {
  const base = filename.replace(/\.pdf$/i, '').trim()
  const m = base.match(PATTERN)
  if (!m) return { authors: null, year: null, journal: null, title: base }
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

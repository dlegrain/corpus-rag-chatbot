// Métadonnées déduites du nom de fichier, ex :
// "AlMahasis SO et al. 2023 (Vaccine).pdf" -> auteurs / année / revue
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

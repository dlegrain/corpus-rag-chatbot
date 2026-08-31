/** Types de `meta.js` — métadonnées déduites du nom de fichier. */
export declare function parseFilename(filename: string): {
  authors: string | null
  year: number | null
  journal: string | null
  title: string
}

export declare function shortLabel(doc: {
  authors?: string | null
  title?: string | null
  year?: number | null
}): string

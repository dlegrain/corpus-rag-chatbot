/** pdf.js pèse ~700 kB : on ne le charge qu'au premier dépôt de fichier. */
async function loadPdfjs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

/** Extrait le texte page par page, en réinsérant les sauts de ligne. */
export async function extractPages(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const pdfjs = await loadPdfjs()
  const buffer = await file.arrayBuffer()
  const task = pdfjs.getDocument({ data: buffer })
  const doc = await task.promise
  const pages: string[] = []

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    let text = ''
    let lastY: number | null = null
    for (const item of content.items as any[]) {
      if (!('str' in item)) continue
      const y = item.transform?.[5] ?? null
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) text += '\n'
      text += item.str
      if (item.hasEOL) text += '\n'
      lastY = y
    }
    pages.push(text)
    onProgress?.(i, doc.numPages)
  }
  await task.destroy()
  return pages
}

/** Un PDF ouvert le reste : feuilleter ou rouvrir une autre citation ne le retélécharge pas. */
const ouverts = new Map<string, Promise<any>>()

/** Ouvre le PDF d'origine d'un document par un lien signé ; seules les pages vues sont téléchargées. */
export function ouvrirPdf(documentId: string): Promise<any> {
  if (!ouverts.has(documentId)) {
    const ouverture = (async () => {
      const res = await fetch(`/api/pdf?id=${documentId}`)
      if (!res.ok) throw new Error('pdf_absent')
      const { url } = await res.json()
      const pdfjs = await loadPdfjs()
      return pdfjs.getDocument({ url }).promise
    })()
    // Un échec n'est pas mis en cache : le lien signé a pu simplement expirer.
    ouverture.catch(() => ouverts.delete(documentId))
    ouverts.set(documentId, ouverture)
  }
  return ouverts.get(documentId) as Promise<any>
}

export type Zone = { x: number; y: number; w: number; h: number }

const serre = (s: string) => s.replace(/[\s­…]+/g, '').toLowerCase()

/**
 * Les lignes de la page qui appartiennent à l'extrait cité, en pixels CSS.
 * On compare sans espaces : l'extrait a été nettoyé, la page ne l'a pas été.
 * Les fragments trop courts sont ignorés : un mot isolé se retrouve partout sur une page.
 */
export async function zonesDuPassage(page: any, excerpt: string, echelle: number): Promise<Zone[]> {
  const cible = serre(excerpt)
  if (cible.length < 20) return []
  const vue = page.getViewport({ scale: echelle })
  const contenu = await page.getTextContent()
  const zones: Zone[] = []
  for (const item of contenu.items as any[]) {
    if (!('str' in item)) continue
    const texte = serre(item.str)
    if (texte.length < 8 || !cible.includes(texte)) continue
    const [x, y] = vue.convertToViewportPoint(item.transform[4], item.transform[5])
    const h = Math.abs(item.transform[3]) * echelle
    zones.push({ x, y: y - h, w: item.width * echelle, h: h * 1.25 })
  }
  return zones
}

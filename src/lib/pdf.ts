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

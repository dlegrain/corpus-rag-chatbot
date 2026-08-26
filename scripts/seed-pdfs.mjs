#!/usr/bin/env node
// Indexe les PDF du dossier ./pdfs via l'API du site (même chemin de code que le drag & drop).
//   node scripts/seed-pdfs.mjs [--url https://mon-site.netlify.app] [--dir pdfs]
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { chunkPages } from '../shared/chunk.js'

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, all) => (a.startsWith('--') ? [[a.slice(2), all[i + 1]]] : [])),
)
const BASE = (args.url ?? 'http://localhost:8888').replace(/\/$/, '')
const DIR = resolve(args.dir ?? 'pdfs')
const BATCH = 12

async function extractPages(path) {
  const data = new Uint8Array(await readFile(path))
  const task = pdfjs.getDocument({ data, useSystemFonts: true })
  const doc = await task.promise
  const pages = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    let text = ''
    let lastY = null
    for (const item of content.items) {
      if (!('str' in item)) continue
      const y = item.transform?.[5] ?? null
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) text += '\n'
      text += item.str
      if (item.hasEOL) text += '\n'
      lastY = y
    }
    pages.push(text)
  }
  await task.destroy()
  return pages
}

async function post(body) {
  const res = await fetch(`${BASE}/api/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`${res.status} — réponse non JSON : ${text.slice(0, 200)}`)
  }
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
  return json
}

const files = (await readdir(DIR)).filter((f) => /\.pdf$/i.test(f)).sort()
console.log(`→ ${files.length} PDF dans ${DIR}\n→ cible ${BASE}\n`)

for (const [i, filename] of files.entries()) {
  const label = `[${i + 1}/${files.length}] ${filename}`
  try {
    const pages = await extractPages(resolve(DIR, filename))
    const chunks = chunkPages(pages)
    const docId = crypto.randomUUID()

    const started = await post({
      op: 'start',
      docId,
      filename,
      nPages: pages.length,
      sample: pages.slice(0, 2).join('\n').slice(0, 6000),
    })
    if (started.duplicate) {
      console.log(`${label} — déjà indexé, ignoré`)
      continue
    }

    for (let j = 0; j < chunks.length; j += BATCH) {
      await post({ op: 'chunks', docId, chunks: chunks.slice(j, j + BATCH) })
      process.stdout.write(`\r${label} — ${Math.min(j + BATCH, chunks.length)}/${chunks.length} passages`)
    }
    await post({ op: 'finish', docId })
    console.log(
      `\r${label} — ${pages.length} p. · ${chunks.length} passages · ${started.authors ?? ''} ${started.year ?? ''}`.trimEnd(),
    )
  } catch (err) {
    console.error(`\r${label} — ÉCHEC : ${err.message}`)
  }
}

console.log('\nTerminé.')

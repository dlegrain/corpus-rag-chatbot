#!/usr/bin/env node
// Dépose les PDF d'origine dans le stockage, pour ouvrir chaque source à la page citée.
// À lancer APRÈS seed-pdfs.mjs : chaque fichier est rattaché à son document par son nom.
//   CORPUS_PREFIX=agt node --env-file=.env scripts/upload-pdfs.mjs --dir pdfs/travail
// Seuls les PDF que l'on a le droit de rediffuser vont dans le stockage (licence ouverte,
// documents internes) : un PDF déposé par un visiteur par glisser-déposer n'y va jamais.
import { readdir, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((a, i, all) => (a.startsWith('--') ? [[a.slice(2), all[i + 1]]] : [])),
)
const DIR = resolve(args.dir ?? 'pdfs')
const PREFIX = process.env.CORPUS_PREFIX || 'sci'
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const files = (await readdir(DIR)).filter((f) => /\.pdf$/i.test(f))
for (const filename of files) {
  const { data: doc } = await db.from(`${PREFIX}_documents`).select('id').eq('filename', filename).maybeSingle()
  if (!doc) {
    console.log(`${filename} — aucun document de ce nom dans ${PREFIX}_documents, ignoré`)
    continue
  }
  const { error } = await db.storage
    .from(`${PREFIX}-pdfs`)
    .upload(`${doc.id}.pdf`, await readFile(join(DIR, filename)), { contentType: 'application/pdf', upsert: true })
  console.log(`${filename} — ${error ? 'ÉCHEC : ' + error.message : 'déposé'}`)
}

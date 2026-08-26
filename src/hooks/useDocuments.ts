import { useCallback, useEffect, useState } from 'react'
import { deleteDocument, fetchDocuments, ingestFile } from '../lib/api'
import type { Doc, UploadState } from '../lib/types'

export function useDocuments() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploads, setUploads] = useState<UploadState[]>([])

  const refresh = useCallback(async () => {
    try {
      setDocs(await fetchDocuments())
    } catch {
      /* le corpus reste tel quel */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const patch = (filename: string, s: Partial<UploadState>) =>
    setUploads((prev) => prev.map((u) => (u.filename === filename ? { ...u, ...s } : u)))

  const upload = useCallback(
    async (files: File[]) => {
      const pdfs = files.filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
      if (pdfs.length === 0) return
      setUploads((prev) => [
        ...prev,
        ...pdfs.map((f) => ({ filename: f.name, progress: 0, phase: 'lecture' as const })),
      ])

      for (const file of pdfs) {
        try {
          await ingestFile(file, (s) => patch(file.name, s))
        } catch (err: any) {
          patch(file.name, { phase: 'erreur', detail: err?.message ?? 'échec' })
        }
        await refresh()
      }

      setTimeout(
        () => setUploads((prev) => prev.filter((u) => u.phase === 'erreur')),
        3500,
      )
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      setDocs((prev) => prev.filter((d) => d.id !== id))
      try {
        await deleteDocument(id)
      } finally {
        refresh()
      }
    },
    [refresh],
  )

  return { docs, loading, uploads, upload, remove, refresh }
}

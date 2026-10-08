export type Doc = {
  id: string
  title: string
  authors: string | null
  year: number | null
  journal: string | null
  filename: string
  n_pages: number | null
  n_chunks: number
  status: string
  created_at: string
  /** Le PDF d'origine est en stockage : la source s'ouvre à la page citée. */
  has_pdf?: boolean
}

export type Source = {
  /** Identifiant du passage en base — sert à le reporter aux tours suivants. */
  id: number
  n: number
  documentId: string
  title: string
  authors: string | null
  year: number | null
  journal: string | null
  page: number | null
  similarity: number
  excerpt: string
  /** Rappelé d'un tour précédent plutôt que retrouvé pour cette question. */
  recalled?: boolean
}

export type Msg = {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  error?: string
}

export type UploadState = {
  filename: string
  progress: number
  phase: 'lecture' | 'indexation' | 'terminé' | 'erreur' | 'doublon'
  detail?: string
}

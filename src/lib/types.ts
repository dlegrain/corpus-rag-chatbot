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
}

export type Source = {
  n: number
  documentId: string
  title: string
  authors: string | null
  year: number | null
  journal: string | null
  page: number | null
  similarity: number
  excerpt: string
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

import { useRef } from 'react'
import DocumentList from './DocumentList'
import UploadQueue from './UploadQueue'
import BrandCard from './BrandCard'
import type { useDocuments } from '../hooks/useDocuments'

type Props = {
  library: ReturnType<typeof useDocuments>
  scope: string | null
  onScope: (id: string | null) => void
  open: boolean
  onClose: () => void
}

export default function Sidebar({ library, scope, onScope, open, onClose }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const total = library.docs.reduce((s, d) => s + (d.n_chunks || 0), 0)

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-ink/25 backdrop-blur-[2px] lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[19.5rem] flex-col border-r border-line bg-surface transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h1 className="text-[21px] leading-none font-extrabold tracking-[-0.02em]">Corpus</h1>
            <p className="mt-2 text-etiquette font-bold tracking-[0.08em] text-muted uppercase">
              {library.docs.length} article{library.docs.length > 1 ? 's' : ''} ·{' '}
              {total.toLocaleString('fr-BE')} passages
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm p-1.5 text-muted hover:bg-paper lg:hidden"
            aria-label="Fermer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4">
          <button
            onClick={() => input.current?.click()}
            className="group flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface-2 px-3 py-3 text-note font-[650] text-ink-soft transition hover:border-accent hover:bg-accent-soft hover:text-accent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Ajouter des PDF
          </button>
          <p className="mt-2 text-center text-meta text-muted">
            ou glissez-les n’importe où sur la page
          </p>
          <input
            ref={input}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              library.upload(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line">
          <UploadQueue uploads={library.uploads} />
          <DocumentList
            docs={library.docs}
            loading={library.loading}
            scope={scope}
            onScope={onScope}
            onRemove={library.remove}
          />
          <BrandCard />
        </div>
      </aside>
    </>
  )
}

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
            <h1 className="font-serif text-[1.45rem] leading-none tracking-tight">Corpus</h1>
            <p className="mt-1.5 text-[0.7rem] font-medium tracking-[0.09em] text-muted uppercase">
              {library.docs.length} article{library.docs.length > 1 ? 's' : ''} ·{' '}
              {total.toLocaleString('fr-BE')} passages
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-paper lg:hidden"
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
            className="group flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-paper px-3 py-3 text-[0.83rem] font-medium text-ink-soft transition hover:border-accent hover:bg-accent-soft hover:text-accent-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Ajouter des PDF
          </button>
          <p className="mt-2 text-center text-[0.68rem] leading-relaxed text-muted">
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

        <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
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

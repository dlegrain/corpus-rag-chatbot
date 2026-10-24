import DocumentList from './DocumentList'
import UploadQueue from './UploadQueue'
import BrandCard from './BrandCard'
import AddPdfs from './AddPdfs'
import AdminAccess from './AdminAccess'
import type { useDocuments } from '../hooks/useDocuments'
import type { useAdmin } from '../hooks/useAdmin'

type Props = {
  library: ReturnType<typeof useDocuments>
  /** Le mode administrateur : seul il ajoute et retire des documents. */
  acces: ReturnType<typeof useAdmin>
  scope: string[]
  onToggle: (id: string) => void
  onClear: () => void
  open: boolean
  onClose: () => void
}

export default function Sidebar({ library, acces, scope, onToggle, onClear, open, onClose }: Props) {
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

        {acces.admin && <AddPdfs onFiles={library.upload} />}

        <div className={`min-h-0 flex-1 overflow-y-auto border-t border-line ${acces.admin ? 'mt-3' : ''}`}>
          <UploadQueue uploads={library.uploads} />
          <DocumentList
            docs={library.docs}
            loading={library.loading}
            scope={scope}
            onToggle={onToggle}
            onClear={onClear}
            onRemove={acces.admin ? library.remove : undefined}
          />
          <AdminAccess acces={acces} />
          <BrandCard />
        </div>
      </aside>
    </>
  )
}

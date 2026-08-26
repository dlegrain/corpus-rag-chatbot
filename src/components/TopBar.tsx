import type { Doc } from '../lib/types'

type Props = {
  count: number
  scopedDoc: Doc | null
  onClearScope: () => void
  onMenu: () => void
  onReset: () => void
  hasMessages: boolean
}

export default function TopBar({ count, scopedDoc, onClearScope, onMenu, onReset, hasMessages }: Props) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur lg:px-8">
      <button onClick={onMenu} className="rounded-lg p-2 text-ink-soft hover:bg-paper lg:hidden" aria-label="Corpus">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        {scopedDoc ? (
          <button
            onClick={onClearScope}
            className="group flex max-w-full items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-[0.78rem] font-medium text-accent-ink"
          >
            <span className="shrink-0 text-[0.65rem] tracking-wider uppercase opacity-70">Article seul</span>
            <span className="truncate">{scopedDoc.authors ?? scopedDoc.title}</span>
            <svg
              className="shrink-0 opacity-60 group-hover:opacity-100"
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <p className="truncate text-[0.8rem] text-muted">
            Recherche sur <span className="font-medium text-ink-soft">l’ensemble du corpus</span>
            {count > 0 && <span className="font-mono"> · {count} articles</span>}
          </p>
        )}
      </div>

      <a
        href="https://ai-shift.be"
        target="_blank"
        rel="noreferrer"
        className="hidden items-center gap-2 text-[0.7rem] text-muted transition hover:text-ink sm:flex"
      >
        Conçu par
        <img src="/logo-ai-shift.png" alt="AI Shift" className="h-3.5 w-auto opacity-80" />
      </a>

      {hasMessages && (
        <button
          onClick={onReset}
          className="rounded-lg border border-line px-3 py-1.5 text-[0.75rem] font-medium text-ink-soft transition hover:bg-paper"
        >
          Nouvelle question
        </button>
      )}
    </header>
  )
}

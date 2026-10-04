export default function DropOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="animate-rise rounded-xl border-2 border-dashed border-accent-bord bg-surface px-14 py-12 text-center shadow-carte">
        <svg
          className="mx-auto text-accent"
          width="42"
          height="42"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="M12 16V4M7 9l5-5 5 5" />
          <path d="M4 16v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2" />
        </svg>
        <p className="titre-carte mt-4 text-ink">Déposez vos articles</p>
        <p className="mt-1 text-note text-ink-soft">
          Les PDF seront lus, découpés et ajoutés au corpus
        </p>
      </div>
    </div>
  )
}

export default function DropOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="animate-rise rounded-3xl border-2 border-dashed border-white/70 bg-white/10 px-14 py-12 text-center">
        <svg
          className="mx-auto text-white"
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
        <p className="mt-4 font-serif text-2xl text-white">Déposez vos articles</p>
        <p className="mt-1 text-[0.82rem] text-white/70">
          Les PDF seront lus, découpés et ajoutés au corpus
        </p>
      </div>
    </div>
  )
}

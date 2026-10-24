import { useRef } from 'react'

/** Le bouton d'ajout de PDF — affiché au seul administrateur (voir AdminAccess). */
export default function AddPdfs({ onFiles }: { onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  return (
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
      <p className="mt-2 text-center text-meta text-muted">ou glissez-les n’importe où sur la page</p>
      <input
        ref={input}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
    </div>
  )
}

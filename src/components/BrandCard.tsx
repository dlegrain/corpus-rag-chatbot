const LINKS = [
  { label: 'Formations', href: 'https://ai-shift.be/formations' },
  { label: 'Conseil', href: 'https://ai-shift.be/conseil' },
  { label: 'Contact', href: 'https://ai-shift.be/contact' },
]

/** Le bloc de marque AI Shift, dans sa version une colonne (largeur de la barre latérale). */
export default function BrandCard() {
  return (
    <footer className="mx-3 mt-2 mb-3">
      <div className="marque-grad rounded-2xl border border-white/10 p-5 text-accent-ink">
        <span className="block rounded-xl bg-surface p-4">
          <img src="/logo-ai-shift.png" alt="AI Shift — Diederick Legrain" className="block w-full" />
        </span>

        <p className="mt-5 text-[12px] font-[650] tracking-[0.14em] text-accent-clair uppercase">Conçu par</p>
        <h2 className="mt-1.5 text-[21px] leading-[1.08] font-extrabold tracking-[-0.02em]">Diederick Legrain</h2>
        <p className="mt-2.5 text-meta leading-[1.55] text-white/78">
          AI Shift — conseil &amp; formation en intelligence artificielle pour les organisations.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href="https://ai-shift.be"
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-surface bg-surface px-3.5 py-[9px] text-[14px] font-bold text-ink transition hover:bg-accent-soft"
          >
            Visiter ai-shift.be
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M7 17 17 7M8 7h9v9" />
            </svg>
          </a>
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-md border border-white/30 px-2 py-[7px] text-center text-meta transition hover:border-white/70"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-meta text-muted">
        © {new Date().getFullYear()} AI Shift · Diederick Legrain
      </p>
    </footer>
  )
}

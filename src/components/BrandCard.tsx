const LINKS = [
  { label: 'Formations', href: 'https://ai-shift.be/formations' },
  { label: 'Conseil', href: 'https://ai-shift.be/conseil' },
  { label: 'Contact', href: 'https://ai-shift.be/contact' },
]

export default function BrandCard() {
  return (
    <footer className="mx-3 mt-2 mb-3 rounded-2xl bg-gradient-to-br from-ink to-[#263646] p-4 text-white">
      <div className="rounded-xl bg-white px-3.5 py-3">
        <img src="/logo-ai-shift.png" alt="AI Shift — by Diederick Legrain" className="w-full" />
      </div>

      <p className="mt-3.5 text-[0.95rem] leading-tight font-semibold">Diederick Legrain</p>
      <p className="mt-1 text-[0.72rem] leading-relaxed text-white/70">
        AI Shift — conseil &amp; formation en intelligence artificielle pour les organisations.
      </p>

      <a
        href="https://ai-shift.be"
        target="_blank"
        rel="noreferrer"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[0.78rem] font-semibold text-ink transition hover:bg-white/90"
      >
        Visiter ai-shift.be
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M7 17 17 7M8 7h9v9" />
        </svg>
      </a>

      <div className="mt-2.5 flex justify-center gap-3 text-[0.68rem] text-white/60">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer" className="hover:text-white">
            {l.label}
          </a>
        ))}
      </div>

      <p className="mt-3 border-t border-white/10 pt-2.5 text-center text-[0.62rem] text-white/40">
        © {new Date().getFullYear()} AI Shift · Diederick Legrain
      </p>
    </footer>
  )
}

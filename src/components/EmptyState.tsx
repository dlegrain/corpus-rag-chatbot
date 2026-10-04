import { DOMAINE } from '../../shared/domaine.js'
import type { Doc } from '../lib/types'

const SUGGESTIONS = DOMAINE.suggestions

type Props = {
  docs: Doc[]
  scopedDoc: Doc | null
  onPick: (q: string) => void
}

export default function EmptyState({ docs, scopedDoc, onPick }: Props) {
  const years = docs.map((d) => d.year).filter(Boolean) as number[]
  const span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : null

  return (
    <div className="pt-6 pb-4 lg:pt-14">
      <h2 className="text-[clamp(30px,6vw,46px)] leading-[1.08] font-extrabold tracking-[-0.02em] text-ink">
        {DOMAINE.accueilTitre}
        <br />
        <span className="text-accent">{DOMAINE.accueilTitreAccent}</span>
      </h2>

      <p className="mt-4 max-w-(--mesure) text-intro leading-[1.55] text-ink-soft">
        {docs.length === 0 ? (
          <>
            Le corpus est vide. Glissez vos documents au format PDF n’importe où sur la page : ils
            sont lus, découpés en passages et indexés en quelques secondes.
          </>
        ) : scopedDoc ? (
          <>
            Vous interrogez uniquement <strong>{scopedDoc.title}</strong>. Les réponses citent la
            page exacte de chaque passage utilisé.
          </>
        ) : (
          <>
            {docs.length} {DOMAINE.unitePluriel} indexés{span && ` (${span})`}. Posez une question en français :
            la réponse s’appuie sur les passages les plus proches, avec la référence et la page de
            chacun.
          </>
        )}
      </p>

      {docs.length > 0 && (
        <div className="mt-9">
          <p className="text-meta font-bold tracking-[0.1em] text-accent uppercase">
            Pour commencer
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onPick(s)}
                className="group rounded-xl border border-line bg-surface px-4 py-3.5 text-left text-note leading-normal text-ink-soft shadow-carte transition hover:border-accent-bord hover:bg-accent-soft hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

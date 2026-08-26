import type { Doc } from '../lib/types'

const SUGGESTIONS = [
  'Quels sont les principaux freins à la vaccination en pharmacie identifiés dans le corpus ?',
  'Quels effets la vaccination par le pharmacien a-t-elle sur la couverture vaccinale ?',
  'Quelles barrières réglementaires reviennent d’un pays à l’autre ?',
  'Compare les méthodologies employées : quels devis d’étude et quelles tailles d’échantillon ?',
]

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
      <h2 className="font-serif text-[2.4rem] leading-[1.08] tracking-tight text-ink lg:text-[3rem]">
        Interrogez votre
        <br />
        <span className="italic">bibliothèque scientifique</span>
      </h2>

      <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-ink-soft">
        {docs.length === 0 ? (
          <>
            Le corpus est vide. Glissez vos articles au format PDF n’importe où sur la page : ils
            sont lus, découpés en passages et indexés en quelques secondes.
          </>
        ) : scopedDoc ? (
          <>
            Vous interrogez uniquement <strong>{scopedDoc.title}</strong>. Les réponses citent la
            page exacte de chaque passage utilisé.
          </>
        ) : (
          <>
            {docs.length} articles indexés{span && ` (${span})`}. Posez une question en français :
            la réponse s’appuie sur les passages les plus proches, avec la référence et la page de
            chacun.
          </>
        )}
      </p>

      {docs.length > 0 && (
        <div className="mt-9">
          <p className="text-[0.66rem] font-semibold tracking-[0.11em] text-muted uppercase">
            Pour commencer
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onPick(s)}
                className="group rounded-xl border border-line bg-surface px-4 py-3.5 text-left text-[0.83rem] leading-snug text-ink-soft transition hover:border-accent/40 hover:bg-accent-soft hover:text-accent-ink"
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

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ouvrirPdf, zonesDuPassage, type Zone } from '../lib/pdf'

type Props = {
  documentId: string
  title: string
  page: number
  /** L'extrait cité : sert à le surligner sur la page. */
  excerpt: string
  onClose: () => void
}

/**
 * La page du document telle qu'imprimée, ouverte à l'endroit cité, passage surligné.
 * C'est ce qui rend une réponse vérifiable : le lecteur voit le tableau entier, ses
 * en-têtes et ses notes, pas seulement le texte qu'on en a extrait.
 * Reprise de la version Sephi de Corpus (corpus-sephi), sans la couche d'accès.
 */
export default function PdfPage({ documentId, title, page, excerpt, onClose }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [courante, setCourante] = useState(page)
  const [total, setTotal] = useState<number | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement')

  useEffect(() => {
    const fermer = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setCourante((p) => Math.max(1, p - 1))
      if (e.key === 'ArrowRight') setCourante((p) => (total ? Math.min(total, p + 1) : p))
    }
    window.addEventListener('keydown', fermer)
    return () => window.removeEventListener('keydown', fermer)
  }, [onClose, total])

  useEffect(() => {
    let annule = false
    let rendu: { cancel: () => void } | null = null
    setEtat('chargement')

    ouvrirPdf(documentId)
      .then(async (doc) => {
        if (annule) return
        setTotal(doc.numPages)
        const feuille = await doc.getPage(courante)
        const cible = canvas.current
        if (annule || !cible) return

        // Largeur utile de la fenêtre, rendue à la densité de l'écran pour rester nette.
        const largeur = Math.min(880, window.innerWidth - 48)
        const echelle = largeur / feuille.getViewport({ scale: 1 }).width
        const vue = feuille.getViewport({ scale: echelle * (window.devicePixelRatio || 1) })
        cible.width = vue.width
        cible.height = vue.height
        cible.style.width = `${largeur}px`

        const tache = feuille.render({ canvas: cible, canvasContext: cible.getContext('2d')!, viewport: vue })
        rendu = tache
        await tache.promise
        if (annule) return

        // Le surlignage ne vaut que sur la page citée, pas sur celles qu'on feuillette.
        setZones(courante === page ? await zonesDuPassage(feuille, excerpt, echelle) : [])
        setEtat('pret')
      })
      .catch((err) => {
        if (!annule && err?.name !== 'RenderingCancelledException') setEtat('erreur')
      })

    return () => {
      annule = true
      rendu?.cancel()
    }
  }, [documentId, courante, page, excerpt])

  // Rendu hors du fil de la conversation : les messages sont animés par une
  // transformation CSS, qui enfermerait sinon la fenêtre dans leur colonne.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title}, page ${courante}`}
      className="fixed inset-0 z-50 flex flex-col bg-ink/70 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <header
        className="flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="min-w-0 truncate text-note font-[650] text-ink">
          <span className="hidden sm:inline">{title} · </span>
          <span className="font-mono font-normal text-muted">
            page {courante}
            {total ? ` / ${total}` : ''}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-1.5 text-meta">
          <button
            onClick={() => setCourante((p) => Math.max(1, p - 1))}
            disabled={courante <= 1}
            className="rounded-sm border border-line bg-surface px-3 py-1.5 font-[650] text-ink-soft transition hover:border-accent-bord hover:text-accent disabled:pointer-events-none disabled:opacity-40"
          >
            ←<span className="hidden sm:inline"> Précédente</span>
          </button>
          {courante !== page && (
            <button
              onClick={() => setCourante(page)}
              className="rounded-sm bg-accent-soft px-3 py-1.5 font-[650] text-accent transition hover:bg-accent hover:text-accent-ink"
            >
              <span className="hidden sm:inline">Revenir à la page citée </span>({page})
            </button>
          )}
          <button
            onClick={() => setCourante((p) => (total ? Math.min(total, p + 1) : p))}
            disabled={total !== null && courante >= total}
            className="rounded-sm border border-line bg-surface px-3 py-1.5 font-[650] text-ink-soft transition hover:border-accent-bord hover:text-accent disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="hidden sm:inline">Suivante </span>→
          </button>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="ml-2 rounded-sm bg-accent px-3 py-1.5 font-[650] text-accent-ink transition hover:bg-accent-deep"
          >
            Fermer
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        <div className="relative mx-auto w-fit" onClick={(e) => e.stopPropagation()}>
          <canvas ref={canvas} className="block rounded-xs bg-surface shadow-(--ombre-image)" />
          {zones.map((z, i) => (
            <span
              key={i}
              data-surlignage
              className="pointer-events-none absolute rounded-xs bg-(--surligne) mix-blend-multiply"
              style={{ left: z.x, top: z.y, width: z.w, height: z.h }}
            />
          ))}
          {etat !== 'pret' && (
            <p className="absolute inset-x-0 top-10 mx-auto w-fit rounded-lg border border-line bg-surface px-4 py-2 text-note whitespace-nowrap text-ink-soft shadow-carte">
              {etat === 'erreur' ? 'Le PDF de ce document n’est pas disponible.' : 'Ouverture de la page…'}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

import { useState } from 'react'
import type { useAdmin } from '../hooks/useAdmin'

/**
 * L'entrée discrète du mode administrateur, en bas de la barre latérale. Le visiteur lit et
 * interroge le corpus ; seul le détenteur du secret voit les boutons d'ajout et de retrait.
 */
export default function AdminAccess({ acces }: { acces: ReturnType<typeof useAdmin> }) {
  const [ouvert, setOuvert] = useState(false)
  const [secret, setSecret] = useState('')
  const [etat, setEtat] = useState<'' | 'verification' | 'refus'>('')

  if (acces.admin) {
    return (
      <div className="mx-4 mt-2 flex items-center justify-between rounded-lg border border-accent-bord bg-accent-soft px-3 py-2 text-meta">
        <span className="font-[650] text-accent">Mode administrateur</span>
        <button onClick={acces.sortir} className="font-[650] text-muted hover:text-accent">
          Quitter
        </button>
      </div>
    )
  }

  if (!ouvert) {
    return (
      <div className="mt-2 text-center">
        <button onClick={() => setOuvert(true)} className="text-meta text-muted underline-offset-2 hover:text-accent hover:underline">
          Accès administrateur
        </button>
      </div>
    )
  }

  const valider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!secret.trim()) return
    setEtat('verification')
    const ok = await acces.entrer(secret)
    setEtat(ok ? '' : 'refus')
    if (ok) {
      setSecret('')
      setOuvert(false)
    }
  }

  return (
    <form onSubmit={valider} className="mx-4 mt-2 rounded-lg border border-line bg-surface-2 p-3">
      <label htmlFor="secret-admin" className="block text-etiquette font-bold tracking-[0.08em] text-muted uppercase">
        Secret administrateur
      </label>
      <input
        id="secret-admin"
        type="password"
        autoComplete="current-password"
        autoFocus
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        className="mt-1.5 w-full rounded-sm border border-line bg-surface px-2.5 py-1.5 text-meta text-ink outline-none focus:border-accent"
      />
      {etat === 'refus' && <p className="mt-1.5 text-meta text-rouge">Secret non reconnu.</p>}
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOuvert(false)
            setSecret('')
            setEtat('')
          }}
          className="rounded-sm px-2.5 py-1 text-meta font-[650] text-muted hover:text-ink"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={etat === 'verification'}
          className="rounded-sm bg-accent px-3 py-1 text-meta font-[650] text-accent-ink hover:bg-accent-deep disabled:opacity-60"
        >
          {etat === 'verification' ? 'Vérification…' : 'Entrer'}
        </button>
      </div>
    </form>
  )
}

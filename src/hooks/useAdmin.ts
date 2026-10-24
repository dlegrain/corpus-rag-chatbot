import { useCallback, useEffect, useState } from 'react'
import { garderSecret, lireSecret, verifierSecret } from '../lib/admin'

/**
 * Le mode administrateur : les boutons d'ajout et de retrait n'apparaissent qu'une fois le
 * secret reconnu par le serveur. Un secret gardé mais changé depuis est oublié à la visite suivante.
 */
export function useAdmin() {
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    const secret = lireSecret()
    if (!secret) return
    verifierSecret(secret).then((ok) => {
      if (ok) setAdmin(true)
      else garderSecret(null)
    })
  }, [])

  const entrer = useCallback(async (secret: string) => {
    const ok = await verifierSecret(secret.trim())
    if (ok) {
      garderSecret(secret.trim())
      setAdmin(true)
    }
    return ok
  }, [])

  const sortir = useCallback(() => {
    garderSecret(null)
    setAdmin(false)
  }, [])

  return { admin, entrer, sortir }
}

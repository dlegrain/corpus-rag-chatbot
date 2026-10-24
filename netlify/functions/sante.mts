import type { Config } from '@netlify/functions'
import { repondre } from '../lib/sante.js'
import { verifsDuSite } from '../lib/sante-site.js'
import { avecSentry } from '../lib/sentry.js'

/** Santé profonde, sondée par UptimeRobot : voir `netlify/lib/sante.ts`. */
// Les échecs de vérification passent par UptimeRobot (503) ; Sentry ne voit que la route qui plante.
export default avecSentry('sante', (req: Request) => repondre(req, verifsDuSite))

export const config: Config = { path: '/api/sante' }

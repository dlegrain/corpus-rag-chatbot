import type { Config } from '@netlify/functions'
import { repondre } from '../lib/sante.js'
import { verifsDuSite } from '../lib/sante-site.js'

/** Santé profonde, sondée par UptimeRobot : voir `netlify/lib/sante.ts`. */
export default (req: Request) => repondre(req, verifsDuSite)

export const config: Config = { path: '/api/sante' }

/**
 * Les conversations que le banc d'essai rejoue, et ce qu'on attend d'elles.
 *
 * ── À ADAPTER À VOTRE CORPUS ──────────────────────────────────────────────
 * Les quatre scénarios testent des **mécanismes**, pas un sujet : réécrivez
 * les questions pour vos documents en gardant la forme de chaque scénario.
 * C'est cette forme qui a de la valeur, pas la vaccination.
 *
 *   1. Relance elliptique     — la 3e question doit être incompréhensible seule
 *   2. Changement de sujet    — la 2e question doit franchement changer de thème
 *   3. Comparaison            — nommer explicitement un document du corpus
 *   4. Robustesse             — six tours, dont une question sur la biblio
 *                               elle-même et un tour de politesse
 *
 * `motDuSujet` sert à vérifier qu'une relance n'a pas perdu le fil : mettez-y
 * une expression régulière qui doit apparaître dans la réponse du 3e tour.
 */

/** @param {{authors: string|null, year: number|null, title: string}} cible */
export const scenarios = (cible) => [
  {
    titre: '1. Relance pronominale au 3e tour',
    tours: [
      'Quels freins à la vaccination par les pharmaciens sont rapportés ?',
      'Lequel de ces freins revient le plus souvent ?',
      'Et chez les patients âgés ?',
    ],
    motDuSujet: /vaccin|pharmac/i,
  },
  {
    titre: '2. Changement de sujet franc',
    tours: [
      'Que dit le corpus sur la formation des pharmaciens ?',
      'Passons à autre chose : que dit-il de la couverture vaccinale contre la grippe ?',
    ],
  },
  {
    titre: '3. Comparaison entre deux documents',
    tours: [
      'Que rapporte le corpus sur les obstacles à la vaccination en officine ?',
      `Compare cela à ce que dit ${cible.authors ?? cible.title} ${cible.year ?? ''}.`.trim(),
    ],
  },
  {
    titre: '4. Robustesse sur 6 tours',
    tours: [
      'Quels pays sont représentés dans le corpus ?',
      'Combien y a-t-il de documents en tout ?',
      'Que dit le corpus sur l’hésitation vaccinale ?',
      'Quels sont les leviers identifiés ?',
      'Le plus efficace selon les auteurs ?',
      'Merci, c’est clair.',
    ],
  },
]

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  GABARIT — copiez ce fichier sur `domaine.js` et remplissez-le.          ║
 * ║                                                                          ║
 * ║      cp shared/domaine.exemple.js shared/domaine.js                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Exemple rempli ici : un corpus de procédures internes RH, en français.
 * Remplacez par le vôtre. C'est le seul fichier de code à toucher pour
 * changer le métier du chatbot.
 *
 * Les trois autres réglages, techniques et indépendants du sujet, sont :
 *   • `shared/chunk.js`            → TARGET / OVERLAP, selon la densité de vos documents
 *   • `netlify/lib/metadata.ts`    → les métadonnées à extraire de l'en-tête
 *   • `netlify/lib/retrieve.ts`    → BUDGET / TOTAL, le nombre de passages envoyés au modèle
 *
 * Et pour l'habillage visuel, voir le README, § « Adapter à un autre corpus ».
 */
export const DOMAINE = {
  /**
   * Qui est l'assistant et à qui il s'adresse. Première phrase du prompt de
   * génération : c'est le levier le plus puissant de tout le système.
   * Soyez précis sur le public — « un public professionnel » et « des agents
   * qui découvrent le sujet » ne produisent pas du tout les mêmes réponses.
   */
  role: `Tu es l'assistant documentaire du service des ressources humaines. Tu réponds aux questions des gestionnaires sur les procédures internes, au fil d'une conversation.`,

  /** Comment décrire le corpus au planificateur de recherche et au juge. */
  natureDuCorpus: `un corpus de procédures internes`,

  /** Le mot qui désigne une unité documentaire. */
  unite: 'procédure',
  unitePluriel: 'procédures',

  /**
   * Consigne de langue pour le planificateur, si les documents ne sont pas
   * dans la langue des utilisateurs.
   *
   * ⚠️ Chaîne vide quand documents et questions partagent la même langue —
   * c'est le cas ici. Une consigne fausse laissée là dégrade silencieusement
   * la recherche à chaque question posée.
   */
  langueDocuments: '',

  /**
   * Ce qui fait une bonne réponse dans votre métier. Une puce par ligne.
   * Tableau vide si les règles génériques vous suffisent.
   */
  reglesMetier: [
    `Cite toujours la version et la date d'entrée en vigueur de la procédure : une règle abrogée reste dans le corpus.`,
    `Quand deux procédures se contredisent, signale-le explicitement plutôt que de trancher.`,
    `Distingue ce qui est une obligation de ce qui est une recommandation.`,
  ],

  /** Écran d'accueil : le titre, dont la seconde ligne passe en couleur d'accent. */
  accueilTitre: 'Interrogez vos',
  accueilTitreAccent: 'procédures internes',

  /** Questions proposées au premier lancement. Trois ou quatre suffisent. */
  suggestions: [
    'Quelle est la procédure pour une demande de congé exceptionnel ?',
    'Quels documents fournir lors d’une embauche ?',
    'Que dit le règlement sur le télétravail ?',
    'Quelles sont les étapes d’un entretien d’évaluation ?',
  ],
}

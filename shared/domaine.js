/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  LE FICHIER DU DOMAINE — c'est ici, et nulle part ailleurs, que Corpus   ║
 * ║  est rattaché à un sujet particulier.                                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Pour adapter le chatbot à VOS documents, copiez `domaine.exemple.js` sur ce
 * fichier et remplissez-le. Aucun autre fichier de code n'a besoin d'être
 * touché : le prompt de génération, le planificateur de recherche, l'écran
 * d'accueil et le banc d'essai lisent tous les valeurs ci-dessous.
 *
 * Ce fichier ne contient aucune logique. Uniquement des phrases.
 *
 * La version présente est celle du corpus de démonstration : une bibliothèque
 * d'articles scientifiques sur la vaccination en pharmacie d'officine.
 */
export const DOMAINE = {
  /**
   * Qui est l'assistant et à qui il s'adresse. Première phrase du prompt de
   * génération : c'est le levier le plus puissant de tout le système.
   */
  role: `Tu es un assistant de recherche qui répond à des questions sur un corpus d'articles scientifiques, au fil d'une conversation. Tu t'adresses à un public professionnel (pharmacie, santé publique, vaccination).`,

  /**
   * Comment décrire le corpus au planificateur de recherche et au juge.
   * Une seule phrase, au génitif : « adossé à ... ».
   */
  natureDuCorpus: `un corpus d'articles scientifiques`,

  /**
   * Le mot qui désigne une unité documentaire, au singulier et au pluriel.
   * « article » / « texte » / « procédure » / « fiche » / « décision »…
   */
  unite: 'article',
  unitePluriel: 'articles',

  /**
   * Consigne de langue passée au planificateur, quand les documents ne sont
   * pas dans la langue des utilisateurs. Chaîne vide = aucune consigne.
   *
   * Attention : laisser ici une consigne fausse dégrade silencieusement la
   * recherche à chaque question.
   */
  langueDocuments: `Reprends le vocabulaire technique tel qu'il figure dans les documents — ils sont majoritairement en anglais. Une requête en français avec les termes techniques anglais fonctionne bien.`,

  /**
   * Règles propres au métier, ajoutées à celles — génériques — du prompt de
   * génération. C'est ici qu'on dit à l'assistant ce qui fait une bonne réponse
   * DANS VOTRE DOMAINE. Une puce par ligne, sans tiret initial.
   */
  reglesMetier: [
    `Quand plusieurs études du corpus portent sur la question, dis sur quoi elles convergent, sur quoi elles divergent, ce qu'une revue de synthèse établit et ce qu'une enquête primaire mesure.`,
    `Distingue clairement ce qui est établi de ce qui est une hypothèse ou une limite reconnue par les auteurs.`,
    `Quand tu donnes des chiffres (prévalences, OR, IC95%, effectifs), reprends-les exactement tels qu'ils figurent dans l'extrait.`,
  ],

  /** Écran d'accueil : le titre, dont la seconde ligne est en italique. */
  accueilTitre: 'Interrogez votre',
  accueilTitreItalique: 'bibliothèque scientifique',

  /** Questions proposées au premier lancement. Trois ou quatre suffisent. */
  suggestions: [
    'Quels sont les principaux freins à la vaccination en pharmacie identifiés dans le corpus ?',
    'Quels effets la vaccination par le pharmacien a-t-elle sur la couverture vaccinale ?',
    'Quelles barrières réglementaires reviennent d’un pays à l’autre ?',
    'Compare les méthodologies employées : quels devis d’étude et quelles tailles d’échantillon ?',
  ],
}

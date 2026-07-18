/**
 * BONUS (optionnel) — Remise à zéro AUTOMATIQUE du Chat online, côté serveur.
 * ---------------------------------------------------------------------------
 * L'app fait déjà une réinitialisation VISUELLE chaque jour (elle n'affiche que
 * les messages du jour + les épinglés). Ce script ajoute, en plus, un vrai
 * nettoyage de la base Firestore chaque nuit — pour ne pas accumuler d'anciens
 * messages. Les messages épinglés (pinned: true) sont TOUJOURS conservés.
 *
 * Pas de souci CORS ici : c'est déclenché par un planificateur serveur (Pub/Sub),
 * aucun navigateur n'est impliqué.
 *
 * PRÉREQUIS : plan Blaze (déjà actif) + Firebase CLI.
 *
 * DÉPLOIEMENT (une seule fois) :
 *   1. Dans le dossier du projet :  firebase init functions   (choisir JavaScript)
 *   2. Copier ce fichier dans  functions/index.js  (ou coller son contenu dedans)
 *   3. Dans functions/ :  npm install firebase-admin firebase-functions
 *   4. Déployer :  firebase deploy --only functions:resetChatDaily
 *
 * L'horaire est réglé à 00:00, heure de Bruxelles. Modifie "schedule" si besoin
 * (format cron : minute heure jour mois jour_semaine).
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

exports.resetChatDaily = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'Europe/Brussels' },
  async () => {
    const snap = await db.collection('chat').get();

    // On supprime tout SAUF les messages épinglés
    const refs = [];
    snap.forEach((docSnap) => {
      if (!docSnap.data().pinned) refs.push(docSnap.ref);
    });

    // Suppression par lots de 500 (limite d'un batch Firestore)
    let deleted = 0;
    for (let i = 0; i < refs.length; i += 500) {
      const batch = db.batch();
      refs.slice(i, i + 500).forEach((ref) => batch.delete(ref));
      await batch.commit();
      deleted += Math.min(500, refs.length - i);
    }

    console.log(`Chat réinitialisé : ${deleted} message(s) supprimé(s), épinglés conservés.`);
    return null;
  }
);

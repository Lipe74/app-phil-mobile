// Fichier centralisé de version — modifier UNIQUEMENT ce fichier pour changer le numéro de build affiché partout (et synchroniser le cache).
// Ne pas renommer la variable APP_VERSION (utilisée par toutes les pages et par sw.js).
// Compatible à la fois dans une page (window) et dans le service worker (self, pas de window).

(function () {
  var scope = (typeof window !== 'undefined') ? window : self;
  scope.APP_VERSION = "6.2";
})();

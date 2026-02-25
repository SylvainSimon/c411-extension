/**
 * Script pour télécharger les fichiers NFO depuis YGGTorrent
 * Ajoute un bouton de téléchargement à côté du bouton "Voir le NFO"
 */
(function() {
  'use strict';

  /**
   * Nettoie un nom de fichier en retirant les caractères interdits
   */
  function sanitizeFilename(filename) {
    // Retire les caractères interdits dans les noms de fichiers Windows/Linux
    return filename
      .replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Récupère le contenu du NFO depuis la popup
   */
  async function getNfoContent() {
    return new Promise((resolve, reject) => {
      // Trouve le bouton "Voir le NFO"
      const viewNfoButton = document.getElementById('viewNfo');
      if (!viewNfoButton) {
        reject(new Error('Bouton "Voir le NFO" non trouvé'));
        return;
      }

      let modalFound = false;
      let checkAttempts = 0;
      const maxAttempts = 50; // 5 secondes maximum (50 * 100ms)

      // Fonction pour vérifier si le contenu est chargé
      const checkForContent = () => {
        checkAttempts++;

        // Cherche la div #nfo qui contient le contenu
        const nfoDiv = document.getElementById('nfo');

        if (nfoDiv) {
          // Cherche le <pre> dans la div #nfo
          const nfoContent = nfoDiv.querySelector('pre');

          // Vérifie que le contenu existe ET n'est pas vide
          if (nfoContent && nfoContent.textContent.trim().length > 0) {
            const content = nfoContent.textContent;

            // Ferme la popup en cliquant sur le bouton avec data-dismiss="modal"
            const closeButton = document.querySelector('#nfoModal button[data-dismiss="modal"]');
            if (closeButton) {
              closeButton.click();
            }

            resolve(content);
            return;
          }
        }

        // Continue de vérifier si on n'a pas atteint le timeout
        if (checkAttempts < maxAttempts) {
          setTimeout(checkForContent, 100);
        } else {
          reject(new Error('Timeout : le contenu NFO n\'a pas été chargé'));
        }
      };

      // Simule le clic sur le bouton
      viewNfoButton.click();

      // Commence à vérifier après un court délai
      setTimeout(checkForContent, 200);
    });
  }

  /**
   * Télécharge le fichier NFO
   */
  async function downloadNfo() {
    try {
      // Récupère le titre depuis le H1
      const h1 = document.querySelector('h1');
      if (!h1) {
        alert('Impossible de trouver le titre de la page');
        return;
      }

      const title = h1.textContent.trim();
      const filename = sanitizeFilename(title) + '.nfo';

      // Désactive temporairement le bouton
      const downloadButton = document.getElementById('downloadNfo');
      if (downloadButton) {
        downloadButton.disabled = true;
        downloadButton.textContent = 'Téléchargement...';
      }

      // Récupère le contenu du NFO
      const nfoContent = await getNfoContent();

      // Crée un blob et télécharge
      const blob = new Blob([nfoContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Réactive le bouton
      if (downloadButton) {
        downloadButton.disabled = false;
        downloadButton.textContent = 'Télécharger le NFO';
      }

    } catch (error) {
      console.error('Erreur lors du téléchargement du NFO:', error);
      alert('Erreur : ' + error.message);

      // Réactive le bouton en cas d'erreur
      const downloadButton = document.getElementById('downloadNfo');
      if (downloadButton) {
        downloadButton.disabled = false;
        downloadButton.textContent = 'Télécharger le NFO';
      }
    }
  }

  /**
   * Ajoute le bouton de téléchargement
   */
  function addDownloadButton() {
    // Vérifie qu'on est sur une page de torrent
    if (!window.location.pathname.startsWith('/torrent/')) {
      return;
    }

    // Vérifie que le bouton "Voir le NFO" existe
    const viewNfoButton = document.getElementById('viewNfo');
    if (!viewNfoButton) {
      return;
    }

    // Vérifie que le bouton n'existe pas déjà
    if (document.getElementById('downloadNfo')) {
      return;
    }

    // Crée le bouton de téléchargement
    const downloadButton = document.createElement('a');
    downloadButton.id = 'downloadNfo';
    downloadButton.className = 'btn green';
    downloadButton.style.marginLeft = '10px';
    downloadButton.innerHTML = '<span class="ico_download"></span> Télécharger le NFO';
    downloadButton.href = '#';
    downloadButton.addEventListener('click', (e) => {
      e.preventDefault();
      downloadNfo();
    });

    // Insère le bouton après le bouton "Voir le NFO"
    viewNfoButton.parentNode.insertBefore(downloadButton, viewNfoButton.nextSibling);
  }

  // Initialisation au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDownloadButton);
  } else {
    addDownloadButton();
  }

  // Observe les changements de page (pour les SPA)
  const observer = new MutationObserver(() => {
    addDownloadButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();

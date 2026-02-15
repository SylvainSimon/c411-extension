/**
 * Détecteur de métadonnées TMDB sur la page
 */
const TmdbDetector = {
  /**
   * Détecte et extrait le titre TMDB depuis la page
   * @returns {string|null} Le titre TMDB normalisé ou null si non trouvé
   */
  detectTmdbTitle() {
    // Cherche le bloc contenant le lien IMDB
    const imdbLinks = document.querySelectorAll('a[href*="imdb.com"]');

    for (const link of imdbLinks) {
      // Vérifie que c'est bien le lien "Voir sur IMDB"
      if (link.textContent.includes('Voir sur IMDB')) {
        // Remonte au bloc parent qui contient les métadonnées
        const metadataBlock = link.closest('div.rounded-xl');

        if (metadataBlock) {
          // Cherche le H3 dans ce bloc
          const h3 = metadataBlock.querySelector('h3');

          if (h3) {
            // Extrait le titre (sans l'année entre parenthèses)
            const fullText = h3.childNodes[0]?.textContent?.trim();

            if (fullText) {
              return this.normalizeTitle(fullText);
            }
          }
        }
      }
    }

    return null;
  },

  /**
   * Normalise un titre pour le rendre comparable
   * Applique les mêmes règles que pour les titres de torrents
   * @param {string} title - Le titre à normaliser
   * @returns {string} Le titre normalisé
   */
  normalizeTitle(title) {
    return title
      // Supprime les espaces au début et à la fin
      .trim()
      // Remplace & par ET pour la comparaison (& peut être remplacé par Et ou And)
      // On met ET pour normaliser, peu importe si l'utilisateur a mis Et ou And
      .replace(/\s*&\s*/g, '.ET.')
      .replace(/\bAND\b/gi, 'ET')
      .replace(/\bET\b/gi, 'ET')
      // Remplace les espaces par des points
      .replace(/\s+/g, '.')
      // Supprime les accents
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      // Supprime les caractères spéciaux (sauf points, tirets et apostrophes)
      .replace(/[^\w.\-']/g, '')
      // Remplace les apostrophes par des points pour la comparaison (les deux formats sont valides)
      .replace(/'/g, '.')
      // Remplace les points multiples par un seul point (ex: "Predator..Badlands" -> "Predator.Badlands")
      .replace(/\.+/g, '.')
      // Supprime les points au début et à la fin
      .replace(/^\.+|\.+$/g, '')
      // Met en majuscules pour comparaison insensible à la casse
      .toUpperCase();
  },

  /**
   * Formate un titre pour l'affichage avec majuscule à chaque mot
   * @param {string} title - Le titre normalisé (en MAJUSCULES avec points)
   * @returns {string} Le titre formaté pour l'affichage
   */
  formatTitleForDisplay(title) {
    return title
      .split('.')
      .filter(word => word.length > 0) // Filtre les chaînes vides
      .map(word => {
        // Met la première lettre en majuscule, le reste en minuscule
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  },

  /**
   * Extrait le titre du torrent (sans année, flags, etc.)
   * @param {string} torrentTitle - Le titre complet du torrent
   * @returns {string} Le titre extrait et normalisé
   */
  extractTorrentTitle(torrentTitle) {
    const parts = torrentTitle.split('.');
    const titleParts = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const upperPart = part.toUpperCase();

      // Si c'est une année valide (4 chiffres), on s'arrête
      if (Patterns.YEAR_PATTERN.test(part)) {
        break;
      }

      // Si ça ressemble à une année mal formatée (ex: 2011L), on s'arrête
      if (/^\d{4}[A-Z]/i.test(part)) {
        break;
      }

      // Si c'est une saison/épisode (séries), on s'arrête
      if (Patterns.SEASON_PATTERN.test(part)) {
        break;
      }

      // Si c'est INTEGRALE, on regarde la partie suivante pour savoir si c'est un flag ou partie du titre
      // INTEGRALE est un flag si suivi d'une année, d'une langue, résolution ou source
      if (upperPart === 'INTEGRALE' && i < parts.length - 1) {
        const nextPart = parts[i + 1];
        const nextUpper = nextPart.toUpperCase();

        // Si suivi d'une année ou année mal formatée, c'est un flag
        if (Patterns.YEAR_PATTERN.test(nextPart) || /^\d{4}[A-Z]/i.test(nextPart)) {
          break;
        }

        // Si suivi d'une langue, résolution ou source, c'est un flag
        if (Patterns.LANGUAGES.map(l => l.toUpperCase()).includes(nextUpper) ||
            Patterns.RESOLUTIONS.map(r => r.toUpperCase()).includes(nextUpper) ||
            Patterns.SOURCES.includes(nextUpper)) {
          break;
        }
      }

      // Si c'est une langue, résolution ou source, on s'arrête
      if (Patterns.LANGUAGES.map(l => l.toUpperCase()).includes(upperPart) ||
          Patterns.RESOLUTIONS.map(r => r.toUpperCase()).includes(upperPart) ||
          Patterns.SOURCES.includes(upperPart)) {
        break;
      }

      // Si c'est un flag connu (sauf INTEGRALE qui est géré ci-dessus), on s'arrête
      if (Patterns.FLAGS.includes(upperPart) && upperPart !== 'INTEGRALE') {
        break;
      }

      // Sinon c'est probablement partie du titre
      titleParts.push(part);
    }

    // Normalise le titre extrait
    return this.normalizeTitle(titleParts.join('.'));
  },

  /**
   * Extrait le titre du torrent original (sans normalisation)
   * @param {string} torrentTitle - Le titre complet du torrent
   * @returns {string} Le titre extrait tel quel
   */
  extractTorrentTitleRaw(torrentTitle) {
    const parts = torrentTitle.split('.');
    const titleParts = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const upperPart = part.toUpperCase();

      // Si c'est une année valide (4 chiffres), on s'arrête
      if (Patterns.YEAR_PATTERN.test(part)) {
        break;
      }

      // Si ça ressemble à une année mal formatée (ex: 2011L), on s'arrête
      if (/^\d{4}[A-Z]/i.test(part)) {
        break;
      }

      // Si c'est une saison/épisode (séries), on s'arrête
      if (Patterns.SEASON_PATTERN.test(part)) {
        break;
      }

      // Si c'est INTEGRALE, on regarde la partie suivante pour savoir si c'est un flag ou partie du titre
      if (upperPart === 'INTEGRALE' && i < parts.length - 1) {
        const nextPart = parts[i + 1];
        const nextUpper = nextPart.toUpperCase();

        // Si suivi d'une année ou année mal formatée, c'est un flag
        if (Patterns.YEAR_PATTERN.test(nextPart) || /^\d{4}[A-Z]/i.test(nextPart)) {
          break;
        }

        // Si suivi d'une langue, résolution ou source, c'est un flag
        if (Patterns.LANGUAGES.map(l => l.toUpperCase()).includes(nextUpper) ||
            Patterns.RESOLUTIONS.map(r => r.toUpperCase()).includes(nextUpper) ||
            Patterns.SOURCES.includes(nextUpper)) {
          break;
        }
      }

      // Si c'est une langue, résolution ou source, on s'arrête
      if (Patterns.LANGUAGES.map(l => l.toUpperCase()).includes(upperPart) ||
          Patterns.RESOLUTIONS.map(r => r.toUpperCase()).includes(upperPart) ||
          Patterns.SOURCES.includes(upperPart)) {
        break;
      }

      // Si c'est un flag connu (sauf INTEGRALE qui est géré ci-dessus), on s'arrête
      if (Patterns.FLAGS.includes(upperPart) && upperPart !== 'INTEGRALE') {
        break;
      }

      // Sinon c'est probablement partie du titre
      titleParts.push(part);
    }

    return titleParts.join('.');
  },

  /**
   * Compare le titre du torrent avec le titre TMDB
   * @param {string} torrentTitle - Le titre complet du torrent
   * @param {string} tmdbTitle - Le titre TMDB normalisé
   * @returns {boolean} true si les titres correspondent
   */
  compareTitles(torrentTitle, tmdbTitle) {
    const extractedTitle = this.extractTorrentTitle(torrentTitle);
    return extractedTitle === tmdbTitle;
  }
};

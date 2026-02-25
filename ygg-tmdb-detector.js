/**
 * Script pour rechercher manuellement l'ID TMDB d'un film sur YGGTorrent
 * Ajoute un bouton qui recherche sur TMDB et copie l'ID dans le presse-papier
 */
(function() {
  'use strict';

  const TMDB_API_KEY = 'c0dbd736b9eea104c8b88fda4728c158';
  const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';

  /**
   * Extrait le titre et l'année depuis le nom du torrent
   * Format attendu: NOM.DU.FILM.ANNEE.reste...
   */
  function extractTitleAndYear(torrentName) {
    // Cherche un pattern avec 4 chiffres (l'année)
    const yearMatch = torrentName.match(/\b(19\d{2}|20\d{2})\b/);

    if (!yearMatch) {
      return null;
    }

    const year = yearMatch[1];
    const yearIndex = yearMatch.index;

    // Extrait tout ce qui est avant l'année
    const titlePart = torrentName.substring(0, yearIndex);

    // Remplace les points par des espaces et nettoie
    const title = titlePart
      .replace(/\./g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { title, year };
  }

  /**
   * Recherche un film sur TMDB
   */
  async function searchMovieOnTMDB(title, year) {
    try {
      const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        query: title,
        year: year,
        language: 'fr-FR'
      });

      const response = await fetch(`${TMDB_SEARCH_URL}?${params}`);

      if (!response.ok) {
        throw new Error(`Erreur API TMDB: ${response.status}`);
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // Retourne le premier résultat (meilleur match)
        return data.results[0];
      }

      return null;
    } catch (error) {
      console.error('Erreur lors de la recherche TMDB:', error);
      return null;
    }
  }

  /**
   * Affiche le résultat à côté du bouton
   */
  function showResult(message, isError = false, tmdbId = null) {
    // Supprime l'ancien résultat s'il existe
    const oldResult = document.getElementById('tmdb-result');
    if (oldResult) {
      oldResult.remove();
    }

    const tmdbButton = document.getElementById('searchTmdb');
    if (!tmdbButton) {
      return;
    }

    const resultSpan = document.createElement('span');
    resultSpan.id = 'tmdb-result';
    resultSpan.style.cssText = `
      margin-left: 10px;
      padding: 5px 10px;
      border-radius: 3px;
      font-size: 14px;
      ${isError ? 'color: #dc3545; background: #f8d7da;' : 'color: #28a745; background: #d4edda;'}
    `;
    resultSpan.textContent = message;

    // Si on a un ID TMDB, ajoute un lien
    if (tmdbId) {
      const link = document.createElement('a');
      link.href = `https://www.themoviedb.org/movie/${tmdbId}`;
      link.target = '_blank';
      link.style.cssText = 'color: #007bff; margin-left: 5px; text-decoration: underline;';
      link.textContent = 'Voir sur TMDB';
      resultSpan.appendChild(document.createTextNode(' '));
      resultSpan.appendChild(link);
    }

    tmdbButton.parentNode.insertBefore(resultSpan, tmdbButton.nextSibling);
  }

  /**
   * Recherche TMDB et copie l'ID
   */
  async function searchTMDB() {
    const tmdbButton = document.getElementById('searchTmdb');
    if (!tmdbButton) {
      return;
    }

    // Désactive le bouton
    tmdbButton.disabled = true;
    tmdbButton.textContent = 'Recherche...';

    try {
      // Récupère le titre depuis le H1
      const h1 = document.querySelector('h1');
      if (!h1) {
        showResult('❌ Impossible de trouver le titre', true);
        return;
      }

      const torrentName = h1.textContent.trim();

      // Extrait le titre et l'année
      const extracted = extractTitleAndYear(torrentName);

      if (!extracted) {
        showResult('❌ Impossible d\'extraire le titre et l\'année', true);
        return;
      }

      // Recherche sur TMDB
      const movieData = await searchMovieOnTMDB(extracted.title, extracted.year);

      if (movieData) {
        // Copie l'ID dans le presse-papier
        await navigator.clipboard.writeText(movieData.id.toString());

        showResult(`✅ ID: ${movieData.id} (copié!)`, false, movieData.id);
      } else {
        showResult(`❌ Aucun résultat pour "${extracted.title}" (${extracted.year})`, true);
      }

    } catch (error) {
      console.error('Erreur:', error);
      showResult(`❌ Erreur: ${error.message}`, true);
    } finally {
      // Réactive le bouton
      tmdbButton.disabled = false;
      tmdbButton.innerHTML = '<span class="ico_search"></span> Rechercher TMDB';
    }
  }

  /**
   * Ajoute le bouton de recherche TMDB
   */
  function addTMDBButton() {
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
    if (document.getElementById('searchTmdb')) {
      return;
    }

    // Crée le bouton de recherche TMDB
    const tmdbButton = document.createElement('a');
    tmdbButton.id = 'searchTmdb';
    tmdbButton.className = 'btn blue';
    tmdbButton.style.marginLeft = '10px';
    tmdbButton.innerHTML = '<span class="ico_search"></span> Rechercher TMDB';
    tmdbButton.href = '#';
    tmdbButton.addEventListener('click', (e) => {
      e.preventDefault();
      searchTMDB();
    });

    // Insère le bouton après le bouton "Télécharger le NFO" (ou "Voir le NFO" s'il n'existe pas)
    const downloadNfoButton = document.getElementById('downloadNfo');
    const insertAfter = downloadNfoButton || viewNfoButton;
    insertAfter.parentNode.insertBefore(tmdbButton, insertAfter.nextSibling);
  }

  // Initialisation au chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addTMDBButton);
  } else {
    addTMDBButton();
  }

  // Observe les changements de page (pour les SPA)
  const observer = new MutationObserver(() => {
    addTMDBButton();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();

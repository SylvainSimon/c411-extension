/**
 * Script pour générer automatiquement le BBCode d'un film depuis YGGTorrent
 * Recherche sur TMDB, récupère toutes les données et génère le BBCode complet
 */
(function() {
  'use strict';

  const TMDB_API_KEY = 'c0dbd736b9eea104c8b88fda4728c158';
  const TMDB_API_BASE = 'https://api.themoviedb.org/3';
  const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

  // Cache pour le template
  let BBCODE_TEMPLATE = null;

  /**
   * Charge le template BBCode depuis le fichier presentation.txt
   */
  async function loadTemplate() {
    if (BBCODE_TEMPLATE) {
      return BBCODE_TEMPLATE;
    }

    try {
      const url = chrome.runtime.getURL('presentation.txt');
      const response = await fetch(url);
      BBCODE_TEMPLATE = await response.text();
      return BBCODE_TEMPLATE;
    } catch (error) {
      console.error('Erreur lors du chargement du template:', error);
      throw new Error('Impossible de charger le template BBCode');
    }
  }

  /**
   * Extrait le titre et l'année depuis le nom du torrent
   */
  function extractTitleAndYear(torrentName) {
    const yearMatch = torrentName.match(/\b(19\d{2}|20\d{2})\b/);
    if (!yearMatch) return null;

    const year = yearMatch[1];
    const yearIndex = yearMatch.index;
    const titlePart = torrentName.substring(0, yearIndex);
    const title = titlePart.replace(/\./g, ' ').replace(/\s+/g, ' ').trim();

    return { title, year };
  }

  /**
   * Recherche un film sur TMDB
   */
  async function searchMovie(title, year) {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      query: title,
      year: year,
      language: 'fr-FR'
    });

    const response = await fetch(`${TMDB_API_BASE}/search/movie?${params}`);
    if (!response.ok) throw new Error(`Erreur API TMDB: ${response.status}`);

    const data = await response.json();
    return data.results?.[0] || null;
  }

  /**
   * Récupère les détails complets d'un film
   */
  async function getMovieDetails(movieId) {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: 'fr-FR',
      append_to_response: 'credits'
    });

    const response = await fetch(`${TMDB_API_BASE}/movie/${movieId}?${params}`);
    if (!response.ok) throw new Error(`Erreur API TMDB: ${response.status}`);

    return await response.json();
  }

  /**
   * Formate la durée en heures et minutes
   */
  function formatRuntime(minutes) {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Formate une date au format français (comme dans TmdbService.php)
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
      const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
      ];

      const date = new Date(dateString);
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateString;
    }
  }

  /**
   * Traduit le nom d'un pays en français (comme dans TmdbService.php)
   */
  function translateCountry(country) {
    const translations = {
      'United States of America': 'États-Unis',
      'United Kingdom': 'Royaume-Uni',
      'France': 'France',
      'Germany': 'Allemagne',
      'Spain': 'Espagne',
      'Italy': 'Italie',
      'Japan': 'Japon',
      'China': 'Chine',
      'South Korea': 'Corée du Sud',
      'Canada': 'Canada',
      'Australia': 'Australie',
      'Brazil': 'Brésil',
      'Mexico': 'Mexique',
      'India': 'Inde',
      'Russia': 'Russie',
      'Belgium': 'Belgique',
      'Netherlands': 'Pays-Bas',
      'Switzerland': 'Suisse',
      'Austria': 'Autriche',
      'Sweden': 'Suède',
      'Norway': 'Norvège',
      'Denmark': 'Danemark',
      'Poland': 'Pologne',
      'Ireland': 'Irlande',
      'New Zealand': 'Nouvelle-Zélande'
    };

    return translations[country] || country;
  }

  /**
   * Génère l'URL du badge de notation (comme dans TmdbService.php)
   */
  function generateRatingBadge(rating) {
    if (!rating) return '';

    // Déterminer la couleur en fonction de la note
    let color = 'red';
    if (rating >= 7) {
      color = 'brightgreen';
    } else if (rating >= 5) {
      color = 'yellow';
    } else if (rating >= 3) {
      color = 'orange';
    }

    const label = encodeURIComponent('Note');
    const value = encodeURIComponent(rating.toFixed(1) + '/10');

    return `https://img.shields.io/badge/${label}-${value}-${color}?style=for-the-badge&logo=star&logoColor=white`;
  }

  /**
   * Génère le BBCode à partir des données TMDB (comme dans BbCodeGeneratorService.php)
   */
  async function generateBBCode(movieData) {
    const credits = movieData.credits || {};

    // Charge le template
    const template = await loadTemplate();

    // Extraction des réalisateurs
    const directors = (credits.crew || [])
      .filter(person => person.job === 'Director')
      .map(person => person.name);

    // Extraction des acteurs (limite à 6 comme dans TmdbService.php)
    const actors = (credits.cast || [])
      .slice(0, 6)
      .map(person => person.name);

    // Extraction des photos d'acteurs (limite à 4, taille w138_and_h175_face)
    const actorsPhotos = (credits.cast || [])
      .slice(0, 4)
      .filter(person => person.profile_path)
      .map(person => `https://image.tmdb.org/t/p/w138_and_h175_face${person.profile_path}`);

    // Extraction et traduction des pays
    const countries = (movieData.production_countries || [])
      .map(country => translateCountry(country.name));

    // Extraction des genres
    const genres = (movieData.genres || [])
      .map(genre => genre.name);

    // URL du poster
    const posterUrl = movieData.poster_path
      ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}`
      : '';

    // Badge de notation
    const rating = movieData.vote_average || 0;
    const ratingBadge = rating > 0 ? generateRatingBadge(rating) : '';

    // Date de sortie formatée
    const releaseDate = formatDate(movieData.release_date);

    // Remplacement dans le template
    const replacements = {
      '{{POSTER_URL}}': posterUrl,
      '{{ORIGINAL_TITLE}}': movieData.original_title || 'N/A',
      '{{COUNTRIES}}': countries.join(', ') || 'N/A',
      '{{RELEASE_DATE}}': releaseDate,
      '{{RUNTIME}}': formatRuntime(movieData.runtime),
      '{{RATING_BADGE}}': ratingBadge,
      '{{DIRECTORS}}': directors.join(', ') || 'N/A',
      '{{CAST}}': actors.join(', ') || 'N/A',
      '{{GENRES}}': genres.join(', ') || 'N/A',
      '{{OVERVIEW}}': movieData.overview || 'Aucun synopsis disponible.',
      '{{ACTORS_PHOTOS}}': actorsPhotos.map(url => `[img]${url}[/img]`).join(' ')
    };

    let bbcode = template;
    for (const [key, value] of Object.entries(replacements)) {
      bbcode = bbcode.replace(new RegExp(key, 'g'), value);
    }

    return bbcode;
  }

  /**
   * Affiche le résultat à côté du bouton
   */
  function showResult(message, isError = false) {
    const oldResult = document.getElementById('bbcode-result');
    if (oldResult) oldResult.remove();

    const bbcodeButton = document.getElementById('generateBbcode');
    if (!bbcodeButton) return;

    const resultSpan = document.createElement('span');
    resultSpan.id = 'bbcode-result';
    resultSpan.style.cssText = `
      margin-left: 10px;
      padding: 5px 10px;
      border-radius: 3px;
      font-size: 14px;
      ${isError ? 'color: #dc3545; background: #f8d7da;' : 'color: #28a745; background: #d4edda;'}
    `;
    resultSpan.textContent = message;

    bbcodeButton.parentNode.insertBefore(resultSpan, bbcodeButton.nextSibling);
  }

  /**
   * Fonction principale : génère le BBCode
   */
  async function generateBBCodeFromPage() {
    const bbcodeButton = document.getElementById('generateBbcode');
    if (!bbcodeButton) return;

    bbcodeButton.disabled = true;
    bbcodeButton.textContent = 'Génération...';

    try {
      const h1 = document.querySelector('h1');
      if (!h1) {
        showResult('❌ Impossible de trouver le titre', true);
        return;
      }

      const torrentName = h1.textContent.trim();
      const extracted = extractTitleAndYear(torrentName);

      if (!extracted) {
        showResult('❌ Impossible d\'extraire le titre et l\'année', true);
        return;
      }

      // Recherche le film
      const searchResult = await searchMovie(extracted.title, extracted.year);
      if (!searchResult) {
        showResult(`❌ Film non trouvé sur TMDB`, true);
        return;
      }

      // Récupère les détails complets
      const movieDetails = await getMovieDetails(searchResult.id);

      // Génère le BBCode
      const bbcode = await generateBBCode(movieDetails);

      // Copie dans le presse-papier
      await navigator.clipboard.writeText(bbcode);

      showResult('✅ BBCode copié dans le presse-papier!', false);

    } catch (error) {
      console.error('Erreur:', error);
      showResult(`❌ Erreur: ${error.message}`, true);
    } finally {
      bbcodeButton.disabled = false;
      bbcodeButton.innerHTML = '<span class="ico_file-text"></span> Générer BBCode';
    }
  }

  /**
   * Ajoute le bouton de génération BBCode
   */
  function addBBCodeButton() {
    if (!window.location.pathname.startsWith('/torrent/')) return;

    const viewNfoButton = document.getElementById('viewNfo');
    if (!viewNfoButton) return;

    if (document.getElementById('generateBbcode')) return;

    const bbcodeButton = document.createElement('a');
    bbcodeButton.id = 'generateBbcode';
    bbcodeButton.className = 'btn orange';
    bbcodeButton.style.marginLeft = '10px';
    bbcodeButton.innerHTML = '<span class="ico_file-text"></span> Générer BBCode';
    bbcodeButton.href = '#';
    bbcodeButton.addEventListener('click', (e) => {
      e.preventDefault();
      generateBBCodeFromPage();
    });

    // Insère après le bouton de recherche TMDB (ou après "Télécharger le NFO")
    const tmdbButton = document.getElementById('searchTmdb');
    const downloadNfoButton = document.getElementById('downloadNfo');
    const insertAfter = tmdbButton || downloadNfoButton || viewNfoButton;
    insertAfter.parentNode.insertBefore(bbcodeButton, insertAfter.nextSibling);
  }

  // Initialisation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addBBCodeButton);
  } else {
    addBBCodeButton();
  }

  // Observer pour SPA
  const observer = new MutationObserver(addBBCodeButton);
  observer.observe(document.body, { childList: true, subtree: true });

})();

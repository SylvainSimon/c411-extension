/**
 * Script pour générer automatiquement le BBCode d'un film depuis C411 upload
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
   * Recherche un film sur TMDB - retourne tous les résultats
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
    return data.results || [];
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
   * Formate une date au format français
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
   * Traduit le nom d'un pays en français
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
   * Génère l'URL du badge de notation
   */
  function generateRatingBadge(rating) {
    if (!rating) return '';

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
   * Génère le BBCode à partir des données TMDB
   */
  async function generateBBCode(movieData) {
    const credits = movieData.credits || {};
    const template = await loadTemplate();

    // Extraction des réalisateurs
    const directors = (credits.crew || [])
      .filter(person => person.job === 'Director')
      .map(person => person.name);

    // Extraction des acteurs (limite à 6)
    const actors = (credits.cast || [])
      .slice(0, 6)
      .map(person => person.name);

    // Extraction des photos d'acteurs (limite à 4)
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
    const oldResult = document.getElementById('c411-bbcode-result');
    if (oldResult) oldResult.remove();

    const bbcodeButton = document.getElementById('c411-generateBbcode');
    if (!bbcodeButton) return;

    const resultSpan = document.createElement('span');
    resultSpan.id = 'c411-bbcode-result';
    resultSpan.className = 'ml-2 px-3 py-1.5 rounded-md text-sm';
    resultSpan.style.cssText = isError
      ? 'color: #dc2626; background: #fee2e2;'
      : 'color: #16a34a; background: #dcfce7;';
    resultSpan.textContent = message;

    bbcodeButton.parentNode.insertBefore(resultSpan, bbcodeButton.nextSibling);

    // Supprime automatiquement après 5 secondes
    setTimeout(() => resultSpan.remove(), 5000);
  }

  /**
   * Affiche une liste de sélection de films
   */
  function showMovieSelection(movies, onSelect, onCancel) {
    // Supprime une éventuelle sélection précédente
    const oldSelection = document.getElementById('c411-movie-selection');
    if (oldSelection) oldSelection.remove();

    const bbcodeButton = document.getElementById('c411-generateBbcode');
    if (!bbcodeButton) return;

    // Crée le conteneur de sélection
    const selectionDiv = document.createElement('div');
    selectionDiv.id = 'c411-movie-selection';
    selectionDiv.className = 'mt-4 p-4 bg-white dark:bg-emerald-950/40 rounded-lg border-2 border-emerald-600 dark:border-emerald-500 shadow-lg';

    // Titre
    const title = document.createElement('h3');
    title.className = 'text-sm font-semibold mb-3 text-emerald-900 dark:text-emerald-100';
    title.textContent = `${movies.length} film${movies.length > 1 ? 's' : ''} trouvé${movies.length > 1 ? 's' : ''} - Sélectionnez le bon :`;
    selectionDiv.appendChild(title);

    // Liste des films
    const movieList = document.createElement('div');
    movieList.className = 'space-y-2 max-h-96 overflow-y-auto';

    movies.forEach((movie, index) => {
      const movieItem = document.createElement('button');
      movieItem.type = 'button';
      movieItem.className = 'w-full text-left p-3 rounded-md bg-slate-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 border border-slate-200 dark:border-emerald-800 transition-colors';

      const posterUrl = movie.poster_path
        ? `${TMDB_IMAGE_BASE}/w92${movie.poster_path}`
        : '';

      const releaseYear = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';

      movieItem.innerHTML = `
        <div class="flex items-start gap-3">
          ${posterUrl ? `<img src="${posterUrl}" alt="${movie.title}" class="w-12 h-18 object-cover rounded shadow" />` : '<div class="w-12 h-18 bg-slate-200 dark:bg-emerald-900 rounded flex items-center justify-center text-xs">🎬</div>'}
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm text-slate-900 dark:text-slate-100">
              ${movie.title}
            </div>
            <div class="text-xs text-slate-600 dark:text-slate-400 mt-1">
              ${movie.original_title !== movie.title ? `(${movie.original_title}) • ` : ''}${releaseYear}
            </div>
            ${movie.overview ? `<div class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${movie.overview.substring(0, 120)}${movie.overview.length > 120 ? '...' : ''}</div>` : ''}
          </div>
        </div>
      `;

      movieItem.addEventListener('click', () => {
        selectionDiv.remove();
        onSelect(movie);
      });

      movieList.appendChild(movieItem);
    });

    selectionDiv.appendChild(movieList);

    // Bouton d'annulation
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'mt-3 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-emerald-900/30 rounded transition-colors';
    cancelButton.textContent = '✕ Annuler';
    cancelButton.addEventListener('click', () => {
      selectionDiv.remove();
      if (onCancel) onCancel();
    });
    selectionDiv.appendChild(cancelButton);

    // Insère après le bouton BBCode
    bbcodeButton.parentNode.insertBefore(selectionDiv, bbcodeButton.nextSibling);
  }

  /**
   * Génère le BBCode pour un film sélectionné
   */
  async function generateBBCodeForMovie(movie) {
    const bbcodeButton = document.getElementById('c411-generateBbcode');
    if (!bbcodeButton) return;

    const originalText = bbcodeButton.textContent;
    bbcodeButton.disabled = true;
    bbcodeButton.textContent = '⏳ Génération du BBCode...';

    try {
      // Récupère les détails complets
      const movieDetails = await getMovieDetails(movie.id);

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
      bbcodeButton.textContent = originalText;
    }
  }

  /**
   * Fonction principale : génère le BBCode
   */
  async function generateBBCodeFromPage() {
    const bbcodeButton = document.getElementById('c411-generateBbcode');
    if (!bbcodeButton) return;

    const originalText = bbcodeButton.textContent;
    bbcodeButton.disabled = true;
    bbcodeButton.textContent = '⏳ Recherche...';

    try {
      // Trouve l'input avec le nom de release
      const releaseInput = document.querySelector('input[placeholder*="Ocean\'s.Eleven"]');
      if (!releaseInput) {
        showResult('❌ Impossible de trouver l\'input', true);
        return;
      }

      const torrentName = releaseInput.value.trim();
      if (!torrentName) {
        showResult('❌ Le nom de release est vide', true);
        return;
      }

      const extracted = extractTitleAndYear(torrentName);
      if (!extracted) {
        showResult('❌ Impossible d\'extraire le titre et l\'année', true);
        return;
      }

      // Recherche les films
      const searchResults = await searchMovie(extracted.title, extracted.year);
      if (!searchResults || searchResults.length === 0) {
        showResult(`❌ Film non trouvé sur TMDB`, true);
        return;
      }

      // Si un seul résultat, on génère directement
      if (searchResults.length === 1) {
        await generateBBCodeForMovie(searchResults[0]);
        return;
      }

      // Sinon, on affiche la liste de sélection (limite à 10 résultats)
      const moviesToShow = searchResults.slice(0, 10);
      showMovieSelection(
        moviesToShow,
        (selectedMovie) => {
          generateBBCodeForMovie(selectedMovie);
        },
        () => {
          bbcodeButton.disabled = false;
          bbcodeButton.textContent = originalText;
        }
      );

      // Réactive le bouton pour permettre une nouvelle recherche
      bbcodeButton.disabled = false;
      bbcodeButton.textContent = originalText;

    } catch (error) {
      console.error('Erreur:', error);
      showResult(`❌ Erreur: ${error.message}`, true);
      bbcodeButton.disabled = false;
      bbcodeButton.textContent = originalText;
    }
  }

  /**
   * Ajoute le bouton de génération BBCode
   */
  function addBBCodeButton() {
    if (!window.location.pathname.startsWith('/upload')) return;

    if (document.getElementById('c411-generateBbcode')) return;

    // Trouve la section avec le label "Nom de release"
    const label = Array.from(document.querySelectorAll('label')).find(
      el => el.textContent.includes('Nom de release')
    );

    if (!label) return;

    // Trouve le wrapper de l'input
    const section = label.closest('section');
    if (!section) return;

    // Vérifie que l'input existe
    const releaseInput = section.querySelector('input');
    if (!releaseInput) return;

    // Crée le bouton
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'mt-3';
    buttonContainer.innerHTML = `
      <button
        id="c411-generateBbcode"
        type="button"
        class="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors"
      >
        🎬 Générer BBCode depuis TMDB
      </button>
    `;

    // Insère le bouton après la section de validation
    const validationDiv = section.querySelector('.mt-2.space-y-1');
    if (validationDiv) {
      validationDiv.parentNode.insertBefore(buttonContainer, validationDiv.nextSibling);
    } else {
      section.appendChild(buttonContainer);
    }

    // Ajoute l'événement
    const bbcodeButton = document.getElementById('c411-generateBbcode');
    if (bbcodeButton) {
      bbcodeButton.addEventListener('click', (e) => {
        e.preventDefault();
        generateBBCodeFromPage();
      });
    }
  }

  // Initialisation
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addBBCodeButton);
  } else {
    addBBCodeButton();
  }

  // Observer pour réagir aux changements de page (SPA)
  const observer = new MutationObserver(() => {
    addBBCodeButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });

})();

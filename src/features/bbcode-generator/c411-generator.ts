import { TmdbApiClient } from '../../core/api/tmdb-client';
import { TemplateEngine } from '../../core/utils/template-engine';

// Importation des templates (Vite ?raw)
import generateButtonTemplate from '../../templates/bbcode-generator/generate-button.twig?raw';
import presentationTemplate from '../../templates/bbcode-generator/presentation.twig?raw';
import movieSelectorTemplate from '../../templates/bbcode-generator/movie-selector.twig?raw';

/**
 * Extrait le titre et l'année depuis le nom du torrent
 */
function extractTitleAndYear(torrentName: string) {
  const yearMatch = torrentName.match(/\b(19\d{2}|20\d{2})\b/);
  if (!yearMatch) return null;
  const year = yearMatch[1];
  const title = torrentName.substring(0, yearMatch.index).replace(/\./g, ' ').trim();
  return { title, year };
}

/**
 * Génère et copie le BBCode pour un ID de film donné
 */
async function processMovieSelection(movieId: number) {
  try {
    showResult('⏳ Génération...');
    const details = await TmdbApiClient.getMovieDetails(movieId);
    
    const directors = details.credits?.crew.filter(p => p.job === 'Director').map(p => p.name) || [];
    const actors = details.credits?.cast.slice(0, 6).map(p => p.name) || [];
    const photos = details.credits?.cast.slice(0, 4).filter(p => p.profile_path).map(p => 
      `[img]https://image.tmdb.org/t/p/w138_and_h175_face${p.profile_path}[/img]`
    ) || [];

    const templateData = {
      POSTER_URL: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '',
      ORIGINAL_TITLE: details.original_title,
      COUNTRIES: details.production_countries?.map(c => c.name).join(', ') || 'N/A',
      RELEASE_DATE: details.release_date,
      RUNTIME: details.runtime ? `${Math.floor(details.runtime/60)}h${(details.runtime%60).toString().padStart(2, '0')}` : 'N/A',
      RATING_BADGE: `https://img.shields.io/badge/Note-${details.vote_average.toFixed(1)}/10-brightgreen?style=for-the-badge&logo=star`,
      DIRECTORS: directors.join(', '),
      CAST: actors.join(', '),
      GENRES: details.genres?.map(g => g.name).join(', ') || 'N/A',
      OVERVIEW: details.overview,
      ACTORS_PHOTOS: photos.join(' ')
    };
    
    const bbcode = TemplateEngine.render(presentationTemplate, templateData);
    await navigator.clipboard.writeText(bbcode);
    
    document.getElementById('c411-movie-selector')?.remove();
    showResult('✅ BBCode copié !');
  } catch (error: any) {
    console.error('[BBCodeGenerator] Erreur:', error);
    showResult(`❌ ${error.message || 'Erreur'}`, true);
  }
}

/**
 * Affiche un message de feedback
 */
function showResult(msg: string, isError = false) {
  document.getElementById('c411-bbcode-result')?.remove();
  const btn = document.getElementById('c411-generateBbcode');
  if (!btn) return;
  
  const span = document.createElement('span');
  span.id = 'c411-bbcode-result';
  span.style.cssText = `margin-left: 10px; font-size: 12px; color: ${isError ? '#ef4444' : '#10b981'}`;
  span.textContent = msg;
  btn.parentNode?.insertBefore(span, btn.nextSibling);
  if (!msg.includes('⏳')) {
    setTimeout(() => span.remove(), 5000);
  }
}

/**
 * Injecte le bouton et gère le clic
 */
async function addBBCodeButton() {
  if (!window.location.pathname.startsWith('/upload') || document.getElementById('c411-generateBbcode')) return;
  
  const label = Array.from(document.querySelectorAll('label')).find(el => el.textContent?.includes('Nom de release'));
  const section = label?.closest('section');
  if (!section) return;

  const btnHtml = TemplateEngine.render(generateButtonTemplate, {});
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = btnHtml;
  const container = tempDiv.firstElementChild!;
  section.appendChild(container);

  document.getElementById('c411-generateBbcode')?.addEventListener('click', async () => {
    const input = section.querySelector('input');
    const extracted = extractTitleAndYear(input?.value || '');
    if (!extracted) return showResult('❌ Titre non reconnu', true);
    
    try {
      showResult('⏳ Recherche...');
      const results = await TmdbApiClient.searchMovie(extracted.title, extracted.year);
      
      if (results.length === 0) {
        return showResult('❌ Film non trouvé', true);
      }
      
      if (results.length === 1) {
        await processMovieSelection(results[0].id);
      } else {
        // Plusieurs résultats : afficher le sélecteur
        document.getElementById('c411-movie-selector')?.remove();
        const selectorHtml = TemplateEngine.render(movieSelectorTemplate, { results });
        const selectorDiv = document.createElement('div');
        selectorDiv.innerHTML = selectorHtml;
        container.appendChild(selectorDiv.firstElementChild!);
        showResult('🔍 Choisissez le film');

        // Gérer le clic sur un choix
        document.querySelectorAll('.c411-movie-choice').forEach(el => {
          el.addEventListener('click', () => {
            const id = parseInt((el as HTMLElement).dataset.id!, 10);
            processMovieSelection(id);
          });
        });

        // Gérer le bouton fermer
        document.getElementById('c411-cancel-selection')?.addEventListener('click', () => {
          document.getElementById('c411-movie-selector')?.remove();
          showResult('');
        });
      }
    } catch (error: any) {
      showResult(`❌ ${error.message}`, true);
    }
  });
}

export function initializeBBCodeGenerator() {
  addBBCodeButton();
  new MutationObserver(() => addBBCodeButton()).observe(document.body, { childList: true, subtree: true });
}

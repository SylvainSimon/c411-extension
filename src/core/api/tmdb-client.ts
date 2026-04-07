import { Config } from '../config/config';
import { Movie } from '../../types/tmdb';

const TMDB_API_BASE = 'https://api.themoviedb.org/3';

export const TmdbApiClient = {
  /**
   * Appel générique à l'API TMDB
   */
  async call<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const apiKey = await Config.get('tmdbApiKey');
    
    if (!apiKey) {
      throw new Error('Clé API TMDB manquante. Veuillez la renseigner dans les options.');
    }

    const queryParams = new URLSearchParams({
      api_key: apiKey,
      ...params
    });

    const response = await fetch(`${TMDB_API_BASE}${endpoint}?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Erreur API TMDB: ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Recherche un film par titre et année
   */
  async searchMovie(title: string, year: string): Promise<Movie[]> {
    const data = await this.call<{ results: Movie[] }>('/search/movie', {
      query: title,
      year: year,
      language: 'fr-FR'
    });
    return data.results || [];
  },

  /**
   * Récupère les détails complets d'un film (avec crédits)
   */
  async getMovieDetails(movieId: number): Promise<Movie> {
    return await this.call<Movie>(`/movie/${movieId}`, {
      language: 'fr-FR',
      append_to_response: 'credits'
    });
  }
};

export interface Movie {
  id: number;
  title: string;
  original_title: string;
  release_date: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  runtime?: number;
  genres?: { name: string }[];
  production_countries?: { name: string }[];
  credits?: {
    cast: { name: string; profile_path: string | null }[];
    crew: { name: string; job: string }[];
  };
}

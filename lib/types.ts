export type SortField = "name" | "rating" | "release_year";
export type SortDirection = "asc" | "desc";

export interface GameRecord {
  playnite_game_id: string;
  game_title: string;
  user_score: number;
  release_year: number | null;
  completion_status: string;
  cover_url: string | null;
  favorite: boolean;
  playtime_seconds: number;
}

export interface GamesResponse {
  games: GameRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface StatsResponse {
  totalGames: number;
  ratedGames: number;
  averageRating: number;
  completionCounts: Array<{ status: string; count: number }>;
}

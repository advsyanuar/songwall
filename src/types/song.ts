export type SongId = number;

export type Song = {
  id: SongId;
  title: string;
  album?: string;
  artist: string;
  album_image_link?: string;
  lyrics_url?: string;
  created_at?: string;
  order?: number;
};

export type NewSong = Omit<Song, "id">;

export type UpdateSongPayload = {
  id: SongId;
  updates: Partial<Omit<Song, "id">>;
};

export type GeniusSongHit = {
  id: number;
  title: string;
  artist: string;
  album?: string;
  album_image_link?: string;
  lyrics_url: string;
};

export type SessionSong = {
  title: string;
  artist: string;
  album?: string;
  album_image_link?: string;
  lyrics_url?: string;
  order: number;
};

export type SessionHistory = {
  id: SongId;
  date: string;
  savedAt: string;
  songs: SessionSong[];
};

import { useMutation, useQuery } from "@tanstack/react-query";
import { createClient } from "../lib/supabase/client";
import type { GeniusSongHit } from "../types/song";

const GENIUS_API_PROXY = "/api/genius";
const supabase = createClient();

type GeniusApiSong = {
  id: number;
  title: string;
  url: string;
  song_art_image_thumbnail_url?: string;
  header_image_thumbnail_url?: string;
  primary_artist?: { name?: string };
  album?: { name?: string } | null;
};

function mapGeniusSong(song: GeniusApiSong): GeniusSongHit {
  return {
    id: song.id,
    title: song.title,
    artist: song.primary_artist?.name ?? "",
    album: song.album?.name ?? undefined,
    album_image_link:
      song.song_art_image_thumbnail_url ??
      song.header_image_thumbnail_url ??
      undefined,
    lyrics_url: song.url,
  };
}

function getDevToken(): string | undefined {
  return import.meta.env.DEV
    ? import.meta.env.VITE_GENIUS_ACCESS_TOKEN
    : undefined;
}

export async function searchGeniusSongs(query: string): Promise<GeniusSongHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const devToken = getDevToken();
  if (devToken) {
    const res = await fetch(
      `${GENIUS_API_PROXY}/search?q=${encodeURIComponent(trimmed)}`,
      { headers: { Authorization: `Bearer ${devToken}` } }
    );

    if (!res.ok) {
      throw new Error(`Genius search failed (${res.status} ${res.statusText})`);
    }

    const json = (await res.json()) as {
      response?: { hits?: Array<{ type: string; result: GeniusApiSong }> };
    };

    return (json.response?.hits ?? [])
      .filter((hit) => hit.type === "song")
      .map((hit) => mapGeniusSong(hit.result));
  }

  const { data, error } = await supabase.functions.invoke<{
    hits?: GeniusSongHit[];
    error?: string;
  }>("genius", {
    body: { action: "search", query: trimmed },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.hits ?? [];
}

export async function fetchGeniusSongDetails(
  id: number
): Promise<GeniusSongHit> {
  const devToken = getDevToken();
  if (devToken) {
    const res = await fetch(
      `${GENIUS_API_PROXY}/songs/${encodeURIComponent(String(id))}`,
      { headers: { Authorization: `Bearer ${devToken}` } }
    );

    if (!res.ok) {
      throw new Error(
        `Genius song lookup failed (${res.status} ${res.statusText})`
      );
    }

    const json = (await res.json()) as {
      response?: { song?: GeniusApiSong };
    };
    const song = json.response?.song;
    if (!song) {
      throw new Error("Song details not found");
    }
    return mapGeniusSong(song);
  }

  const { data, error } = await supabase.functions.invoke<{
    song?: GeniusSongHit;
    error?: string;
  }>("genius", {
    body: { action: "song", id },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.song) throw new Error("Song details not found");
  return data.song;
}

export async function lookupGeniusSong(
  title: string,
  artist: string
): Promise<GeniusSongHit | null> {
  const query = `${title} ${artist}`.trim();
  if (!query) return null;

  const hits = await searchGeniusSongs(query);
  const firstHit = hits[0];
  if (!firstHit) return null;

  try {
    return await fetchGeniusSongDetails(firstHit.id);
  } catch {
    return firstHit;
  }
}

export const useGeniusSearch = (query: string) => {
  const trimmedQuery = query.trim();

  const searchQuery = useQuery({
    queryKey: ["genius-search", trimmedQuery],
    enabled: trimmedQuery.length >= 2,
    staleTime: 1000 * 60 * 5,
    queryFn: () => searchGeniusSongs(trimmedQuery),
  });

  const songDetailsMutation = useMutation({
    mutationFn: fetchGeniusSongDetails,
  });

  return {
    hits: searchQuery.data ?? [],
    isSearching: searchQuery.isFetching,
    searchError: searchQuery.error,
    fetchSongDetails: songDetailsMutation.mutateAsync,
    isFetchingDetails: songDetailsMutation.isPending,
  };
};

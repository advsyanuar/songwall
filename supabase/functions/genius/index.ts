// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const GENIUS_API_BASE = "https://api.genius.com";

type GeniusArtist = {
  name?: string;
};

type GeniusAlbum = {
  name?: string;
};

type GeniusSongResult = {
  id: number;
  title: string;
  url: string;
  song_art_image_thumbnail_url?: string;
  header_image_thumbnail_url?: string;
  primary_artist?: GeniusArtist;
  album?: GeniusAlbum | null;
};

type GeniusSearchHit = {
  type: string;
  result: GeniusSongResult;
};

function mapGeniusSong(song: GeniusSongResult) {
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

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req) => {
    const accessToken = Deno.env.get("GENIUS_ACCESS_TOKEN");
    if (!accessToken) {
      return Response.json(
        { error: "GENIUS_ACCESS_TOKEN secret is not configured" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      action?: "search" | "song";
      query?: string;
      id?: number;
    };

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    if (body.action === "song" && body.id) {
      const res = await fetch(
        `${GENIUS_API_BASE}/songs/${encodeURIComponent(String(body.id))}`,
        { headers }
      );
      if (!res.ok) {
        return Response.json(
          { error: `Genius API error (${res.status})` },
          { status: res.status }
        );
      }
      const json = (await res.json()) as {
        response?: { song?: GeniusSongResult };
      };
      const song = json.response?.song;
      if (!song) {
        return Response.json({ error: "Song not found" }, { status: 404 });
      }
      return Response.json({ song: mapGeniusSong(song) });
    }

    const query = body.query?.trim();
    if (!query) {
      return Response.json({ hits: [] });
    }

    const res = await fetch(
      `${GENIUS_API_BASE}/search?q=${encodeURIComponent(query)}`,
      { headers }
    );
    if (!res.ok) {
      return Response.json(
        { error: `Genius API error (${res.status})` },
        { status: res.status }
      );
    }

    const json = (await res.json()) as {
      response?: { hits?: GeniusSearchHit[] };
    };
    const hits = (json.response?.hits ?? [])
      .filter((hit) => hit.type === "song")
      .map((hit) => mapGeniusSong(hit.result));

    return Response.json({ hits });
  }),
};

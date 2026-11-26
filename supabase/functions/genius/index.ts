// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const GENIUS_API_BASE = "https://api.genius.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

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

const handler = withSupabase(
  { auth: ["publishable", "secret"] },
  async (req) => {
    const denoEnv = (
      globalThis as {
        Deno?: { env?: { get(key: string): string | undefined } };
      }
    ).Deno?.env;
    const accessToken = denoEnv?.get("GENIUS_ACCESS_TOKEN");
    if (!accessToken) {
      return jsonResponse(
        { error: "GENIUS_ACCESS_TOKEN secret is not configured" },
        500
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
        return jsonResponse(
          { error: `Genius API error (${res.status})` },
          res.status
        );
      }
      const json = (await res.json()) as {
        response?: { song?: GeniusSongResult };
      };
      const song = json.response?.song;
      if (!song) {
        return jsonResponse({ error: "Song not found" }, 404);
      }
      return jsonResponse({ song: mapGeniusSong(song) });
    }

    const query = body.query?.trim();
    if (!query) {
      return jsonResponse({ hits: [] });
    }

    const res = await fetch(
      `${GENIUS_API_BASE}/search?q=${encodeURIComponent(query)}`,
      { headers }
    );
    if (!res.ok) {
      return jsonResponse(
        { error: `Genius API error (${res.status})` },
        res.status
      );
    }

    const json = (await res.json()) as {
      response?: { hits?: GeniusSearchHit[] };
    };
    const hits = (json.response?.hits ?? [])
      .filter((hit) => hit.type === "song")
      .map((hit) => mapGeniusSong(hit.result));

    return jsonResponse({ hits });
  }
);

export default {
  fetch: async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    const res = await handler(req);
    const nextHeaders = new Headers(res.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      if (!nextHeaders.has(key)) {
        nextHeaders.set(key, value);
      }
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: nextHeaders,
    });
  },
};

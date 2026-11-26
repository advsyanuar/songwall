import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { lookupGeniusSong } from "../hooks/useGeniusSearch";
import { useTracklist } from "../hooks/useTracklist";
import type { SongId } from "../types/song";

export type LyricsPageState = {
  id?: SongId;
  title: string;
  artist: string;
  lyrics_url?: string;
};

export function LyricsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { updateSong } = useTracklist();

  const state = (location.state as LyricsPageState | null) ?? null;
  const title = state?.title ?? searchParams.get("title") ?? "";
  const artist = state?.artist ?? searchParams.get("artist") ?? "";
  const initialUrl = state?.lyrics_url ?? searchParams.get("url") ?? "";
  const songId = state?.id;

  const {
    data: fetchedUrl,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["genius-lyrics", title, artist],
    enabled: !initialUrl && Boolean(title),
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const hit = await lookupGeniusSong(title, artist);
      if (!hit?.lyrics_url) {
        throw new Error("No lyrics page found on Genius for this song.");
      }
      if (songId !== undefined) {
        updateSong({
          id: songId,
          updates: {
            lyrics_url: hit.lyrics_url,
            ...(hit.album ? { album: hit.album } : {}),
            ...(hit.album_image_link
              ? { album_image_link: hit.album_image_link }
              : {}),
          },
        });
      }
      return hit.lyrics_url;
    },
  });

  const lyricsUrl = initialUrl || fetchedUrl || "";

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col p-4 sm:p-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
          >
            <ArrowLeftIcon /> Back to List
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-lg">
              {title || "Song Lyrics"}
            </h1>
            {artist && (
              <p className="truncate text-xs text-muted-foreground">{artist}</p>
            )}
          </div>
        </div>

        {lyricsUrl && (
          <a
            href={lyricsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Open on Genius <ArrowSquareOutIcon className="size-3.5" />
          </a>
        )}
      </div>

      {!title ? (
        <div className="border p-6 text-sm text-muted-foreground">
          No song selected. Return to the tracklist to pick a song.
        </div>
      ) : isLoading ? (
        <div className="border p-6 text-sm text-muted-foreground">
          Searching Genius for lyrics...
        </div>
      ) : error ? (
        <div className="border p-6 text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : "Failed to fetch lyrics from Genius"}
        </div>
      ) : lyricsUrl ? (
        <iframe
          src={lyricsUrl}
          title={`${title} - ${artist} lyrics`}
          className="h-[calc(100vh-9rem)] w-full flex-1 border bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      ) : null}
    </div>
  );
}

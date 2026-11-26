import { ArrowSquareOutIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "./ui/button";

export type LyricsViewerTarget = {
  title: string;
  artist: string;
  lyrics_url: string;
};

type LyricsViewerProps = {
  song: LyricsViewerTarget | null;
  onClose: () => void;
};

export function LyricsViewer({ song, onClose }: LyricsViewerProps) {
  if (!song) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Lyrics for ${song.title}`}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl flex-col border bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold sm:text-base">
              {song.title}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {song.artist}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={song.lyrics_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 border px-2.5 py-1 text-xs font-medium hover:bg-muted"
            >
              Open on Genius <ArrowSquareOutIcon className="size-3.5" />
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close lyrics"
              onClick={onClose}
            >
              <XIcon />
            </Button>
          </div>
        </div>
        <iframe
          src={song.lyrics_url}
          title={`${song.title} - ${song.artist} lyrics`}
          className="h-[70vh] w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}

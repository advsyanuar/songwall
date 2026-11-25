import { format, parseISO } from "date-fns";
import { Badge } from "../components/ui/badge";
import type { SessionHistory } from "../types/song";

type SessionHistorySectionProps = {
  sessions: SessionHistory[];
  isLoading: boolean;
  isError?: boolean;
  error?: Error | null;
};

export function SessionHistorySection({
  sessions,
  isLoading,
  isError,
  error,
}: SessionHistorySectionProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading session history...</p>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        Failed to load session history:{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </p>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No saved sessions yet. Save a tracklist from the New Session tab to see it here.
      </p>
    );
  }

  const sortedSessions = [...sessions].sort((a, b) =>
    b.date.localeCompare(a.date) || b.savedAt.localeCompare(a.savedAt)
  );

  return (
    <div className="flex flex-col gap-4">
      {sortedSessions.map((session) => {
        const orderedSongs = [...session.songs].sort(
          (a, b) => a.order - b.order
        );
        let formattedDate = session.date;
        try {
          formattedDate = format(parseISO(session.date), "PPP");
        } catch {
          // fallback to raw date string
        }

        return (
          <div
            key={session.id}
            className="flex flex-col gap-3 border p-3 sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-sm font-bold sm:text-base">
                  {formattedDate}
                </span>
                <span className="text-xs text-muted-foreground">
                  Saved {format(new Date(session.savedAt), "PPp")}
                </span>
              </div>
              <Badge variant="secondary">
                {orderedSongs.length} song{orderedSongs.length === 1 ? "" : "s"}
              </Badge>
            </div>

            <ol className="flex flex-col gap-1.5 border-t pt-2.5 text-sm">
              {orderedSongs.map((song, idx) => (
                <li
                  key={`${session.id}-${idx}`}
                  className="flex flex-wrap items-baseline justify-between gap-2"
                >
                  <span className="font-medium">
                    {idx + 1}. {song.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {song.artist}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

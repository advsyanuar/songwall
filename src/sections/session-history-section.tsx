import { useState } from "react";
import { flushSync } from "react-dom";
import {
  CalendarIcon,
  CaretDownIcon,
  PrinterIcon,
  XIcon,
} from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { lookupGeniusSong } from "../hooks/useGeniusSearch";
import type { SessionHistory, SessionSong } from "../types/song";

type SessionHistorySectionProps = {
  sessions: SessionHistory[];
  isLoading: boolean;
  isError?: boolean;
  error?: Error | null;
};

function formatSessionDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "PPP");
  } catch {
    return dateStr;
  }
}

export function SessionHistorySection({
  sessions,
  isLoading,
  isError,
  error,
}: SessionHistorySectionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [printingSession, setPrintingSession] =
    useState<SessionHistory | null>(null);

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleOpenLyrics = async (song: SessionSong) => {
    if (song.lyrics_url) {
      window.open(song.lyrics_url, "_blank", "noopener,noreferrer");
      return;
    }

    const popup = window.open("about:blank", "_blank");
    try {
      const hit = await lookupGeniusSong(song.title, song.artist);
      if (!hit?.lyrics_url) {
        popup?.close();
        return;
      }

      if (popup) {
        popup.opener = null;
        popup.location.href = hit.lyrics_url;
      } else {
        window.open(hit.lyrics_url, "_blank", "noopener,noreferrer");
      }
    } catch {
      popup?.close();
    }
  };

  const handlePrintSession = (session: SessionHistory) => {
    flushSync(() => {
      setPrintingSession(session);
    });
    window.print();
    setPrintingSession(null);
  };

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading session history...
      </p>
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
        No saved sessions yet. Save a tracklist from the New Session tab to see
        it here.
      </p>
    );
  }

  const sortedSessions = [...sessions].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.savedAt.localeCompare(a.savedAt)
  );

  const filterDateStr = filterDate ? format(filterDate, "yyyy-MM-dd") : null;
  const filteredSessions = filterDateStr
    ? sortedSessions.filter((session) => session.date === filterDateStr)
    : sortedSessions;

  return (
    <>
      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-start font-medium"
                  >
                    <CalendarIcon />
                    {filterDate ? format(filterDate, "PPP") : "Filter by date"}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filterDate}
                  onSelect={(date) => {
                    setFilterDate(date);
                    setCalendarOpen(false);
                  }}
                  defaultMonth={filterDate}
                />
              </PopoverContent>
            </Popover>

            {filterDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFilterDate(undefined)}
              >
                <XIcon /> All Dates
              </Button>
            )}
          </div>

          <span className="text-xs text-muted-foreground">
            {filteredSessions.length} session
            {filteredSessions.length === 1 ? "" : "s"}
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <p className="border p-4 text-sm text-muted-foreground">
            No saved session found for {format(filterDate!, "PPP")}.
          </p>
        ) : (
          filteredSessions.map((session) => {
            const sessionKey = String(session.id);
            const isOpen = openIds.has(sessionKey);
            const orderedSongs = [...session.songs].sort(
              (a, b) => a.order - b.order
            );
            const bands = Array.from(
              new Set(orderedSongs.map((song) => song.artist).filter(Boolean))
            );
            const formattedDate = formatSessionDate(session.date);

            return (
              <div key={session.id} className="border">
                <div className="flex items-start justify-between gap-2 p-3 sm:items-center sm:p-4">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggleAccordion(sessionKey)}
                    className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <CaretDownIcon
                        className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-bold sm:text-base">
                          {formattedDate}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Saved {format(new Date(session.savedAt), "PPp")}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pl-6 sm:pl-0">
                      <Badge variant="secondary">
                        {orderedSongs.length} song
                        {orderedSongs.length === 1 ? "" : "s"}
                      </Badge>
                      {bands.map((band) => (
                        <Badge key={band} variant="outline">
                          {band}
                        </Badge>
                      ))}
                    </div>
                  </button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Print session for ${formattedDate}`}
                    onClick={() => handlePrintSession(session)}
                  >
                    <PrinterIcon />
                  </Button>
                </div>

                {isOpen && (
                  <ol className="flex flex-col gap-1 border-t px-3 py-2.5 text-sm sm:px-4">
                    {orderedSongs.map((song, idx) => (
                      <li
                        key={`${session.id}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 py-1"
                      >
                        <button
                          type="button"
                          onClick={() => void handleOpenLyrics(song)}
                          className="cursor-pointer text-left font-medium hover:underline"
                        >
                          {idx + 1}. {song.title}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {song.artist}
                          {song.album ? ` · ${song.album}` : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })
        )}
      </div>

      {printingSession && (
        <div className="hidden print:block">
          <div className="mb-4 border-b pb-3">
            <h1 className="text-xl font-bold">
              Session Setlist — {formatSessionDate(printingSession.date)}
            </h1>
            <p className="text-xs text-muted-foreground">
              {printingSession.songs.length} song
              {printingSession.songs.length === 1 ? "" : "s"} · Saved{" "}
              {format(new Date(printingSession.savedAt), "PPp")}
            </p>
          </div>

          <ol className="flex flex-col gap-2 text-sm">
            {[...printingSession.songs]
              .sort((a, b) => a.order - b.order)
              .map((song, idx) => (
                <li
                  key={`print-${printingSession.id}-${idx}`}
                  className="flex items-baseline justify-between gap-4 border-b pb-1.5"
                >
                  <span className="font-semibold">
                    {idx + 1}. {song.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {song.artist}
                    {song.album ? ` · ${song.album}` : ""}
                  </span>
                </li>
              ))}
          </ol>
        </div>
      )}
    </>
  );
}

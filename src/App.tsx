import { useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import {
  CalendarIcon,
  FloppyDiskIcon,
  PlusCircleIcon,
} from "@phosphor-icons/react";
import { format } from "date-fns";
import { Button } from "./components/ui/button";
import { Calendar } from "./components/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "./components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "./components/ui/popover";
import { ScrollArea } from "./components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { useSessionHistory } from "./hooks/useSessionHistory";
import { useTracklist } from "./hooks/useTracklist";
import { AddSongsPage } from "./pages/add-songs-page";
import { SessionHistorySection } from "./sections/session-history-section";
import TracklistSection from "./sections/tracklist-section";

function formatDate(date: Date | undefined) {
  if (!date) return "";
  return format(date, "PPP");
}

function isValidDate(date: Date | undefined): date is Date {
  return Boolean(date && !Number.isNaN(date.getTime()));
}

function TracklistHomePage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(() => new Date());
  const [month, setMonth] = useState<Date | undefined>(() => new Date());
  const [value, setValue] = useState(() => formatDate(new Date()));

  const {
    data: songs,
    isLoading,
    isFetching,
    isError,
    error,
    removeSong,
    updateSong,
    reorderSongs,
  } = useTracklist();

  const {
    sessions,
    isLoadingSessions,
    isSessionsError,
    sessionsError,
    saveSession,
    isSaving,
  } = useSessionHistory();

  const songCounts = songs.length;

  const handleSaveSession = () => {
    if (!date || songs.length === 0) return;
    const dateStr = format(date, "yyyy-MM-dd");
    saveSession({ date: dateStr, songs });
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl p-4 sm:p-6 md:p-8 print:p-0">
      <Tabs defaultValue="new-session" className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="new-session">New Session</TabsTrigger>
            <TabsTrigger value="session-history">Session History</TabsTrigger>
          </TabsList>

          <Button
            type="button"
            variant="default"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => navigate("/add")}
          >
            <PlusCircleIcon /> Add Songs
          </Button>
        </div>

        <TabsContent value="new-session" className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold">
                {songCounts} Songs
                {isFetching && !isLoading ? " (refreshing...)" : ""}
              </span>
              <InputGroup className="w-full sm:w-56">
                <InputGroupInput
                  id="date-required"
                  value={value}
                  placeholder="Pick session date"
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setValue(nextValue);
                    if (!nextValue.trim()) {
                      setDate(undefined);
                      return;
                    }
                    const parsed = new Date(nextValue);
                    if (isValidDate(parsed)) {
                      setDate(parsed);
                      setMonth(parsed);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setOpen(true);
                    }
                  }}
                />
                <InputGroupAddon align="inline-end">
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger
                      render={
                        <InputGroupButton
                          id="date-picker"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Select date"
                        >
                          <CalendarIcon />
                          <span className="sr-only">Select date</span>
                        </InputGroupButton>
                      }
                    />
                    <PopoverContent
                      className="w-auto overflow-hidden p-0"
                      align="end"
                      alignOffset={-8}
                      sideOffset={10}
                    >
                      <Calendar
                        mode="single"
                        selected={date}
                        month={month}
                        onMonthChange={setMonth}
                        onSelect={(selectedDate) => {
                          setDate(selectedDate);
                          setValue(formatDate(selectedDate));
                          if (selectedDate) setMonth(selectedDate);
                          setOpen(false);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </InputGroupAddon>
              </InputGroup>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                disabled={isSaving || songs.length === 0 || !date}
                onClick={handleSaveSession}
              >
                <FloppyDiskIcon /> {isSaving ? "Saving..." : "Save Session"}
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[65vh] w-full border sm:h-150">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading tracklist...
              </p>
            ) : isError ? (
              <p className="text-sm text-destructive">
                Failed to load tracklist:{" "}
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            ) : (
              <TracklistSection
                songs={songs}
                onRemove={(id) => removeSong(id)}
                onUpdate={(id, updates) => updateSong({ id, updates })}
                onReorder={(fromIndex, toIndex) =>
                  reorderSongs({ fromIndex, toIndex })
                }
              />
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="session-history" className="mt-4 print:mt-0">
          <ScrollArea className="h-[70vh] w-full border p-3 sm:h-150 sm:p-4 print:h-auto print:overflow-visible print:border-0 print:p-0">
            <SessionHistorySection
              sessions={sessions}
              isLoading={isLoadingSessions}
              isError={isSessionsError}
              error={sessionsError}
            />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<TracklistHomePage />} />
      <Route path="/add" element={<AddSongsPage />} />
    </Routes>
  );
}

export default App;

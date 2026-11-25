import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionHistory, SessionSong, Song } from "../types/song";
import { createClient } from "../lib/supabase/client";

export const SESSION_HISTORY_QUERY_KEY = ["session-history"] as const;

const supabase = createClient();

function songsToSnapshot(songs: Song[]): SessionSong[] {
  return songs.map((song, index) => ({
    title: song.title,
    artist: song.artist,
    album: song.album,
    order: song.order ?? index,
  }));
}

export type SaveSessionPayload = {
  date: string;
  songs: Song[];
};

export const useSessionHistory = () => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: SESSION_HISTORY_QUERY_KEY });

  const sessionsQuery = useQuery({
    queryKey: SESSION_HISTORY_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_history")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      return (data as Array<{
        id: string | number;
        date: string;
        saved_at: string;
        songs: SessionSong[];
      }>).map((row) => ({
        id: row.id,
        date: row.date,
        savedAt: row.saved_at,
        songs: row.songs,
      })) as SessionHistory[];
    },
  });

  const saveSessionMutation = useMutation({
    mutationFn: async ({ date, songs }: SaveSessionPayload) => {
      const snapshot = songsToSnapshot(songs);
      const savedAt = new Date().toISOString();

      // Check if a session for this date already exists
      const { data: existing, error: fetchError } = await supabase
        .from("session_history")
        .select("id")
        .eq("date", date)
        .limit(1);

      if (fetchError) throw fetchError;

      if (existing && existing.length > 0) {
        // Update existing entry (upsert by date)
        const { data, error } = await supabase
          .from("session_history")
          .update({
            saved_at: savedAt,
            songs: snapshot,
          })
          .eq("id", existing[0]!.id)
          .select()
          .single();

        if (error) throw error;
        return {
          id: data.id,
          date: data.date,
          savedAt: data.saved_at,
          songs: data.songs,
        } as SessionHistory;
      }

      // Insert new entry
      const { data, error } = await supabase
        .from("session_history")
        .insert({
          date,
          saved_at: savedAt,
          songs: snapshot,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        id: data.id,
        date: data.date,
        savedAt: data.saved_at,
        songs: data.songs,
      } as SessionHistory;
    },
    onSuccess: invalidate,
  });

  return {
    sessions: sessionsQuery.data ?? [],
    isLoadingSessions: sessionsQuery.isLoading,
    isSessionsError: sessionsQuery.isError,
    sessionsError: sessionsQuery.error,
    saveSession: saveSessionMutation.mutate,
    saveSessionAsync: saveSessionMutation.mutateAsync,
    isSaving: saveSessionMutation.isPending,
    saveError: saveSessionMutation.error,
  };
};

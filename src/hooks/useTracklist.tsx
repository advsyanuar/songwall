import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NewSong, Song, SongId, UpdateSongPayload } from "../types/song";
import { createClient } from "../lib/supabase/client";

export const TRACKLIST_QUERY_KEY = ["tracklist"] as const;

export type ReorderSongsPayload = {
  fromIndex: number;
  toIndex: number;
};

const supabase = createClient();

function sortTracklist(songs: Song[]): Song[] {
  return songs
    .map((song, index) => ({ song, index }))
    .sort((a, b) => {
      const orderA = a.song.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.song.order ?? Number.MAX_SAFE_INTEGER;
      return orderA !== orderB ? orderA - orderB : a.index - b.index;
    })
    .map(({ song }) => song);
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) return items;
  next.splice(toIndex, 0, moved);
  return next;
}

export const useTracklist = () => {
  const queryClient = useQueryClient();

  const invalidateTracklist = () =>
    queryClient.invalidateQueries({ queryKey: TRACKLIST_QUERY_KEY });

  const tracklistQuery = useQuery({
    queryKey: TRACKLIST_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracklist")
        .select("*");

      if (error) throw error;
      return sortTracklist(data as Song[]);
    },
  });

  const addSongMutation = useMutation({
    mutationFn: async (newSong: NewSong) => {
      const currentSongs =
        queryClient.getQueryData<Song[]>(TRACKLIST_QUERY_KEY) ?? [];
      const maxOrder = currentSongs.reduce(
        (max, song, idx) => Math.max(max, song.order ?? idx),
        -1
      );

      const { data, error } = await supabase
        .from("tracklist")
        .insert({
          title: newSong.title,
          artist: newSong.artist,
          album: newSong.album ?? null,
          album_image_link: newSong.album_image_link ?? null,
          order: newSong.order ?? maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Song;
    },
    onSuccess: invalidateTracklist,
  });

  const addSongsMutation = useMutation({
    mutationFn: async (newSongs: NewSong[]) => {
      const currentSongs =
        queryClient.getQueryData<Song[]>(TRACKLIST_QUERY_KEY) ?? [];
      let nextOrder =
        currentSongs.reduce(
          (max, song, idx) => Math.max(max, song.order ?? idx),
          -1
        ) + 1;

      const rows = newSongs.map((s) => ({
        title: s.title,
        artist: s.artist,
        album: s.album ?? null,
        album_image_link: s.album_image_link ?? null,
        order: s.order ?? nextOrder++,
      }));

      const { data, error } = await supabase
        .from("tracklist")
        .insert(rows)
        .select();

      if (error) throw error;
      return data as Song[];
    },
    onSuccess: invalidateTracklist,
  });

  const removeSongMutation = useMutation({
    mutationFn: async (id: SongId) => {
      const { error } = await supabase
        .from("tracklist")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: invalidateTracklist,
  });

  const updateSongMutation = useMutation({
    mutationFn: async ({ id, updates }: UpdateSongPayload) => {
      const { data, error } = await supabase
        .from("tracklist")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Song;
    },
    onSuccess: invalidateTracklist,
  });

  const reorderSongsMutation = useMutation<
    Song[],
    Error,
    ReorderSongsPayload,
    { previousSongs: Song[] }
  >({
    onMutate: async ({ fromIndex, toIndex }) => {
      await queryClient.cancelQueries({ queryKey: TRACKLIST_QUERY_KEY });
      const previousSongs =
        queryClient.getQueryData<Song[]>(TRACKLIST_QUERY_KEY) ?? [];

      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= previousSongs.length ||
        toIndex >= previousSongs.length
      ) {
        return { previousSongs };
      }

      const reordered = moveItem(previousSongs, fromIndex, toIndex);
      queryClient.setQueryData<Song[]>(TRACKLIST_QUERY_KEY, reordered);

      return { previousSongs };
    },
    mutationFn: async () => {
      const currentSongs =
        queryClient.getQueryData<Song[]>(TRACKLIST_QUERY_KEY) ?? [];

      const changed = currentSongs
        .map((song, index) => ({ song, nextOrder: index }))
        .filter(({ song, nextOrder }) => song.order !== nextOrder);

      await Promise.all(
        changed.map(({ song, nextOrder }) =>
          supabase
            .from("tracklist")
            .update({ order: nextOrder })
            .eq("id", song.id)
            .then(({ error }) => {
              if (error) throw error;
            })
        )
      );

      const synced = currentSongs.map((song, index) => ({
        ...song,
        order: index,
      }));
      queryClient.setQueryData<Song[]>(TRACKLIST_QUERY_KEY, synced);
      return synced;
    },
    onError: (_error, _variables, context) => {
      if (context?.previousSongs) {
        queryClient.setQueryData<Song[]>(
          TRACKLIST_QUERY_KEY,
          context.previousSongs
        );
      }
    },
    onSettled: invalidateTracklist,
  });

  return {
    data: tracklistQuery.data ?? [],
    isLoading: tracklistQuery.isLoading,
    isFetching: tracklistQuery.isFetching,
    isError: tracklistQuery.isError,
    error: tracklistQuery.error,
    refetch: tracklistQuery.refetch,
    addSong: addSongMutation.mutate,
    addSongAsync: addSongMutation.mutateAsync,
    isAdding: addSongMutation.isPending,
    addSongs: addSongsMutation.mutate,
    addSongsAsync: addSongsMutation.mutateAsync,
    isAddingBatch: addSongsMutation.isPending,
    removeSong: removeSongMutation.mutate,
    removeSongAsync: removeSongMutation.mutateAsync,
    isRemoving: removeSongMutation.isPending,
    updateSong: updateSongMutation.mutate,
    updateSongAsync: updateSongMutation.mutateAsync,
    isUpdating: updateSongMutation.isPending,
    reorderSongs: reorderSongsMutation.mutate,
    reorderSongsAsync: reorderSongsMutation.mutateAsync,
    isReordering: reorderSongsMutation.isPending,
    isMutating:
      addSongMutation.isPending ||
      addSongsMutation.isPending ||
      removeSongMutation.isPending ||
      updateSongMutation.isPending ||
      reorderSongsMutation.isPending,
  };
};

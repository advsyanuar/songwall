import { useState, type ComponentProps } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import {
  CheckIcon,
  DiscIcon,
  DotsSixVerticalIcon,
  PencilSimpleIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "../components/ui/item";
import { lookupGeniusSong } from "../hooks/useGeniusSearch";
import type { Song, SongId } from "../types/song";

type DragEndHandler = NonNullable<
  ComponentProps<typeof DragDropProvider>["onDragEnd"]
>;

type SortableProps = {
  id: SongId;
  index: number;
  song: Song;
  onRemove?: (id: SongId) => void;
  onUpdate?: (id: SongId, updates: Partial<Omit<Song, "id">>) => void;
  onOpenLyrics: (song: Song) => void;
};

const Sortable = ({
  id,
  index,
  song,
  onRemove,
  onUpdate,
  onOpenLyrics,
}: SortableProps) => {
  const { ref, handleRef, isDragging } = useSortable({ id, index });
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(song.title);
  const [artistDraft, setArtistDraft] = useState(song.artist);

  const startEditing = () => {
    setTitleDraft(song.title);
    setArtistDraft(song.artist);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setTitleDraft(song.title);
    setArtistDraft(song.artist);
  };

  const saveEditing = () => {
    const title = titleDraft.trim();
    const artist = artistDraft.trim();
    if (!title || !artist) return;
    if (title !== song.title || artist !== song.artist) {
      onUpdate?.(song.id, { title, artist });
    }
    setIsEditing(false);
  };

  return (
    <Item
      ref={ref}
      variant="outline"
      size="sm"
      className={`${isDragging ? "opacity-60 " : ""}${!isEditing ? "cursor-pointer hover:bg-muted/40" : ""}`}
      render={
        <li
          onClick={() => {
            if (!isEditing) onOpenLyrics(song);
          }}
        >
          <ItemMedia variant={song.album_image_link ? "image" : "default"}>
            {song.album_image_link ? (
              <img src={song.album_image_link} alt={song.title} />
            ) : (
              <DiscIcon className="size-5" />
            )}
          </ItemMedia>
          <ItemContent>
            {isEditing ? (
              <div
                className="flex flex-wrap items-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Input
                  value={titleDraft}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setTitleDraft(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") saveEditing();
                    if (e.key === "Escape") cancelEditing();
                  }}
                  placeholder="Song title"
                  className="h-8 w-full sm:max-w-64"
                />
                <Input
                  value={artistDraft}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setArtistDraft(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") saveEditing();
                    if (e.key === "Escape") cancelEditing();
                  }}
                  placeholder="Artist"
                  className="h-8 w-full sm:max-w-48"
                />
              </div>
            ) : (
              <>
                <ItemTitle className="text-base font-bold">
                  {index + 1} - {song.title}
                </ItemTitle>
                <ItemDescription>
                  {song.artist}
                  {song.album ? ` · ${song.album}` : ""}
                </ItemDescription>
              </>
            )}
          </ItemContent>
          <ItemActions onClick={(e) => e.stopPropagation()}>
            <span
              ref={handleRef}
              aria-label="Drag to reorder"
              className="inline-flex cursor-grab items-center p-1 text-muted-foreground active:cursor-grabbing"
            >
              <DotsSixVerticalIcon className="size-4" />
            </span>
            {isEditing ? (
              <>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  aria-label="Save changes"
                  onClick={saveEditing}
                >
                  <CheckIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Cancel editing"
                  onClick={cancelEditing}
                >
                  <XIcon />
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label={`Edit ${song.title}`}
                onClick={startEditing}
              >
                <PencilSimpleIcon />
              </Button>
            )}
            <Button
              type="button"
              size="icon-sm"
              variant="destructive"
              aria-label={`Remove ${song.title}`}
              onClick={() => onRemove?.(song.id)}
            >
              <TrashIcon />
            </Button>
          </ItemActions>
        </li>
      }
    />
  );
};

type TracklistSectionProps = {
  songs: Song[];
  onRemove?: (id: SongId) => void;
  onUpdate?: (id: SongId, updates: Partial<Omit<Song, "id">>) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
};

const TracklistSection = ({
  songs,
  onRemove,
  onUpdate,
  onReorder,
}: TracklistSectionProps) => {
  const handleOpenLyrics = async (song: Song) => {
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

      onUpdate?.(song.id, {
        lyrics_url: hit.lyrics_url,
        ...(hit.album ? { album: hit.album } : {}),
        ...(hit.album_image_link
          ? { album_image_link: hit.album_image_link }
          : {}),
      });
    } catch {
      popup?.close();
    }
  };

  const handleDragEnd: DragEndHandler = (event) => {
    if (event.canceled) return;
    const { source } = event.operation;
    if (!source || !isSortable(source)) return;

    const fromIndex = source.initialIndex;
    const toIndex = source.index;
    if (fromIndex !== toIndex) {
      onReorder?.(fromIndex, toIndex);
    }
  };

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <ul className="list flex flex-col gap-2">
        {songs.map((song, index) => (
          <Sortable
            key={song.id}
            id={song.id}
            index={index}
            song={song}
            onRemove={onRemove}
            onUpdate={onUpdate}
            onOpenLyrics={(s) => void handleOpenLyrics(s)}
          />
        ))}
      </ul>
    </DragDropProvider>
  );
};

export default TracklistSection;

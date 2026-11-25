import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  FloppyDiskIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { bands } from "../constants/bands";
import { useTracklist } from "../hooks/useTracklist";

type SongRowDraft = {
  key: number;
  title: string;
  band: string;
};

export function AddSongsPage() {
  const navigate = useNavigate();
  const { addSongs, isAddingBatch } = useTracklist();
  const [rows, setRows] = useState<SongRowDraft[]>([
    { key: 1, title: "", band: "green-day" },
  ]);
  const [nextKey, setNextKey] = useState(2);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const addRow = () => {
    setRows((prev) => [...prev, { key: nextKey, title: "", band: "green-day" }]);
    setNextKey((k) => k + 1);
  };

  const removeRow = (key: number) => {
    setRows((prev) =>
      prev.length > 1 ? prev.filter((r) => r.key !== key) : prev
    );
  };

  const updateRow = (key: number, patch: Partial<Omit<SongRowDraft, "key">>) => {
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row))
    );
  };

  const validRows = rows.filter((row) => row.title.trim().length > 0);

  const handleSaveAll = () => {
    if (validRows.length === 0) return;
    setSubmitError(null);

    const payload = validRows.map((row) => ({
      title: row.title.trim(),
      artist: bands.find((b) => b.value === row.band)?.label ?? row.band,
    }));

    addSongs(payload, {
      onSuccess: () => {
        navigate("/");
      },
      onError: (err) => {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to save songs"
        );
      },
    });
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl p-4 sm:p-6 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/")}
        >
          <ArrowLeftIcon /> Back
        </Button>
        <h1 className="text-lg font-bold tracking-tight">Add Songs</h1>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className="flex flex-col gap-3 border p-3 sm:flex-row sm:items-center"
          >
            <span className="text-xs font-semibold text-muted-foreground sm:w-6">
              #{index + 1}
            </span>
            <Input
              value={row.title}
              placeholder="Input song name..."
              className="flex-1"
              onChange={(e) => updateRow(row.key, { title: e.target.value })}
            />
            <Select
              items={bands}
              value={row.band}
              onValueChange={(value) => {
                if (value) updateRow(row.key, { band: value });
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Band" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {bands.map((band) => (
                    <SelectItem key={band.value} value={band.value}>
                      {band.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              className="self-end sm:self-auto"
              disabled={rows.length === 1}
              aria-label={`Remove row ${index + 1}`}
              onClick={() => removeRow(row.key)}
            >
              <TrashIcon />
            </Button>
          </div>
        ))}
      </div>

      {submitError && (
        <p className="mt-3 text-sm text-destructive">{submitError}</p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          onClick={addRow}
        >
          <PlusCircleIcon /> Add Another Row
        </Button>

        <Button
          type="button"
          variant="default"
          size="sm"
          className="w-full sm:w-auto"
          disabled={validRows.length === 0 || isAddingBatch}
          onClick={handleSaveAll}
        >
          <FloppyDiskIcon />{" "}
          {isAddingBatch
            ? "Saving..."
            : `Save ${validRows.length || ""} Song${validRows.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}

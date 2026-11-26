import { useEffect, useRef, useState } from "react";
import { bands } from "../constants/bands";
import { Input } from "./ui/input";

type ArtistAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function ArtistAutocomplete({
  value,
  onChange,
  placeholder = "Artist / Band...",
  className,
}: ArtistAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalized = value.trim().toLowerCase();
  const filtered = normalized
    ? bands.filter((band) => band.label.toLowerCase().includes(normalized))
    : bands;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <Input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Enter" && open && filtered.length > 0) {
            const exact = filtered.find(
              (b) => b.label.toLowerCase() === normalized
            );
            if (!exact) {
              e.preventDefault();
              onChange(filtered[0]!.label);
              setOpen(false);
            }
          }
        }}
      />

      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-40 mt-1 max-h-48 w-full overflow-y-auto border bg-popover text-popover-foreground shadow-md"
        >
          {filtered.map((band) => (
            <li key={band.value}>
              <button
                type="button"
                className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(band.label);
                  setOpen(false);
                }}
              >
                {band.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

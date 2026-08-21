import { Check, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function InlineField({
  label,
  value,
  onSave,
  mono,
  options,
  placeholder,
  children,
}: {
  label: string;
  value: string;
  onSave: (value: string) => Promise<void> | void;
  mono?: boolean;
  options?: readonly string[];
  placeholder?: string;
  children?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commit = async (next: string) => {
    setEditing(false);
    if (next !== value) await onSave(next);
  };

  return (
    <div className="group">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      {editing ? (
        options ? (
          <Select
            defaultOpen
            value={draft}
            onValueChange={(v) => {
              setDraft(v);
              void commit(v);
            }}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="mt-1.5 flex items-center gap-1.5">
            <Input
              ref={inputRef}
              value={draft}
              placeholder={placeholder}
              className={cn("h-9", mono && "text-numeric")}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commit(draft);
                if (e.key === "Escape") {
                  setDraft(value);
                  setEditing(false);
                }
              }}
            />
            <button
              type="button"
              aria-label="Salvar"
              className="rounded-md p-1.5 text-teal hover:bg-accent"
              onClick={() => void commit(draft)}
            >
              <Check className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Cancelar"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
            >
              <X className="size-4" />
            </button>
          </div>
        )
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 flex w-full items-center gap-2 rounded-md py-1 text-left text-sm text-foreground hover:text-gold-light"
          title="Clique para editar"
        >
          {children ?? (
            <span className={cn("truncate", mono && "text-numeric", !value && "text-muted-foreground")}>
              {value || "—"}
            </span>
          )}
          <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      )}
    </div>
  );
}

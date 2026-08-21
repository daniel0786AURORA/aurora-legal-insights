import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { casesQueryOptions } from "@/lib/cases";
import { DEADLINE_PRIORITIES, localDayKey, type DeadlineFull } from "@/lib/dashboard";

const NO_CASE = "__none__";

export function DeadlineDialog({
  open,
  onOpenChange,
  defaultDate,
  deadline,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  deadline?: DeadlineFull | null;
}) {
  const queryClient = useQueryClient();
  const { data: cases = [] } = useQuery({ ...casesQueryOptions(), enabled: open });

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState<string>("informativo");
  const [kind, setKind] = useState("compromisso");
  const [caseId, setCaseId] = useState<string>(NO_CASE);

  useEffect(() => {
    if (!open) return;
    setTitle(deadline?.title ?? "");
    setDate(deadline ? localDayKey(deadline.due_date) : (defaultDate ?? localDayKey(new Date())));
    setPriority(deadline?.priority ?? "informativo");
    setKind(deadline?.kind ?? "compromisso");
    setCaseId(deadline?.case_id ?? NO_CASE);
  }, [open, deadline, defaultDate]);

  const mutation = useMutation({
    mutationFn: async () => {
      const [y, m, d] = date.split("-").map(Number);
      const payload = {
        title: title.trim(),
        due_date: new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0).toISOString(),
        priority,
        kind,
        case_id: caseId === NO_CASE ? null : caseId,
      };
      if (deadline) {
        const { error } = await supabase.from("deadlines").update(payload).eq("id", deadline.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deadlines").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deadlines"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(deadline ? "Compromisso atualizado" : "Compromisso criado");
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {deadline ? "Editar compromisso" : "Novo compromisso"}
          </DialogTitle>
          <DialogDescription>Prazos e compromissos da sua agenda.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !date) {
              toast.error("Título e data são obrigatórios.");
              return;
            }
            mutation.mutate();
          }}
        >
          <div>
            <FieldLabel>Título</FieldLabel>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Data</FieldLabel>
              <Input
                type="date"
                className="text-numeric"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <FieldLabel>Tipo</FieldLabel>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prazo">Prazo</SelectItem>
                  <SelectItem value="compromisso">Compromisso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <FieldLabel>Prioridade</FieldLabel>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEADLINE_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Processo vinculado (opcional)</FieldLabel>
            <Select value={caseId} onValueChange={setCaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem processo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CASE}>Sem processo</SelectItem>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.client_name} — {c.case_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </Label>
  );
}

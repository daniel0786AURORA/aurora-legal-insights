import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { CASE_STATUSES, CASE_TYPES } from "@/lib/cases";

const empty = {
  case_number: "",
  client_name: "",
  client_phone: "",
  client_email: "",
  opposing_party: "",
  court: "",
  case_type: "",
  status: "Prazo em aberto",
};

export function NewCaseDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("cases")
        .insert({
          case_number: form.case_number.trim(),
          client_name: form.client_name.trim(),
          client_phone: form.client_phone.trim() || null,
          client_email: form.client_email.trim() || null,
          opposing_party: form.opposing_party.trim() || null,
          court: form.court.trim() || null,
          case_type: form.case_type || null,
          status: form.status,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("case_activity").insert({
        case_id: data.id,
        event_type: "outro",
        description: "Processo cadastrado na Aurora.",
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success("Processo cadastrado");
      setForm(empty);
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const set = (key: keyof typeof empty) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="size-4" /> Novo processo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Novo processo</DialogTitle>
          <DialogDescription>Preencha os dados básicos do processo.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.case_number.trim() || !form.client_name.trim()) {
              toast.error("Número do processo e nome do cliente são obrigatórios.");
              return;
            }
            mutation.mutate();
          }}
        >
          <Field label="Número do processo" className="sm:col-span-2">
            <Input
              className="text-numeric"
              placeholder="0000000-00.0000.0.00.0000"
              value={form.case_number}
              onChange={(e) => set("case_number")(e.target.value)}
            />
          </Field>
          <Field label="Nome do cliente">
            <Input value={form.client_name} onChange={(e) => set("client_name")(e.target.value)} />
          </Field>
          <Field label="Parte contrária">
            <Input
              value={form.opposing_party}
              onChange={(e) => set("opposing_party")(e.target.value)}
            />
          </Field>
          <Field label="Telefone">
            <Input
              className="text-numeric"
              placeholder="(11) 90000-0000"
              value={form.client_phone}
              onChange={(e) => set("client_phone")(e.target.value)}
            />
          </Field>
          <Field label="E-mail">
            <Input
              type="email"
              value={form.client_email}
              onChange={(e) => set("client_email")(e.target.value)}
            />
          </Field>
          <Field label="Vara / comarca">
            <Input value={form.court} onChange={(e) => set("court")(e.target.value)} />
          </Field>
          <Field label="Tipo de caso">
            <Select value={form.case_type} onValueChange={set("case_type")}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CASE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status" className="sm:col-span-2">
            <Select value={form.status} onValueChange={set("status")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CASE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Cadastrar processo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

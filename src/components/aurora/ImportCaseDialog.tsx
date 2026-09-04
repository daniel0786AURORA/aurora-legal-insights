import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
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
import { auroraAnalyze } from "@/lib/ai.functions";
import { extractPdfText } from "@/lib/documents";
import { uploadCaseDocument } from "@/lib/uploadCaseDocument";
import { Loader2 } from "lucide-react";

const empty = {
  case_number: "",
  client_name: "",
  client_phone: "",
  client_email: "",
  opposing_party: "",
  case_type: "",
  client_role: "", // Autor, Réu, Terceiro
};

export function ImportCaseDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "loading" | "form">("upload");
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStep("loading");

    try {
      // 1. Extrair texto do arquivo (PDF ou TXT)
      let text = "";
      if (f.type === "application/pdf") {
        text = await extractPdfText(f);
      } else {
        text = await f.text();
      }

      if (!text || text.trim().length === 0) {
        throw new Error("Não foi possível extrair texto do arquivo.");
      }

      // 2. Chamar IA
      const res = await auroraAnalyze({
        data: {
          task: "extrair_processo",
          content: text.slice(0, 30000), // Enviar os primeiros ~30k caracteres
        },
      });

      const extracted = JSON.parse(res.text);

      setForm({
        case_number: extracted.case_number || "",
        client_name: extracted.client_name || "",
        client_phone: extracted.client_phone || "",
        client_email: extracted.client_email || "",
        opposing_party: extracted.opposing_party || "",
        case_type: extracted.case_type || "",
        client_role: extracted.client_role || "",
      });

      setStep("form");
      toast.success("Dados extraídos com sucesso. Revise as informações.");
    } catch (err: unknown) {
      console.error(err);
      const errorMsg =
        err instanceof Error ? err.message : "Falha ao extrair dados. Preencha manualmente.";
      toast.error(errorMsg);
      setStep("form"); // Permite que o usuário preencha manualmente
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      // Obter usuário atual para o upload
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      // 1. Salvar na tabela cases (sem o arquivo ainda para pegar o ID)
      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .insert({
          case_number: form.case_number.trim(),
          client_name: form.client_name.trim(),
          client_phone: form.client_phone.trim() || null,
          client_email: form.client_email.trim() || null,
          opposing_party: form.opposing_party.trim() || null,
          case_type: form.case_type || null,
          client_role: form.client_role || null,
          status: "Prazo em aberto", // Status padrão
        })
        .select("id")
        .single();

      if (caseError) throw caseError;

      const caseId = caseData.id;

      // 2. Fazer upload do arquivo
      let storagePath = null;
      if (file) {
        storagePath = await uploadCaseDocument(file, caseId, user.id);

        // 3. Atualizar processo com o storage_path
        await supabase.from("cases").update({ storage_path: storagePath }).eq("id", caseId);
      }

      // 4. Registrar atividade
      await supabase.from("case_activity").insert({
        case_id: caseId,
        event_type: "outro",
        description: "Processo importado via IA.",
      });

      return caseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success("Processo importado e salvo com sucesso!");
      reset();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reset = () => {
    setForm(empty);
    setFile(null);
    setStep("upload");
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
    } else {
      setOpen(true);
    }
  };

  const setField = (key: keyof typeof empty) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <UploadCloud className="size-4" /> Importar Processo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Importar Processo</DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? "Envie a petição inicial (PDF/TXT) para extrair os dados automaticamente com IA."
              : step === "loading"
                ? "Lendo arquivo e extraindo dados..."
                : "Revise os dados extraídos antes de salvar."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex h-40 w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-border/60 bg-surface/50 transition-colors hover:bg-surface">
            <Label
              htmlFor="case-upload"
              className="flex cursor-pointer flex-col items-center gap-2 p-6 text-muted-foreground hover:text-foreground"
            >
              <UploadCloud className="size-8" />
              <span className="text-sm font-medium">Clique para selecionar PDF ou TXT</span>
            </Label>
            <Input
              id="case-upload"
              type="file"
              accept="application/pdf, text/plain"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {step === "loading" && (
          <div className="flex h-40 flex-col items-center justify-center gap-4 py-8 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-gold" />
            <p className="text-sm">Analisando documento...</p>
          </div>
        )}

        {step === "form" && (
          <form
            className="grid gap-4 sm:grid-cols-2 mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                !form.case_number.trim() ||
                !form.client_name.trim() ||
                !form.client_role.trim()
              ) {
                toast.error("Número, cliente e papel (Autor/Réu/Terceiro) são obrigatórios.");
                return;
              }
              mutation.mutate();
            }}
          >
            <Field label="Número do processo" className="sm:col-span-2">
              <Input
                className="text-numeric"
                value={form.case_number}
                onChange={(e) => setField("case_number")(e.target.value)}
              />
            </Field>
            <Field label="Nome do cliente">
              <Input
                value={form.client_name}
                onChange={(e) => setField("client_name")(e.target.value)}
              />
            </Field>
            <Field label="Parte contrária">
              <Input
                value={form.opposing_party}
                onChange={(e) => setField("opposing_party")(e.target.value)}
              />
            </Field>
            <Field label="Papel do Cliente (Role)">
              <Select value={form.client_role} onValueChange={setField("client_role")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Autor">Autor</SelectItem>
                  <SelectItem value="Réu">Réu</SelectItem>
                  <SelectItem value="Terceiro">Terceiro</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tipo de caso">
              <Select value={form.case_type} onValueChange={setField("case_type")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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
            <Field label="Telefone do cliente">
              <Input
                className="text-numeric"
                value={form.client_phone}
                onChange={(e) => setField("client_phone")(e.target.value)}
              />
            </Field>
            <Field label="E-mail do cliente">
              <Input
                type="email"
                value={form.client_email}
                onChange={(e) => setField("client_email")(e.target.value)}
              />
            </Field>
            <DialogFooter className="sm:col-span-2 gap-2 mt-4">
              <Button type="button" variant="outline" onClick={reset} disabled={mutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  "Confirmar e Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
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

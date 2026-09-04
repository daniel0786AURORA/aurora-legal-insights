import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, FileText, Sparkles, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { InlineField } from "@/components/aurora/InlineField";
import { StatusBadge } from "@/components/aurora/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  CASE_STATUSES,
  caseActivityQueryOptions,
  caseDeadlinesQueryOptions,
  caseFilesQueryOptions,
  caseQueryOptions,
  daysUntil,
  formatDate,
  formatDateTime,
  type CaseRow,
} from "@/lib/cases";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/processos/$caseId")({
  head: () => ({
    meta: [
      { title: "Detalhe do processo — Aurora" },
      {
        name: "description",
        content:
          "Dados do cliente, linha do tempo, prazos e arquivos vinculados ao processo na Aurora.",
      },
      { property: "og:title", content: "Detalhe do processo — Aurora" },
      {
        property: "og:description",
        content: "Dados do cliente, linha do tempo, prazos e arquivos do processo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context, params }) => {
    const found = await context.queryClient.ensureQueryData(caseQueryOptions(params.caseId));
    if (!found) throw notFound();
    context.queryClient.ensureQueryData(caseActivityQueryOptions(params.caseId));
    context.queryClient.ensureQueryData(caseFilesQueryOptions(params.caseId));
    context.queryClient.ensureQueryData(caseDeadlinesQueryOptions(params.caseId));
  },
  errorComponent: ({ error }) => (
    <Wrapper>
      <p role="alert" className="panel p-6 text-sm text-urgent">
        Não foi possível carregar o processo: {error.message}
      </p>
    </Wrapper>
  ),
  notFoundComponent: () => (
    <Wrapper>
      <div className="panel p-8 text-center">
        <p className="text-sm text-muted-foreground">Processo não encontrado.</p>
        <BackLink className="mt-4 justify-center" />
      </div>
    </Wrapper>
  ),
  component: CaseDetail,
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-5xl px-6 py-10">{children}</div>;
}

function BackLink({ className }: { className?: string }) {
  return (
    <Link
      to="/processos"
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-gold",
        className,
      )}
    >
      <ArrowLeft className="size-4" /> Todos os processos
    </Link>
  );
}

function dotClass(eventType: string) {
  if (eventType === "prazo_alterado") return "bg-urgent";
  if (eventType === "resumo_gerado" || eventType === "peca_analisada") return "bg-teal";
  return "bg-gold";
}

const EVENT_LABELS: Record<string, string> = {
  resumo_gerado: "Resumo gerado",
  peca_analisada: "Peça analisada",
  prazo_alterado: "Prazo alterado",
  outro: "Registro",
};

function CaseDetail() {
  const { caseId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(caseQueryOptions(caseId));
  const { data: activity } = useSuspenseQuery(caseActivityQueryOptions(caseId));
  const { data: files } = useSuspenseQuery(caseFilesQueryOptions(caseId));
  const { data: deadlines } = useSuspenseQuery(caseDeadlinesQueryOptions(caseId));
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const c = data as CaseRow;

  const update = useMutation({
    mutationFn: async (patch: Partial<CaseRow>) => {
      const { error } = await supabase.from("cases").update(patch).eq("id", caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success("Dados atualizados");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const save = (key: keyof CaseRow) => async (value: string) => {
    await update.mutateAsync({ [key]: value.trim() || null } as Partial<CaseRow>);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `${caseId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("case-files").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("case_files").insert({
        case_id: caseId,
        file_name: file.name,
        file_kind: "enviado_pelo_advogado",
        file_url: path,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["case_files", caseId] });
      toast.success("Arquivo enviado");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const openFile = async (path: string | null) => {
    if (!path) return;
    const { data: signed, error } = await supabase.storage
      .from("case-files")
      .createSignedUrl(path, 60 * 10);
    if (error || !signed) {
      toast.error("Não foi possível abrir o arquivo");
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener,noreferrer");
  };

  const next = deadlines[0];

  return (
    <Wrapper>
      <BackLink />
      <header className="mt-4">
        <h1 className="font-display text-3xl text-foreground">
          {c.client_name}
          {c.opposing_party ? (
            <span className="text-muted-foreground"> vs. {c.opposing_party}</span>
          ) : null}
        </h1>
        <p className="text-numeric mt-2 text-xs text-muted-foreground">
          {c.case_number} · {c.court || "Vara não informada"}
          {c.case_type ? ` · ${c.case_type}` : ""}
        </p>
      </header>

      {next && (
        <div className="panel mt-6 flex flex-wrap items-center gap-4 border-gold/40 p-4">
          <CalendarClock className="size-5 text-gold" />
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              Próximo prazo
            </p>
            <p className="mt-0.5 text-sm text-foreground">
              {next.title} — <span className="text-numeric">{formatDate(next.due_date)}</span>
            </p>
          </div>
          <span
            className={cn(
              "text-numeric ml-auto rounded-full border px-3 py-1 text-xs",
              daysUntil(next.due_date) <= 3
                ? "border-urgent/50 bg-urgent/15 text-urgent"
                : "border-gold/40 bg-gold/10 text-gold",
            )}
          >
            {daysUntil(next.due_date) < 0
              ? `${Math.abs(daysUntil(next.due_date))} dias em atraso`
              : daysUntil(next.due_date) === 0
                ? "Vence hoje"
                : `faltam ${daysUntil(next.due_date)} dias`}
          </span>
        </div>
      )}

      <section className="panel mt-6 p-6">
        <h2 className="font-display text-lg text-foreground">Dados do cliente</h2>
        <p className="mt-1 text-xs text-muted-foreground">Clique em qualquer campo para editar.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <InlineField label="Nome" value={c.client_name} onSave={save("client_name")} />
          <InlineField
            label="Telefone"
            mono
            value={c.client_phone ?? ""}
            onSave={save("client_phone")}
            placeholder="(11) 90000-0000"
          />
          <InlineField label="E-mail" value={c.client_email ?? ""} onSave={save("client_email")} />
          <InlineField
            label="Parte contrária"
            value={c.opposing_party ?? ""}
            onSave={save("opposing_party")}
          />
          <InlineField
            label="Número do processo"
            mono
            value={c.case_number}
            onSave={save("case_number")}
          />
          <InlineField label="Vara / comarca" value={c.court ?? ""} onSave={save("court")} />
          <InlineField
            label="Status atual"
            value={c.status}
            options={CASE_STATUSES}
            onSave={save("status")}
          >
            <StatusBadge status={c.status} />
          </InlineField>
        </div>
      </section>

      <section className="panel mt-6 p-6">
        <h2 className="font-display text-lg text-foreground">Linha do tempo</h2>
        {activity.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Nenhuma atividade registrada neste processo.
          </p>
        ) : (
          <ol className="mt-5 space-y-5">
            {activity.map((a) => (
              <li key={a.id} className="relative flex gap-4 pl-1">
                <span
                  className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", dotClass(a.event_type))}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-numeric text-xs text-muted-foreground">
                      {formatDateTime(a.event_date)}
                    </span>
                    <span className="text-xs uppercase tracking-[0.1em] text-gold">
                      {EVENT_LABELS[a.event_type] ?? a.event_type}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{a.description}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel mb-4 mt-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg text-foreground">Arquivos do caso</h2>
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
            }}
          />
          <Button
            variant="secondary"
            className="gap-1.5"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="size-4" /> {uploading ? "Enviando..." : "Enviar arquivo"}
          </Button>
        </div>
        {files.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum arquivo neste processo.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 py-3">
                {f.file_kind === "gerado_pela_aurora" ? (
                  <Sparkles className="size-4 text-teal" />
                ) : (
                  <FileText className="size-4 text-gold" />
                )}
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm text-foreground hover:text-gold-light"
                  onClick={() => void openFile(f.file_url)}
                >
                  {f.file_name}
                </button>
                <span className="text-xs text-muted-foreground">
                  {f.file_kind === "gerado_pela_aurora"
                    ? "Gerado pela Aurora"
                    : "Enviado pelo advogado"}
                </span>
                <span className="text-numeric text-xs text-muted-foreground">
                  {formatDate(f.uploaded_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Wrapper>
  );
}

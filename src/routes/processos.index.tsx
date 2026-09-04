import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { NewCaseDialog } from "@/components/aurora/NewCaseDialog";
import { ImportCaseDialog } from "@/components/aurora/ImportCaseDialog";
import { StatusBadge } from "@/components/aurora/StatusBadge";
import { Input } from "@/components/ui/input";
import { casesQueryOptions, type CaseRow } from "@/lib/cases";

export const Route = createFileRoute("/processos/")({
  head: () => ({
    meta: [
      { title: "Processos — Aurora" },
      {
        name: "description",
        content:
          "Busque, cadastre e acompanhe todos os processos do escritório: clientes, prazos e documentos.",
      },
      { property: "og:title", content: "Processos — Aurora" },
      {
        property: "og:description",
        content: "Busque, cadastre e acompanhe todos os processos do escritório na Aurora.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(casesQueryOptions());
  },
  errorComponent: ({ error }) => (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <p role="alert" className="panel p-6 text-sm text-urgent">
        Não foi possível carregar os processos: {error.message}
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">Nenhum processo encontrado.</div>
  ),
  component: ProcessosList,
});

function matches(c: CaseRow, term: string) {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return [c.case_number, c.client_name, c.client_phone, c.case_type]
    .filter(Boolean)
    .some((v) => (v as string).toLowerCase().includes(t));
}

function ProcessosList() {
  const { data: cases } = useSuspenseQuery(casesQueryOptions());
  const [term, setTerm] = useState("");
  const filtered = useMemo(() => cases.filter((c) => matches(c, term)), [cases, term]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-foreground">Processos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {cases.length} processo{cases.length === 1 ? "" : "s"} cadastrado
            {cases.length === 1 ? "" : "s"} no escritório.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCaseDialog />
          <NewCaseDialog />
        </div>
      </header>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por número, nome do cliente, telefone ou tipo de caso..."
          aria-label="Buscar processos"
          className="h-12 bg-surface pl-10"
        />
      </div>

      <div className="mt-6 space-y-3">
        {filtered.length === 0 && (
          <div className="panel flex min-h-[220px] flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {cases.length === 0
                ? "Nenhum processo cadastrado ainda."
                : "Nenhum processo corresponde à busca."}
            </p>
          </div>
        )}

        {filtered.map((c) => (
          <Link
            key={c.id}
            to="/processos/$caseId"
            params={{ caseId: c.id }}
            className="panel block p-5 transition-colors hover:border-gold/50 hover:bg-surface-alt"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg text-foreground">
                  {c.client_name}
                  {c.opposing_party ? (
                    <span className="text-muted-foreground"> vs. {c.opposing_party}</span>
                  ) : null}
                </h2>
                <p className="text-numeric mt-1 text-xs text-muted-foreground">{c.case_number}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.court || "Vara não informada"}
                  {c.case_type ? ` · ${c.case_type}` : ""}
                </p>
              </div>
              <StatusBadge status={c.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

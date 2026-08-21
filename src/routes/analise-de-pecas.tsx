import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Download,
  FileDown,
  FileText,
  Loader2,
  ScanSearch,
  ShieldQuestion,
  Sparkles,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { auroraAnalyze } from "@/lib/ai.functions";
import { casesQueryOptions, type CaseRow } from "@/lib/cases";
import { consumeCredit } from "@/lib/credits";
import {
  downloadBlob,
  extractPdfText,
  slugify,
  textToDocBlob,
  textToPdfBlob,
} from "@/lib/documents";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analise-de-pecas")({
  head: () => ({
    meta: [
      { title: "Análise de Peças — Aurora" },
      {
        name: "description",
        content:
          "Resumo, raio-x e sugestões estratégicas de peças e processos com inteligência artificial na Aurora.",
      },
      { property: "og:title", content: "Análise de Peças — Aurora" },
      {
        property: "og:description",
        content: "Raio-x de peças, pontos fortes e fracos e minutas geradas pela Aurora.",
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
        Não foi possível abrir a Análise de Peças: {error.message}
      </p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">Nada por aqui.</div>
  ),
  component: AnaliseDePecas,
});

type Mode = "processo_completo" | "processo_mais_peca" | "so_peca";
type Point = { tipo: "forte" | "fraco"; texto: string };
type DraftKind = "contestacao" | "reforco" | "recurso";

const MODE_LABELS: Record<Mode, string> = {
  processo_completo: "Processo completo",
  processo_mais_peca: "Processo + peça em andamento",
  so_peca: "Só a peça",
};

const DRAFT_LABELS: Record<DraftKind, string> = {
  contestacao: "Contestação completa",
  reforco: "Parágrafo de reforço",
  recurso: "Estratégia de recurso",
};

function parsePoints(raw: string): Point[] {
  const json = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(json) as { pontos?: Point[] } | Point[];
    const list = Array.isArray(parsed) ? parsed : (parsed.pontos ?? []);
    return list
      .filter((p) => p && typeof p.texto === "string")
      .map((p) => ({ tipo: p.tipo === "forte" ? "forte" : "fraco", texto: p.texto }));
  } catch {
    return [];
  }
}

/** Renderiza o texto destacando citações "Fonte: ..." como link. */
function RichText({ value }: { value: string }) {
  return (
    <div className="space-y-3">
      {value.split(/\n{1,}/).map((line, i) => {
        const source = line.match(/^\s*Fonte:\s*(.+)$/i);
        if (source) {
          return (
            <a
              key={i}
              href={`https://www.google.com/search?q=${encodeURIComponent(source[1] ?? "")}`}
              target="_blank"
              rel="noreferrer"
              className="text-numeric block text-xs text-teal underline decoration-dotted"
            >
              Fonte: {source[1]} →
            </a>
          );
        }
        return (
          <p key={i} className="font-display text-[15px] italic leading-relaxed text-foreground">
            {line}
          </p>
        );
      })}
    </div>
  );
}

function AnaliseDePecas() {
  const queryClient = useQueryClient();
  const { data: cases } = useSuspenseQuery(casesQueryOptions());
  const analyze = useServerFn(auroraAnalyze);

  const [mode, setMode] = useState<Mode>("processo_completo");
  const [caseId, setCaseId] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [fileText, setFileText] = useState("");
  const [pieceText, setPieceText] = useState("");
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [judgeName, setJudgeName] = useState("");
  const [lawyerName, setLawyerName] = useState("");
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [profileContext, setProfileContext] = useState("");

  const [summary, setSummary] = useState("");
  const [points, setPoints] = useState<Point[]>([]);
  const [draftKind, setDraftKind] = useState<DraftKind | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === caseId) ?? null,
    [cases, caseId],
  );

  const needsCase = mode !== "so_peca";
  const needsAuthorization =
    needsCase && !!selectedCase && (!!judgeName.trim() || !!lawyerName.trim()) && authorized === null;

  const weakPoints = points.filter((p) => p.tipo === "fraco");

  function resetCase(id: string) {
    setCaseId(id);
    setAuthorized(null);
    setProfileContext("");
    const next = cases.find((c) => c.id === id);
    setLawyerName(next?.opposing_party ?? "");
    setJudgeName("");
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    setReading(true);
    try {
      const text = file.type === "application/pdf" ? await extractPdfText(file) : await file.text();
      if (!text.trim()) throw new Error("Não encontramos texto legível neste arquivo.");
      setFileText(text);
      setFileName(file.name);
      if (caseId) {
        const path = `${caseId}/${Date.now()}-${slugify(file.name)}`;
        const { error } = await supabase.storage.from("case-files").upload(path, file);
        if (!error) {
          await supabase.from("case_files").insert({
            case_id: caseId,
            file_name: file.name,
            file_kind: "enviado_pelo_advogado",
            file_url: path,
          });
          void queryClient.invalidateQueries({ queryKey: ["case_files", caseId] });
        }
      }
      toast.success("Arquivo lido", { description: file.name });
    } catch (e) {
      toast.error("Não foi possível ler o arquivo", { description: (e as Error).message });
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function buildContent(): string {
    const blocks: string[] = [];
    if (selectedCase && needsCase) {
      const c: CaseRow = selectedCase;
      blocks.push(
        [
          `Processo nº ${c.case_number}`,
          `Cliente: ${c.client_name}`,
          `Parte contrária: ${c.opposing_party ?? "não informada"}`,
          `Vara/Comarca: ${c.court ?? "não informada"}`,
          `Tipo de caso: ${c.case_type ?? "não informado"}`,
          `Status: ${c.status}`,
          c.summary ? `Resumo salvo: ${c.summary}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
    if (judgeName.trim()) blocks.push(`Juiz(a): ${judgeName.trim()}`);
    if (lawyerName.trim()) blocks.push(`Advogado adversário: ${lawyerName.trim()}`);
    if (fileText) blocks.push(`Documento anexado (${fileName}):\n${fileText}`);
    if (pieceText.trim()) blocks.push(`Peça / texto informado:\n${pieceText.trim()}`);
    return blocks.join("\n\n").slice(0, 110000);
  }

  async function authorizeProfiles(ok: boolean) {
    setAuthorized(ok);
    await supabase.from("authorization_log").insert({
      case_id: caseId || null,
      judge_name: judgeName.trim() || null,
      opposing_lawyer_name: lawyerName.trim() || null,
      authorized: ok,
    });
    if (!ok) {
      setProfileContext("");
      toast.info("Seguimos sem o perfil comportamental.");
      return;
    }
    const names = [judgeName.trim(), lawyerName.trim()].filter(Boolean);
    const { data } = await supabase
      .from("legal_profiles")
      .select("name, profile_type, court, grant_rate, avg_decision_days, decisions_analyzed, behavior_summary")
      .in("name", names);
    const context = (data ?? [])
      .map(
        (p) =>
          `${p.profile_type === "juiz" ? "Juiz(a)" : "Advogado(a)"} ${p.name}${
            p.court ? ` (${p.court})` : ""
          }: taxa de deferimento ${p.grant_rate ?? "n/d"}, tempo médio ${
            p.avg_decision_days ?? "n/d"
          } dias, ${p.decisions_analyzed} decisões analisadas. ${p.behavior_summary}`,
      )
      .join("\n");
    setProfileContext(context);
    toast.success("Autorizado", {
      description: context
        ? "Perfil comportamental salvo será usado na análise."
        : "Ainda não há perfil salvo desses nomes — seguiremos só com o processo.",
    });
  }

  async function persist(kind: string, title: string, text: string, analysisMode: Mode) {
    await supabase.from("piece_analysis").insert({
      case_id: caseId || null,
      mode: analysisMode,
      input_text: buildContent().slice(0, 20000),
      analysis_result: kind === "raiox" || kind === "resumo" ? text : "",
      suggestions: kind === "raiox" || kind === "resumo" ? "" : text,
    });
    if (!caseId) return;
    await supabase.from("case_activity").insert({
      case_id: caseId,
      event_type: "peca_analisada",
      description: `${title} gerado pela Aurora.`,
    });
    const path = `${caseId}/${Date.now()}-${slugify(title)}.txt`;
    const { error } = await supabase.storage
      .from("case-files")
      .upload(path, new Blob([text], { type: "text/plain" }));
    if (!error) {
      await supabase.from("case_files").insert({
        case_id: caseId,
        file_name: `${title}.txt`,
        file_kind: "gerado_pela_aurora",
        file_url: path,
      });
    }
    void queryClient.invalidateQueries({ queryKey: ["case_activity", caseId] });
    void queryClient.invalidateQueries({ queryKey: ["case_files", caseId] });
  }

  async function run(
    task: "resumo" | "raiox" | DraftKind,
    title: string,
  ): Promise<void> {
    const content = buildContent();
    if (!content.trim()) {
      toast.error("Falta material", {
        description: needsCase
          ? "Selecione um processo ou envie um arquivo."
          : "Cole o texto da peça ou envie um arquivo.",
      });
      return;
    }
    if (needsAuthorization) {
      toast.error("Responda a autorização acima antes de analisar.");
      return;
    }
    const credit = await consumeCredit();
    if (!credit?.ok) return;
    void queryClient.invalidateQueries({ queryKey: ["account_settings"] });

    setBusy(task);
    try {
      const { text } = await analyze({
        data: {
          task,
          content,
          ...(weakPoints.length
            ? { weakPoints: weakPoints.map((p) => `- ${p.texto}`).join("\n") }
            : {}),
          ...(authorized && profileContext ? { profileContext } : {}),
        },
      });
      if (task === "resumo") {
        setSummary(text);
      } else if (task === "raiox") {
        const parsed = parsePoints(text);
        if (!parsed.length) throw new Error("A IA não retornou pontos estruturados. Tente novamente.");
        setPoints(parsed);
      } else {
        setDraftKind(task);
        setDraft(text);
      }
      await persist(task, title, text, mode);
      toast.success(`${title} pronto`, { description: "Rascunho — revise antes de usar." });
    } catch (e) {
      toast.error("A análise falhou", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const exportName = `aurora-${slugify(draftKind ? DRAFT_LABELS[draftKind] : "rascunho")}`;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header>
        <h1 className="font-display text-3xl text-foreground">Análise de Peças</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Resumo em linguagem simples, raio-x de pontos fortes e fracos e minutas estratégicas —
          sempre como rascunho para sua revisão.
        </p>
      </header>

      <Tabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as Mode);
          setPoints([]);
          setSummary("");
          setDraft("");
          setDraftKind(null);
        }}
        className="mt-8"
      >
        <TabsList className="bg-surface-alt">
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
            <TabsTrigger key={m} value={m}>
              {MODE_LABELS[m]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <section className="panel mt-6 space-y-5 p-6">
        {needsCase && (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                Processo cadastrado
              </Label>
              <Select value={caseId} onValueChange={resetCase}>
                <SelectTrigger className="mt-1.5 bg-surface-alt">
                  <SelectValue placeholder="Selecione um processo..." />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.client_name} — {c.case_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Juiz(a)
                </Label>
                <Input
                  className="mt-1.5 bg-surface-alt"
                  value={judgeName}
                  onChange={(e) => {
                    setJudgeName(e.target.value);
                    setAuthorized(null);
                  }}
                  placeholder="Nome do juiz"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Advogado adversário
                </Label>
                <Input
                  className="mt-1.5 bg-surface-alt"
                  value={lawyerName}
                  onChange={(e) => {
                    setLawyerName(e.target.value);
                    setAuthorized(null);
                  }}
                  placeholder="Nome do advogado"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,text/plain"
            className="hidden"
            onChange={(e) => void onPickFile(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={reading}
          >
            {reading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            {mode === "so_peca" ? "Enviar peça (PDF)" : "Enviar PDF do processo"}
          </Button>
          {fileName && (
            <span className="text-numeric inline-flex items-center gap-2 text-xs text-teal">
              <FileText className="size-3.5" /> {fileName}
            </span>
          )}
        </div>

        {mode !== "processo_completo" && (
          <div>
            <Label className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {mode === "so_peca" ? "Texto da peça" : "Peça em andamento"}
            </Label>
            <Textarea
              value={pieceText}
              onChange={(e) => setPieceText(e.target.value)}
              placeholder="Cole aqui o texto da peça..."
              className="mt-1.5 min-h-[160px] bg-surface-alt"
            />
          </div>
        )}

        {needsAuthorization && (
          <div className="rounded-lg border border-primary/40 bg-surface-alt p-5">
            <div className="flex items-start gap-3">
              <ShieldQuestion className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-display text-[15px] text-foreground">
                  A Aurora identificou{" "}
                  <strong className="text-gold-light">{judgeName || "—"}</strong> e{" "}
                  <strong className="text-gold-light">{lawyerName || "—"}</strong> neste processo.
                  Podemos analisar o comportamento deles para enriquecer sua estratégia?
                </p>
                <div className="mt-4 flex gap-3">
                  <Button onClick={() => void authorizeProfiles(true)}>Sim, autorizar</Button>
                  <Button variant="ghost" onClick={() => void authorizeProfiles(false)}>
                    Agora não
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-border pt-5">
          {mode === "processo_completo" && (
            <Button disabled={busy !== null} onClick={() => void run("resumo", "Resumo do processo")}>
              {busy === "resumo" ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              Gerar resumo
            </Button>
          )}
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => void run("raiox", "Raio-X do caso")}
          >
            {busy === "raiox" ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ScanSearch className="mr-2 size-4" />
            )}
            Analisar (Raio-X)
          </Button>
          <span className="self-center text-xs text-muted-foreground">
            Cada análise consome 1 crédito.
          </span>
        </div>
      </section>

      {summary && (
        <section className="panel mt-6 p-6">
          <h2 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Resumo do processo
          </h2>
          <div className="mt-4">
            <RichText value={summary} />
          </div>
        </section>
      )}

      {points.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Raio-X — pontos fortes e fracos
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {points.map((p, i) => (
              <article
                key={i}
                className={cn(
                  "rounded-xl border bg-surface p-5 text-sm leading-relaxed text-foreground",
                  p.tipo === "forte" ? "border-teal/60" : "border-urgent/60",
                )}
              >
                <p
                  className={cn(
                    "text-numeric mb-2 text-[11px] uppercase tracking-[0.18em]",
                    p.tipo === "forte" ? "text-teal" : "text-urgent",
                  )}
                >
                  {p.tipo === "forte" ? "Ponto forte" : "Ponto fraco / brecha"}
                </p>
                {p.texto}
              </article>
            ))}
          </div>
        </section>
      )}

      {(points.length > 0 || summary) && (
        <section className="panel mt-6 p-6">
          <h2 className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Sugestões estratégicas
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {(Object.keys(DRAFT_LABELS) as DraftKind[]).map((k) => (
              <Button
                key={k}
                variant="outline"
                disabled={busy !== null}
                onClick={() => void run(k, DRAFT_LABELS[k])}
              >
                {busy === k ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                Sugerir {DRAFT_LABELS[k].toLowerCase()}
              </Button>
            ))}
          </div>

          {draft && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-numeric rounded-full border border-urgent/60 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-urgent">
                  rascunho — revise antes de usar
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () =>
                      downloadBlob(
                        await textToPdfBlob(
                          draftKind ? DRAFT_LABELS[draftKind] : "Rascunho Aurora",
                          draft,
                        ),
                        `${exportName}.pdf`,
                      )
                    }
                  >
                    <FileDown className="mr-2 size-4" /> Baixar PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      downloadBlob(
                        textToDocBlob(
                          draftKind ? DRAFT_LABELS[draftKind] : "Rascunho Aurora",
                          draft,
                        ),
                        `${exportName}.doc`,
                      )
                    }
                  >
                    <Download className="mr-2 size-4" /> Baixar DOC
                  </Button>
                </div>
              </div>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Texto gerado, editável"
                className="font-display mt-3 min-h-[420px] bg-surface-alt text-[15px] italic leading-relaxed"
              />
              <div className="mt-3 space-y-1">
                {draft
                  .split("\n")
                  .filter((l) => /^\s*Fonte:/i.test(l))
                  .map((l, i) => (
                    <a
                      key={i}
                      href={`https://www.google.com/search?q=${encodeURIComponent(l.replace(/^\s*Fonte:\s*/i, ""))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-numeric block text-xs text-teal underline decoration-dotted"
                    >
                      {l.trim()} →
                    </a>
                  ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

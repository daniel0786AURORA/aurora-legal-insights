import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/aurora/PageShell";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, UploadCloud, Loader2, Save, RefreshCw } from "lucide-react";
import { auroraAnalyze } from "@/lib/ai.functions";
import { extractPdfText } from "@/lib/documents";
import { uploadCaseDocument } from "@/lib/uploadCaseDocument";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Radar Preditivo — Aurora" },
      { name: "description", content: "Perfis estratégicos de juízes e advogados." },
    ],
  }),
  component: RadarPreditivo,
});

function RadarPreditivo() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"judge" | "lawyer">("judge");
  const [searchJudge, setSearchJudge] = useState("");
  const [searchLawyer, setSearchLawyer] = useState("");

  const { data: judges = [], isLoading: loadingJudges } = useQuery({
    queryKey: ["judges-profiles", searchJudge],
    queryFn: async () => {
      let q = supabase.from("judge_profiles").select("*").order("created_at", { ascending: false });
      if (searchJudge) q = q.ilike("nome_juiz", `%${searchJudge}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: lawyers = [], isLoading: loadingLawyers } = useQuery({
    queryKey: ["lawyers-profiles", searchLawyer],
    queryFn: async () => {
      let q = supabase
        .from("lawyer_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (searchLawyer) q = q.ilike("nome_advogado", `%${searchLawyer}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ["predictive-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("predictive_analysis_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageShell
      title="Radar Preditivo"
      subtitle="Base de conhecimento estratégico sobre perfis de juízes e advogados."
    >
      <div className="flex flex-col gap-8 pb-10">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "judge" | "lawyer")}
          className="w-full"
        >
          <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="judge">Juízes</TabsTrigger>
            <TabsTrigger value="lawyer">Advogados</TabsTrigger>
          </TabsList>

          <TabsContent value="judge" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar juiz por nome..."
                  value={searchJudge}
                  onChange={(e) => setSearchJudge(e.target.value)}
                  className="pl-9"
                />
              </div>
              <NewProfileDialog type="judge" />
            </div>

            {loadingJudges ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-64 rounded-xl bg-surface/50" />
                <Skeleton className="h-64 rounded-xl bg-surface/50" />
              </div>
            ) : judges.length === 0 ? (
              <div className="panel flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <p>Nenhum perfil de juiz encontrado.</p>
                <p className="text-sm">
                  Clique em "+ Novo Perfil de Juiz" para adicionar o primeiro.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {judges.map((j) => (
                  <ProfileCard key={j.id} profile={j} type="judge" onSaveHistory={refetchHistory} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="lawyer" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar advogado por nome..."
                  value={searchLawyer}
                  onChange={(e) => setSearchLawyer(e.target.value)}
                  className="pl-9"
                />
              </div>
              <NewProfileDialog type="lawyer" />
            </div>

            {loadingLawyers ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-64 rounded-xl bg-surface/50" />
                <Skeleton className="h-64 rounded-xl bg-surface/50" />
              </div>
            ) : lawyers.length === 0 ? (
              <div className="panel flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <p>Nenhum perfil de advogado encontrado.</p>
                <p className="text-sm">
                  Clique em "+ Novo Perfil de Advogado" para adicionar o primeiro.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {lawyers.map((l) => (
                  <ProfileCard
                    key={l.id}
                    profile={l}
                    type="lawyer"
                    onSaveHistory={refetchHistory}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <section className="panel p-6 mt-8">
          <h2 className="mb-4 font-display text-lg">Últimas 5 Análises Salvas</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Data</TableHead>
                  <TableHead>Alvo da Análise</TableHead>
                  <TableHead>Confiabilidade Extraída</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow className="border-none hover:bg-transparent">
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Nenhum histórico salvo.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((h) => {
                    const data = (h.extracted_data as Record<string, string>) || {};
                    const nome = data.nome_juiz || data.nome_advogado || "Desconhecido";
                    const conf = data.confiabilidade_extracao || "N/A";
                    return (
                      <TableRow key={h.id} className="border-border">
                        <TableCell className="text-numeric">
                          {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">{nome}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              conf === "alta"
                                ? "bg-teal/10 text-teal"
                                : conf === "media"
                                  ? "bg-gold/10 text-gold"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {conf.toUpperCase()}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function ProfileCard({
  profile,
  type,
  onSaveHistory,
}: {
  profile: Record<string, unknown>;
  type: "judge" | "lawyer";
  onSaveHistory: () => void;
}) {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const saveAnalysis = async () => {
    try {
      setIsUpdating(true);
      const payload = {
        judge_profile_id: type === "judge" ? profile.id : null,
        lawyer_profile_id: type === "lawyer" ? profile.id : null,
        extracted_data: profile,
      };

      const { error } = await supabase.from("predictive_analysis_history").insert(payload);
      if (error) throw error;
      toast.success("Análise salva no histórico!");
      onSaveHistory();
    } catch (e: unknown) {
      toast.error("Erro ao salvar análise: " + (e as Error).message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="panel bg-surface border-border p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-display text-lg line-clamp-1">
          {type === "judge" ? profile.nome_juiz : profile.nome_advogado}
        </h3>
        <span className="text-xs text-muted-foreground">
          {type === "judge" ? "Magistrado" : "Advogado"}
        </span>
      </div>

      <div className="flex-1 space-y-3 text-sm">
        {type === "judge" ? (
          <>
            <div>
              <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                Taxa de Liminares
              </span>
              <span>
                {profile.taxa_liminar_concedida === true
                  ? "Alta concessão"
                  : profile.taxa_liminar_concedida === false
                    ? "Baixa concessão"
                    : "Não identificado"}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                Artigos Mais Citados
              </span>
              <span className="line-clamp-2">
                {profile.artigos_mais_citados?.join(", ") || "N/A"}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                Padrão em Negativas
              </span>
              <span className="line-clamp-3 text-muted-foreground">
                {profile.fundamentacao_recorte_negativas || "N/A"}
              </span>
            </div>
          </>
        ) : (
          <>
            <div>
              <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                Estratégia Comum
              </span>
              <span className="line-clamp-2 text-muted-foreground">
                {profile.estrategia_comum || "N/A"}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                Tom das Petições
              </span>
              <span className="capitalize">{profile.tom_peticoes || "N/A"}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-muted-foreground">
                Pontos Fracos
              </span>
              <span className="line-clamp-2 text-muted-foreground">
                {profile.pontos_fracos_identificados || "N/A"}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 pt-4 border-t border-border/50 flex gap-2">
        <Button
          variant="outline"
          className="w-full text-xs"
          onClick={saveAnalysis}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <Loader2 className="size-3 mr-1 animate-spin" />
          ) : (
            <Save className="size-3 mr-1" />
          )}
          Atualizar análise
        </Button>
      </div>
    </Card>
  );
}

function NewProfileDialog({ type }: { type: "judge" | "lawyer" }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"name" | "upload" | "loading" | "form">("name");
  const [file, setFile] = useState<File | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [extractedData, setExtractedData] = useState<Record<string, unknown> | null>(null);

  const queryClient = useQueryClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStep("loading");

    try {
      let text = "";
      if (f.type === "application/pdf") {
        text = await extractPdfText(f);
      } else {
        text = await f.text();
      }

      if (!text || text.trim().length === 0) {
        throw new Error("Não foi possível extrair texto do arquivo.");
      }

      const taskName = type === "judge" ? "extrair_perfil_juiz" : "extrair_perfil_advogado";

      const res = await auroraAnalyze({
        data: {
          task: taskName,
          content: `NOME INFORMADO: ${nameInput}\n\n` + text.slice(0, 30000),
        },
      });

      const parsed = JSON.parse(res.text);

      if (type === "judge") {
        parsed.nome_juiz = parsed.nome_juiz || nameInput;
      } else {
        parsed.nome_advogado = parsed.nome_advogado || nameInput;
      }

      setExtractedData(parsed);
      setStep("form");
      toast.success("Dados do perfil extraídos com sucesso.");
    } catch (err: unknown) {
      console.error(err);
      toast.error((err as Error).message || "Falha ao extrair dados.");
      setStep("form");
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      const table = type === "judge" ? "judge_profiles" : "lawyer_profiles";

      let payload = { ...extractedData };
      if (!payload) {
        payload = type === "judge" ? { nome_juiz: nameInput } : { nome_advogado: nameInput };
      }

      const { data, error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [type === "judge" ? "judges-profiles" : "lawyers-profiles"],
      });
      toast.success("Perfil salvo com sucesso!");
      reset();
    },
    onError: (err: Error) => toast.error((err as Error).message),
  });

  const reset = () => {
    setStep("name");
    setFile(null);
    setNameInput("");
    setExtractedData(null);
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="size-4" /> Novo Perfil {type === "judge" ? "de Juiz" : "de Advogado"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            Novo Perfil de {type === "judge" ? "Juiz" : "Advogado"}
          </DialogTitle>
          <DialogDescription>
            {step === "name" && "Insira o nome para continuar."}
            {step === "upload" && "Envie uma sentença ou petição para análise do perfil."}
            {step === "loading" && "Extraindo informações de perfil..."}
            {step === "form" && "Revise as informações antes de salvar."}
          </DialogDescription>
        </DialogHeader>

        {step === "name" && (
          <div className="grid gap-4 py-4">
            <Label>Nome do {type === "judge" ? "Juiz" : "Advogado"}</Label>
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={`Ex: ${type === "judge" ? "Sérgio Moro" : "Márcio Thomaz Bastos"}`}
            />
            <Button onClick={() => setStep("upload")} disabled={!nameInput.trim()}>
              Continuar
            </Button>
          </div>
        )}

        {step === "upload" && (
          <div className="flex h-40 w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-border/60 bg-surface/50 transition-colors hover:bg-surface">
            <Label
              htmlFor="profile-upload"
              className="flex cursor-pointer flex-col items-center gap-2 p-6 text-muted-foreground hover:text-foreground"
            >
              <UploadCloud className="size-8" />
              <span className="text-sm font-medium text-center">
                Selecionar documento (PDF/TXT) para extrair o comportamento
              </span>
            </Label>
            <Input
              id="profile-upload"
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
            <p className="text-sm">Analisando documento e traçando perfil...</p>
          </div>
        )}

        {step === "form" && (
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-auto">
            {type === "judge" ? (
              <>
                <div className="grid gap-2">
                  <Label>Nome do Juiz</Label>
                  <Input
                    value={extractedData?.nome_juiz || ""}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, nome_juiz: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Concede liminares frequentemente?</Label>
                  <Input
                    value={
                      extractedData?.taxa_liminar_concedida === true
                        ? "Sim"
                        : extractedData?.taxa_liminar_concedida === false
                          ? "Não"
                          : ""
                    }
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        taxa_liminar_concedida: e.target.value === "Sim",
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Artigos Mais Citados (separados por vírgula)</Label>
                  <Input
                    value={extractedData?.artigos_mais_citados?.join(", ") || ""}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        artigos_mais_citados: e.target.value.split(","),
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Fundamentação em Negativas</Label>
                  <Input
                    value={extractedData?.fundamentacao_recorte_negativas || ""}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        fundamentacao_recorte_negativas: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label>Nome do Advogado</Label>
                  <Input
                    value={extractedData?.nome_advogado || ""}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, nome_advogado: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Estratégia Comum</Label>
                  <Input
                    value={extractedData?.estrategia_comum || ""}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, estrategia_comum: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Jurisprudência Favorita</Label>
                  <Input
                    value={extractedData?.jurisprudencia_favorita?.join(", ") || ""}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        jurisprudencia_favorita: e.target.value.split(","),
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tom das Petições</Label>
                  <Input
                    value={extractedData?.tom_peticoes || ""}
                    onChange={(e) =>
                      setExtractedData({ ...extractedData, tom_peticoes: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Pontos Fracos</Label>
                  <Input
                    value={extractedData?.pontos_fracos_identificados || ""}
                    onChange={(e) =>
                      setExtractedData({
                        ...extractedData,
                        pontos_fracos_identificados: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={reset}>
                Cancelar
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

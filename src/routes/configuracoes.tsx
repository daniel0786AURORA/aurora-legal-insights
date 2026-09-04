import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, CreditCard, Pencil, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/aurora/PageShell";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { accountSettingsQueryKey, useAccountSettings } from "@/hooks/use-account-settings";
import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Aurora | Escritório, plano e créditos" },
      {
        name: "description",
        content:
          "Edite os dados do escritório e da OAB, acompanhe o consumo de créditos do mês, troque de plano e gerencie pagamento na Aurora.",
      },
      { property: "og:title", content: "Configurações — Aurora | Escritório, plano e créditos" },
      {
        property: "og:description",
        content: "Perfil do escritório, plano atual, créditos do mês e formas de pagamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Configuracoes,
});

const PLANS = [
  { id: "essencial", name: "Essential", detail: "30 créditos por mês" },
  { id: "pro", name: "Pro", detail: "100 créditos por mês" },
  { id: "elite", name: "Elite", detail: "300 créditos por mês" },
] as const;

const CREDIT_PACKS = [10, 30, 50] as const;

function Configuracoes() {
  const { data: settings } = useAccountSettings();
  const queryClient = useQueryClient();

  const [planOpen, setPlanOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("essencial");
  const [selectedPack, setSelectedPack] = useState<number>(10);

  useEffect(() => {
    if (settings?.plan) setSelectedPlan(settings.plan);
  }, [settings?.plan]);

  const update = useMutation({
    mutationFn: async (patch: TablesUpdate<"account_settings">) => {
      if (!settings) throw new Error("Configurações ainda não carregadas.");
      const { error } = await supabase.from("account_settings").update(patch).eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountSettingsQueryKey });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const used = settings?.credits_used_month ?? 0;
  const total = settings?.credits_total_month ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const overload = pct > 70;
  const currentPlan = PLANS.find((p) => p.id === (settings?.plan ?? "").toLowerCase());

  return (
    <PageShell
      title="Configurações"
      subtitle="Dados do escritório, plano, créditos e forma de pagamento."
    >
      <Tabs defaultValue="plano">
        <TabsList className="bg-surface-alt">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="plano">Plano &amp; Créditos</TabsTrigger>
          <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-6">
          <div className="panel max-w-xl space-y-5 p-6">
            <EditableRow
              label="Nome do escritório"
              value={settings?.firm_name ?? ""}
              placeholder="Ex.: Silva & Associados"
              onSave={async (v) => await update.mutateAsync({ firm_name: v })}
            />
            <EditableRow
              label="OAB"
              value={settings?.oab ?? ""}
              mono
              placeholder="Ex.: OAB/SP 123.456"
              onSave={async (v) => await update.mutateAsync({ oab: v })}
            />
          </div>
        </TabsContent>

        <TabsContent value="plano" className="mt-6 space-y-6">
          <div className="panel p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Plano atual</p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <h2 className="font-display text-3xl text-gold">
                {currentPlan?.name ?? (settings?.plan || "—")}
              </h2>
              {currentPlan && (
                <span className="text-sm text-muted-foreground">{currentPlan.detail}</span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => setPlanOpen(true)}
              >
                Trocar plano
              </Button>
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Créditos do mês
                </p>
                <p className="text-numeric mt-2 text-3xl text-foreground">
                  {used}/{total}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setCreditsOpen(true)}
              >
                <Plus className="size-4" /> Comprar créditos avulsos
              </Button>
            </div>
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-surface-alt">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  overload ? "bg-urgent" : "bg-gold",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-numeric mt-3 text-xs text-muted-foreground">
              {pct}% do pacote utilizado · renovação todo dia {settings?.renewal_day ?? "—"} do mês
            </p>
          </div>
        </TabsContent>

        <TabsContent value="pagamento" className="mt-6">
          <div className="panel max-w-xl p-6">
            <p className="text-sm text-muted-foreground">
              Nenhuma forma de pagamento cadastrada ainda
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="mt-4 inline-block">
                  <Button disabled variant="outline" className="gap-1.5">
                    <CreditCard className="size-4" /> Adicionar cartão
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Em breve</TooltipContent>
            </Tooltip>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Trocar plano</DialogTitle>
            <DialogDescription>
              A cobrança ainda não é processada — apenas registramos o plano escolhido.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {PLANS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlan(p.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  selectedPlan === p.id
                    ? "border-gold bg-gold/10"
                    : "border-border bg-surface-alt hover:border-gold/50",
                )}
              >
                <p className="font-display text-lg text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.detail}</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              disabled={update.isPending}
              onClick={() => {
                update.mutate(
                  { plan: selectedPlan },
                  {
                    onSuccess: () => {
                      toast.success("Plano atualizado");
                      setPlanOpen(false);
                    },
                  },
                );
              }}
            >
              Confirmar plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creditsOpen} onOpenChange={setCreditsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Comprar créditos avulsos</DialogTitle>
            <DialogDescription>
              Os créditos são somados ao seu pacote do mês (sem cobrança por enquanto).
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3">
            {CREDIT_PACKS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSelectedPack(n)}
                className={cn(
                  "text-numeric rounded-xl border p-4 text-center text-lg transition-colors",
                  selectedPack === n
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-border bg-surface-alt text-foreground hover:border-gold/50",
                )}
              >
                +{n}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              disabled={update.isPending}
              onClick={() => {
                update.mutate(
                  { credits_total_month: total + selectedPack },
                  {
                    onSuccess: () => {
                      toast.success(`+${selectedPack} créditos adicionados`);
                      setCreditsOpen(false);
                    },
                  },
                );
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function EditableRow({
  label,
  value,
  placeholder,
  mono,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  mono?: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft.trim());
      toast.success(`${label} atualizado`);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <Input
            autoFocus
            value={draft}
            placeholder={placeholder}
            className={cn("h-9", mono && "text-numeric")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <Button
            size="icon"
            variant="outline"
            className="size-9 text-teal"
            aria-label="Salvar"
            disabled={saving}
            onClick={() => void save()}
          >
            <Check className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-9 text-muted-foreground"
            aria-label="Cancelar"
            onClick={() => setEditing(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-3">
          <span
            className={cn(
              "text-sm",
              mono && "text-numeric",
              value ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {value || "—"}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs text-gold underline-offset-4 hover:underline"
          >
            <Pencil className="size-3.5" /> editar
          </button>
        </div>
      )}
    </div>
  );
}

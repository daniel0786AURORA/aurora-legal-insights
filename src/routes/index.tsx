import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { PageShell } from "@/components/aurora/PageShell";
import { DeadlineDialog } from "@/components/aurora/DeadlineDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAccountSettings } from "@/hooks/use-account-settings";
import { daysUntil, formatDate } from "@/lib/cases";
import {
  dashboardStatsQueryOptions,
  daysTone,
  localDayKey,
  monthDeadlinesQueryOptions,
  priorityTone,
  toneClasses,
  upcomingDeadlinesQueryOptions,
  type DeadlineFull,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Aurora | Prazos e agenda jurídica" },
      {
        name: "description",
        content:
          "Painel inicial da Aurora: processos ativos, prazos da semana, créditos e calendário de compromissos do escritório.",
      },
      { property: "og:title", content: "Início — Aurora | Prazos e agenda jurídica" },
      {
        property: "og:description",
        content: "Visão geral do escritório: processos, prazos próximos, créditos e agenda do mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Inicio,
});

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function Inicio() {
  const { data: settings } = useAccountSettings();
  const { data: stats } = useQuery(dashboardStatsQueryOptions());
  const { data: upcoming = [] } = useQuery(upcomingDeadlinesQueryOptions());

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const { data: monthDeadlines = [] } = useQuery(
    monthDeadlinesQueryOptions(cursor.getFullYear(), cursor.getMonth()),
  );

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeadlineFull | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, DeadlineFull[]>();
    for (const d of monthDeadlines) {
      const key = localDayKey(d.due_date);
      map.set(key, [...(map.get(key) ?? []), d]);
    }
    return map;
  }, [monthDeadlines]);

  const firm = settings?.firm_name?.trim();
  const creditsLeft = settings
    ? settings.credits_total_month - settings.credits_used_month
    : null;

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leadingBlanks = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const todayKey = localDayKey(new Date());
  const selectedItems = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  return (
    <PageShell title={`Olá, ${firm || "Advogado(a)"}`} subtitle="Visão geral do seu escritório hoje.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Processos ativos" value={stats?.activeCases ?? 0} />
        <StatCard label="Prazos essa semana" value={stats?.weekDeadlines ?? 0} />
        <StatCard label="Peças analisadas (7 dias)" value={stats?.pieces ?? 0} />
        <StatCard
          label="Créditos disponíveis"
          value={
            settings ? `${creditsLeft}/${settings.credits_total_month}` : "—"
          }
          action={
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => setBuyOpen(true)}>
              <Plus className="size-3" /> Comprar
            </Button>
          }
        />
      </div>

      <section className="panel mt-6 p-6">
        <h2 className="font-display text-xl text-foreground">Prazos mais próximos</h2>
        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nenhum prazo pendente por aqui.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {upcoming.map((d) => {
              const days = daysUntil(d.due_date);
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span
                    className={cn(
                      "text-numeric shrink-0 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.1em]",
                      toneClasses[daysTone(days)],
                    )}
                  >
                    {days <= 0 ? "hoje" : `${days} dia${days > 1 ? "s" : ""}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{d.title}</p>
                    <p className="text-numeric text-xs text-muted-foreground">
                      {formatDate(d.due_date)} · {d.kind}
                    </p>
                  </div>
                  {d.case_id && <ViewCaseButton caseId={d.case_id} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel mt-6 p-6">
        <header className="flex items-center justify-between">
          <h2 className="font-display text-xl capitalize text-foreground">
            {cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </h2>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              aria-label="Mês anterior"
              onClick={() => {
                setSelectedDay(null);
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
              }}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              aria-label="Próximo mês"
              onClick={() => {
                setSelectedDay(null);
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </header>

        <div className="text-numeric mt-5 grid grid-cols-7 gap-1.5 text-center text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`b-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = localDayKey(new Date(cursor.getFullYear(), cursor.getMonth(), day));
            const items = byDay.get(key) ?? [];
            const isSelected = selectedDay === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className={cn(
                  "text-numeric flex min-h-16 flex-col items-center justify-start gap-1.5 rounded-lg border bg-surface-alt/50 p-2 text-sm transition-colors hover:border-gold/50",
                  isSelected ? "border-gold bg-gold/10 text-gold" : "border-border text-foreground",
                  key === todayKey && !isSelected && "border-teal/50",
                )}
              >
                <span>{day}</span>
                {items.length > 0 && (
                  <span className="flex flex-wrap justify-center gap-1">
                    {items.slice(0, 3).map((it) => (
                      <span
                        key={it.id}
                        className={cn(
                          "size-1.5 rounded-full",
                          priorityTone(it.priority) === "urgent"
                            ? "bg-urgent"
                            : priorityTone(it.priority) === "gold"
                              ? "bg-gold"
                              : "bg-teal",
                        )}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="mt-5 rounded-xl border border-border bg-surface-alt p-5">
            <p className="text-numeric text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {formatDate(`${selectedDay}T12:00:00`)}
            </p>
            {selectedItems.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhum item neste dia.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {selectedItems.map((it) => (
                  <li key={it.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.1em]",
                        toneClasses[priorityTone(it.priority)],
                      )}
                    >
                      {it.priority}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {it.title}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-gold underline-offset-4 hover:underline"
                      onClick={() => {
                        setEditing(it);
                        setDialogOpen(true);
                      }}
                    >
                      editar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1.5"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" /> Novo compromisso
            </Button>
          </div>
        )}
      </section>

      <DeadlineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={selectedDay ?? undefined}
        deadline={editing}
      />

      <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Em breve</DialogTitle>
            <DialogDescription>
              A compra de créditos adicionais estará disponível em breve.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  action,
}: {
  label: string;
  value: string | number;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-numeric text-3xl text-foreground">{value}</span>
        {action}
      </div>
    </div>
  );
}

function ViewCaseButton({ caseId }: { caseId: string }) {
  const navigate = useNavigate();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate({ to: "/processos/$caseId", params: { caseId } })}
    >
      Ver processo →
    </Button>
  );
}

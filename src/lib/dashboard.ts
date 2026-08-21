import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type DeadlineFull = {
  id: string;
  case_id: string | null;
  title: string;
  due_date: string;
  kind: string;
  priority: string;
  status: string;
};

const DEADLINE_COLUMNS = "id, case_id, title, due_date, kind, priority, status";

export const upcomingDeadlinesQueryOptions = () =>
  queryOptions({
    queryKey: ["deadlines", "upcoming"],
    queryFn: async (): Promise<DeadlineFull[]> => {
      const { data, error } = await supabase
        .from("deadlines")
        .select(DEADLINE_COLUMNS)
        .eq("status", "pendente")
        .gte("due_date", startOfToday().toISOString())
        .order("due_date", { ascending: true })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as DeadlineFull[];
    },
  });

export const monthDeadlinesQueryOptions = (year: number, month: number) =>
  queryOptions({
    queryKey: ["deadlines", "month", year, month],
    queryFn: async (): Promise<DeadlineFull[]> => {
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 1);
      const { data, error } = await supabase
        .from("deadlines")
        .select(DEADLINE_COLUMNS)
        .gte("due_date", from.toISOString())
        .lt("due_date", to.toISOString())
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DeadlineFull[];
    },
  });

export const dashboardStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const today = startOfToday();
      const inSevenDays = new Date(today.getTime() + 7 * 86400000);
      const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);

      const [activeCases, weekDeadlines, pieces] = await Promise.all([
        supabase
          .from("cases")
          .select("id", { count: "exact", head: true })
          .neq("status", "encerrado"),
        supabase
          .from("deadlines")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendente")
          .gte("due_date", today.toISOString())
          .lte("due_date", inSevenDays.toISOString()),
        supabase
          .from("case_activity")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "peca_analisada")
          .gte("event_date", sevenDaysAgo.toISOString()),
      ]);

      if (activeCases.error) throw activeCases.error;
      if (weekDeadlines.error) throw weekDeadlines.error;
      if (pieces.error) throw pieces.error;

      return {
        activeCases: activeCases.count ?? 0,
        weekDeadlines: weekDeadlines.count ?? 0,
        pieces: pieces.count ?? 0,
      };
    },
  });

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const DEADLINE_PRIORITIES = ["urgente", "importante", "informativo"] as const;

export function priorityTone(priority: string): "urgent" | "gold" | "teal" {
  const p = (priority ?? "").toLowerCase();
  if (p === "urgente") return "urgent";
  if (p === "importante") return "gold";
  return "teal";
}

export function daysTone(days: number): "urgent" | "gold" | "teal" {
  if (days <= 3) return "urgent";
  if (days <= 7) return "gold";
  return "teal";
}

export const toneClasses: Record<string, string> = {
  gold: "border-gold/40 bg-gold/10 text-gold",
  teal: "border-teal/40 bg-teal/10 text-teal",
  urgent: "border-urgent/50 bg-urgent/15 text-urgent",
};

/** yyyy-mm-dd em horário local */
export function localDayKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

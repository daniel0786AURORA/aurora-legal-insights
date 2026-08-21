import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type CaseRow = {
  id: string;
  case_number: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  opposing_party: string | null;
  court: string | null;
  case_type: string | null;
  status: string;
  summary: string;
  created_at: string;
  updated_at: string;
};

export type ActivityRow = {
  id: string;
  case_id: string;
  event_type: string;
  description: string;
  event_date: string;
};

export type FileRow = {
  id: string;
  case_id: string;
  file_name: string;
  file_kind: string;
  file_url: string | null;
  uploaded_at: string;
};

export type DeadlineRow = {
  id: string;
  case_id: string | null;
  title: string;
  due_date: string;
  kind: string;
  priority: string;
  status: string;
};

const CASE_COLUMNS =
  "id, case_number, client_name, client_phone, client_email, opposing_party, court, case_type, status, summary, created_at, updated_at";

export const casesQueryOptions = () =>
  queryOptions({
    queryKey: ["cases"],
    queryFn: async (): Promise<CaseRow[]> => {
      const { data, error } = await supabase
        .from("cases")
        .select(CASE_COLUMNS)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CaseRow[];
    },
  });

export const caseQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["cases", caseId],
    queryFn: async (): Promise<CaseRow | null> => {
      const { data, error } = await supabase
        .from("cases")
        .select(CASE_COLUMNS)
        .eq("id", caseId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CaseRow | null;
    },
  });

export const caseActivityQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["case_activity", caseId],
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await supabase
        .from("case_activity")
        .select("id, case_id, event_type, description, event_date")
        .eq("case_id", caseId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });

export const caseFilesQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["case_files", caseId],
    queryFn: async (): Promise<FileRow[]> => {
      const { data, error } = await supabase
        .from("case_files")
        .select("id, case_id, file_name, file_kind, file_url, uploaded_at")
        .eq("case_id", caseId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FileRow[];
    },
  });

export const caseDeadlinesQueryOptions = (caseId: string) =>
  queryOptions({
    queryKey: ["deadlines", caseId],
    queryFn: async (): Promise<DeadlineRow[]> => {
      const { data, error } = await supabase
        .from("deadlines")
        .select("id, case_id, title, due_date, kind, priority, status")
        .eq("case_id", caseId)
        .eq("status", "pendente")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DeadlineRow[];
    },
  });

export const CASE_STATUSES = [
  "Prazo em aberto",
  "Aguardando decisão",
  "Em recurso",
  "Em andamento",
  "Arquivado",
  "Urgente",
] as const;

export type StatusTone = "gold" | "teal" | "urgent";

export function statusTone(status: string): StatusTone {
  const s = (status ?? "").toLowerCase();
  if (/urgente|prazo em aberto|recurso|intima|atras/.test(s)) return "urgent";
  if (/andamento|conclu|deferid|arquiv|ativo|acordo/.test(s)) return "teal";
  return "gold";
}

export const CASE_TYPES = [
  "Cível",
  "Família",
  "Consumidor",
  "Trabalhista",
  "Previdenciário",
  "Criminal",
  "Tributário",
  "Empresarial",
] as const;

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysUntil(value: string): number {
  const target = new Date(value);
  const today = new Date();
  const a = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86400000);
}

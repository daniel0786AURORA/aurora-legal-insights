import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type AccountSettings = {
  id: string;
  firm_name: string;
  oab: string;
  plan: string;
  credits_total_month: number;
  credits_used_month: number;
  renewal_day: number;
};

export const accountSettingsQueryKey = ["account_settings"] as const;

export function useAccountSettings() {
  return useQuery({
    queryKey: accountSettingsQueryKey,
    queryFn: async (): Promise<AccountSettings | null> => {
      const { data, error } = await supabase
        .from("account_settings")
        .select("id, firm_name, oab, plan, credits_total_month, credits_used_month, renewal_day")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

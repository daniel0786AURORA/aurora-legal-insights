import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export type CreditResult = {
  ok: boolean;
  credits_used_month: number;
  credits_total_month: number;
};

/**
 * Consome 1 crédito de análise de IA (resumo, raio-x, radar).
 * Retorna ok: false — e avisa o usuário — quando não há crédito disponível no mês.
 * Chame isto ANTES de rodar qualquer análise.
 */
export async function consumeCredit(): Promise<CreditResult> {
  const { data, error } = await supabase.rpc("consume_credit");
  if (error) throw error;

  const result = (Array.isArray(data) ? data[0] : data) as CreditResult;

  if (!result?.ok) {
    toast.error("Créditos esgotados", {
      description: `Você usou ${result?.credits_used_month ?? 0} de ${
        result?.credits_total_month ?? 0
      } créditos deste mês. Aguarde a renovação ou faça upgrade do plano.`,
    });
  }

  return result;
}

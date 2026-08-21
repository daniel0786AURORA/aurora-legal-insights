const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash";

export type AuroraTask = "resumo" | "raiox" | "contestacao" | "reforco" | "recurso";

const SYSTEM =
  "Você é a Aurora, assistente de inteligência jurídica brasileira para advogados. " +
  "Escreva em português do Brasil, linguagem simples e direta, sem jargão desnecessário. " +
  "Nunca invente números de processo. Quando citar jurisprudência, use o formato exato " +
  "'Fonte: <citação>' em uma linha própria. Tudo que você produz é um rascunho a ser revisado " +
  "por um advogado humano.";

const PROMPTS: Record<AuroraTask, string> = {
  resumo:
    "Resuma o processo abaixo em 4 blocos com títulos: FATOS, PEDIDOS, CRONOLOGIA e PRÓXIMOS PRAZOS. " +
    "Use linguagem simples, frases curtas, sem jargão. Máximo 350 palavras.",
  raiox:
    "Faça um raio-x estratégico do material abaixo. Liste de 3 a 5 pontos fortes e de 3 a 5 pontos fracos/brechas. " +
    'Responda SOMENTE com JSON válido no formato {"pontos":[{"tipo":"forte"|"fraco","texto":"..."}]}. ' +
    "Cada texto deve ter no máximo 2 frases.",
  contestacao:
    "Redija uma minuta de contestação completa (preâmbulo, dos fatos, do direito, dos pedidos) " +
    "com base no material abaixo, endereçando explicitamente os pontos fracos identificados.",
  reforco:
    "Redija um parágrafo de reforço argumentativo para blindar o ponto fraco mais grave identificado " +
    "no material abaixo. Entregue de 1 a 2 parágrafos prontos para colar na peça.",
  recurso:
    "Redija uma estratégia de recurso: cabimento, teses recursais em ordem de força, riscos e " +
    "um esboço das razões recursais, com base no material abaixo.",
};

export async function runAuroraTask(input: {
  task: AuroraTask;
  content: string;
  weakPoints?: string;
  profileContext?: string;
}): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Serviço de IA não configurado.");

  const parts = [PROMPTS[input.task], "\n--- MATERIAL DO CASO ---\n" + input.content];
  if (input.weakPoints) parts.push("\n--- PONTOS FRACOS JÁ IDENTIFICADOS ---\n" + input.weakPoints);
  if (input.profileContext)
    parts.push(
      "\n--- PERFIL COMPORTAMENTAL AUTORIZADO (juiz/advogado adversário) ---\n" +
        input.profileContext,
    );

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: parts.join("\n") },
      ],
      ...(input.task === "raiox" ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (res.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
  if (res.status === 402) throw new Error("Créditos de IA do workspace esgotados.");
  if (!res.ok) throw new Error(`Falha na IA (${res.status}): ${(await res.text()).slice(0, 200)}`);

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("A IA não retornou conteúdo.");
  return text;
}

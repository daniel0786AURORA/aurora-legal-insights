import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  task: z.enum([
    "resumo",
    "raiox",
    "contestacao",
    "reforco",
    "recurso",
    "extrair_processo",
    "extrair_perfil_juiz",
    "extrair_perfil_advogado",
  ]),
  content: z.string().min(1).max(120000),
  weakPoints: z.string().max(20000).optional(),
  profileContext: z.string().max(20000).optional(),
});

export const auroraAnalyze = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { runAuroraTask } = await import("./ai.server");
    const text = await runAuroraTask(data);
    return { text };
  });

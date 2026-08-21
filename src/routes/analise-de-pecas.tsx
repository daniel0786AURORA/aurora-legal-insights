import { createFileRoute } from "@tanstack/react-router";

import { EmptyPanel, PageShell } from "@/components/aurora/PageShell";

export const Route = createFileRoute("/analise-de-pecas")({
  head: () => ({
    meta: [
      { title: "Análise de Peças — Aurora" },
      {
        name: "description",
        content:
          "Envie peças processuais para análise da Aurora e receba diagnóstico e sugestões de melhoria.",
      },
      { property: "og:title", content: "Análise de Peças — Aurora" },
      {
        property: "og:description",
        content: "Análise de peças processuais com diagnóstico e sugestões geradas pela Aurora.",
      },
    ],
  }),
  component: AnaliseDePecas,
});

function AnaliseDePecas() {
  return (
    <PageShell
      title="Análise de Peças"
      subtitle="Raio-x de peças e processos. Conteúdo em breve."
    >
      <EmptyPanel label="Análise de Peças — em construção" />
    </PageShell>
  );
}

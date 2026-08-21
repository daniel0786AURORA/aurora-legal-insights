import { createFileRoute } from "@tanstack/react-router";

import { EmptyPanel, PageShell } from "@/components/aurora/PageShell";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Aurora" },
      {
        name: "description",
        content: "Dados do escritório, OAB, plano e créditos mensais de análise da Aurora.",
      },
      { property: "og:title", content: "Configurações — Aurora" },
      {
        property: "og:description",
        content: "Configure escritório, OAB, plano e créditos mensais na Aurora.",
      },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  return (
    <PageShell
      title="Configurações"
      subtitle="Dados do escritório, plano e créditos. Conteúdo em breve."
    >
      <EmptyPanel label="Configurações — em construção" />
    </PageShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { EmptyPanel, PageShell } from "@/components/aurora/PageShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Início — Aurora | Inteligência jurídica" },
      {
        name: "description",
        content:
          "Painel inicial da Aurora: visão geral de processos, prazos e análises de inteligência jurídica.",
      },
      { property: "og:title", content: "Início — Aurora | Inteligência jurídica" },
      {
        property: "og:description",
        content: "Painel inicial da Aurora para advogados: processos, prazos e análises de IA.",
      },
    ],
  }),
  component: Inicio,
});

function Inicio() {
  return (
    <PageShell
      title="Início"
      subtitle="Sua base está pronta. O conteúdo deste painel será construído nos próximos passos."
    >
      <EmptyPanel label="Painel inicial — em construção" />
    </PageShell>
  );
}

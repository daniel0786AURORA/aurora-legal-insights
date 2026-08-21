import { createFileRoute } from "@tanstack/react-router";

import { EmptyPanel, PageShell } from "@/components/aurora/PageShell";

export const Route = createFileRoute("/processos")({
  head: () => ({
    meta: [
      { title: "Processos — Aurora" },
      {
        name: "description",
        content: "Gerencie processos, clientes, prazos e documentos em um só lugar na Aurora.",
      },
      { property: "og:title", content: "Processos — Aurora" },
      {
        property: "og:description",
        content: "Gerencie processos, clientes, prazos e documentos na Aurora.",
      },
    ],
  }),
  component: Processos,
});

function Processos() {
  return (
    <PageShell
      title="Processos"
      subtitle="Cadastro e acompanhamento de processos. Conteúdo em breve."
    >
      <EmptyPanel label="Processos — em construção" />
    </PageShell>
  );
}

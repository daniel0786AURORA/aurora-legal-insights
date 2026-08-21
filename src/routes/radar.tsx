import { createFileRoute } from "@tanstack/react-router";

import { EmptyPanel, PageShell } from "@/components/aurora/PageShell";

export const Route = createFileRoute("/radar")({
  head: () => ({
    meta: [
      { title: "Radar Preditivo — Aurora" },
      {
        name: "description",
        content:
          "Radar Preditivo da Aurora: perfis de juízes e advogados, taxas de deferimento e tempo médio de decisão.",
      },
      { property: "og:title", content: "Radar Preditivo — Aurora" },
      {
        property: "og:description",
        content: "Perfis de juízes e advogados com estimativas de deferimento e tempo de decisão.",
      },
    ],
  }),
  component: RadarPreditivo,
});

function RadarPreditivo() {
  return (
    <PageShell
      title="Radar Preditivo"
      subtitle="Análise comportamental de juízes e advogados. Conteúdo em breve."
    >
      <EmptyPanel label="Radar Preditivo — em construção" />
    </PageShell>
  );
}

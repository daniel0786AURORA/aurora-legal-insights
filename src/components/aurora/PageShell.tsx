import type { ReactNode } from "react";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <header>
        <h1 className="font-display text-3xl text-foreground">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
      </header>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="panel flex min-h-[320px] items-center justify-center p-8">
      <p className="text-numeric text-xs uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

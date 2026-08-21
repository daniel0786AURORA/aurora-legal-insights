import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Briefcase, Radar, FileSearch, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Início", url: "/", icon: Home },
  { title: "Processos", url: "/processos", icon: Briefcase },
  { title: "Radar Preditivo", url: "/radar", icon: Radar },
  { title: "Análise de Peças", url: "/analise-de-pecas", icon: FileSearch },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-surface-alt font-display text-lg text-primary">
            A
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block font-display text-lg leading-none text-foreground">
                Aurora
              </span>
              <span className="mt-1 block text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
                Inteligência jurídica
              </span>
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
              Navegação
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <CreditsBadge collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>
  );
}

function CreditsBadge({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="rounded-md border border-sidebar-border bg-surface-alt px-3 py-2">
      <span className="block text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">
        Créditos do mês
      </span>
      <CreditsValue />
    </div>
  );
}

function CreditsValue() {
  return <CreditsCounter />;
}

import { useAccountSettings } from "@/hooks/use-account-settings";

function CreditsCounter() {
  const { data } = useAccountSettings();
  const used = data?.credits_used_month ?? 0;
  const total = data?.credits_total_month ?? 30;
  return (
    <span className="text-numeric mt-1 block text-sm text-gold-light">
      {used} / {total}
    </span>
  );
}

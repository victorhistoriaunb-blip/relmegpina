import { Link, useRouterState } from "@tanstack/react-router";
import { 
  LayoutGrid, 
  BarChart3, 
  LifeBuoy, 
  ShieldCheck, 
  Settings, 
  FileText, 
  Building2, 
  Newspaper, 
  Radar 
} from "lucide-react";
import { LogoLockup } from "./Logo";
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
import { useRelmeg } from "@/lib/relmeg/store";

const items = [
  { title: "Perfis", url: "/", icon: LayoutGrid },
  { title: "Dashboards", url: "/dashboards", icon: BarChart3 },
  { title: "Câmara", url: "/camara", icon: FileText },
  { title: "Senado", url: "/senado", icon: Building2 },
  { title: "DOU", url: "/dou", icon: Newspaper },
  { title: "Monitoramento", url: "/monitoramento", icon: Radar },
  { title: "Central de Ajuda", url: "/ajuda", icon: LifeBuoy },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Admin", url: "/admin", icon: ShieldCheck },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { data } = useRelmeg();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <LogoLockup compact={collapsed} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link to={item.url as any} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {!collapsed && (
        <SidebarFooter className="px-4 pb-4">
          <div className="rounded-md border border-sidebar-border bg-sidebar-accent/40 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Base ativa</p>
            <p className="mt-1 font-display text-lg">{data.length} registros</p>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

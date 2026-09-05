import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/relmeg/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { LoginScreen } from "@/components/relmeg/LoginScreen";
import { logout, setFilter, setClienteAtivo, useRelmeg } from "@/lib/relmeg/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, Search, X, FolderKanban } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "RelMeg - Inteligência Legislativa" },
      {
        name: "description",
        content:
          "Perfis parlamentares com filtros por partido, UF, cargo, setor, temas de interesse e temas contrários.",
      },
      { property: "og:title", content: "RelMeg - Inteligência Legislativa" },
      {
        property: "og:description",
        content:
          "Perfis parlamentares com filtros por partido, UF, cargo, setor, temas de interesse e temas contrários.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "RelMeg - Inteligência Legislativa" },
      {
        name: "twitter:description",
        content:
          "Perfis parlamentares com filtros por partido, UF, cargo, setor, temas de interesse e temas contrários.",
      },
      {
        property: "og:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/5d70a014-5967-4a24-80de-2645e0a20c3f",
      },
      {
        name: "twitter:image",
        content:
          "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/5d70a014-5967-4a24-80de-2645e0a20c3f",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { estaAutenticado, usuario, prefs, filters, clientes, clienteAtivo } = useRelmeg();

  if (!estaAutenticado) {
    return (
      <QueryClientProvider client={queryClient}>
        <LoginScreen />
        <Toaster position="top-right" />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="aurora flex min-h-screen w-full bg-background">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/70 px-4 backdrop-blur-xl">
              <SidebarTrigger />
              <span className="truncate text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:text-[11px] sm:tracking-[0.28em]">
                RelMeg · Inteligência Legislativa
              </span>
              <div className="relative ml-auto hidden w-full max-w-[260px] md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filters.busca}
                  onChange={(e) => setFilter("busca", e.target.value)}
                  placeholder="Busca global: nome, partido, tema…"
                  className="h-9 w-full pl-9"
                  aria-label="Busca global"
                />
                {filters.busca && (
                  <button
                    type="button"
                    onClick={() => setFilter("busca", "")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Limpar busca"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
                <Select value={clienteAtivo} onValueChange={setClienteAtivo}>
                  <SelectTrigger
                    className="h-9 w-[180px] gap-2 border-border/70"
                    aria-label="Cliente / Tema ativo"
                  >
                    <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Cliente / Tema" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="todos">Todos os Clientes/Temas</SelectItem>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.key} value={cliente.key}>
                        {cliente.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {prefs.mostrarSaudacao && (
                  <span className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground sm:flex">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    {prefs.saudacao}, {prefs.nomeExibicao || usuario || "Admin"}
                  </span>
                )}
                <Button variant="ghost" size="sm" onClick={() => void logout()}>
                  <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </header>
            <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-8">
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

import { Link } from "@tanstack/react-router";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="panel glow-ring rise-in flex flex-col items-center justify-center rounded-xl px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/25">
        <UploadCloud className="h-6 w-6" />
      </span>
      <h2 className="mt-5 text-xl font-semibold">{titulo}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{descricao}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/admin">Importar planilha</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/ajuda">Ver Central de Ajuda</Link>
        </Button>
      </div>
    </div>
  );
}
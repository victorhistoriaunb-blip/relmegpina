import { FolderKanban } from "lucide-react";
import { setClienteAtivo, useRelmeg } from "@/lib/relmeg/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ClienteSelector({ triggerClass = "" }: { triggerClass?: string }) {
  const { clientes, clienteAtivo } = useRelmeg();
  return (
    <Select value={clienteAtivo} onValueChange={setClienteAtivo}>
      <SelectTrigger className={`h-9 min-w-[170px] gap-2 border-border/70 ${triggerClass}`}>
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
  );
}
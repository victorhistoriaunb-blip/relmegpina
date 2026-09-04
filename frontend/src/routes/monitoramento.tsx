import { createFileRoute } from '@tanstack/react-router'
import { MonitoramentoView } from '@/components/relmeg/MonitoramentoView'

export const Route = createFileRoute('/monitoramento')({
  component: MonitoramentoView,
})
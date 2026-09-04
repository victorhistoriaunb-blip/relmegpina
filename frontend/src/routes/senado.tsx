import { createFileRoute } from '@tanstack/react-router'
import { SenadoView } from '@/components/relmeg/SenadoView'

export const Route = createFileRoute('/senado')({
  component: SenadoView,
})
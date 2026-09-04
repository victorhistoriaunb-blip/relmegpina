import { createFileRoute } from '@tanstack/react-router'
import { CamaraView } from '@/components/relmeg/CamaraView'

export const Route = createFileRoute('/camara')({
  component: CamaraView,
})
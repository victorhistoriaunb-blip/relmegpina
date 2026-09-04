import { createFileRoute } from '@tanstack/react-router'
import { DouView } from '@/components/relmeg/DouView'

export const Route = createFileRoute('/dou')({
  component: DouView,
})
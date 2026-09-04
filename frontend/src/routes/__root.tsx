import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans antialiased">
      <main className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ThemeSwitcher } from '#/components/ThemeSwitcher'

export const Route = createFileRoute('/(home)')({ component: HomeLayout })

function HomeLayout() {
  return (
    <>
      <ThemeSwitcher />
      <Outlet />
    </>
  )
}

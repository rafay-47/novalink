import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { LogoutButton } from "@/components/logout-button"
import { ThemeToggle } from "@/components/theme-toggle"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single()

  const displayName = profile?.full_name || user.email?.split("@")[0] || "User"
  const initials = displayName.substring(0, 2).toUpperCase()

  return (
    <div className="flex h-screen">
      <Sidebar user={{ name: displayName, email: user.email || "", initials }} />
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Desktop header */}
        <header className="hidden lg:flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
          <div className="text-sm font-semibold text-muted-foreground">NovaLink</div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </header>

        {/* Mobile header */}
        <header className="lg:hidden h-14 flex items-center justify-between border-b bg-background px-4">
          <span className="text-sm font-semibold text-muted-foreground">NovaLink</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-6 pt-20 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  )
}
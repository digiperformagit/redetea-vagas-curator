import { Link, useLocation } from "wouter";
import { Search, CheckSquare, Settings, LogOut, Menu, X, Clock } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";

const navItems = [
  { href: "/", label: "Buscar Vagas", icon: Search },
  { href: "/approvals", label: "Aprovações", icon: CheckSquare },
  { href: "/history", label: "Histórico", icon: Clock },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAuthenticated, loading, logout } = useAuth();
  const statsQuery = trpc.jobs.stats.useQuery(undefined, { enabled: isAuthenticated });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center p-10 bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
          <div className="mb-6">
            <img
              src="https://redetea.com.br/wp-content/uploads/2021/03/logo-rede-tea.png"
              alt="Rede TEA"
              className="h-16 mx-auto object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Curadoria de Vagas
          </h1>
          <p className="text-gray-600 mb-8">
            Faça login para acessar a ferramenta de curadoria e publicação de vagas da Rede TEA.
          </p>
          <Button
            className="w-full h-12 text-base"
            onClick={() => window.location.href = getLoginUrl()}
          >
            Entrar com Manus
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-30 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Rede TEA
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Curadoria de Vagas</p>
            </div>
            <button
              className="lg:hidden text-slate-400 hover:text-slate-600"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats pills */}
        {statsQuery.data && (
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                {statsQuery.data.pending} pendentes
              </span>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                {statsQuery.data.published} publicadas
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
              {(user as any)?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {(user as any)?.username || "Usuário"}
              </p>
              <p className="text-xs text-slate-500 truncate">{(user as any)?.email || ""}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-500 hover:text-slate-700"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-slate-900">Rede TEA - Vagas</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Activity,
  Settings,
  Menu,
  X,
  Plus,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  Store,
  LogOut,
  User as UserIcon,
  CreditCard
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"


interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

const SidebarItem = ({ icon, label, active, onClick, collapsed }: SidebarItemProps) => (
  <Button
    variant={active ? "secondary" : "ghost"}
    className={cn(
      "w-full justify-start gap-3 px-3",
      active && "bg-secondary",
      collapsed && "justify-center px-0"
    )}
    onClick={onClick}
  >
    {icon}
    {!collapsed && <span>{label}</span>}
  </Button>
);

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNewStore: () => void;
  isRefetching?: boolean;
}

export const DashboardLayout = ({
  children,
  activeTab,
  setActiveTab,
  onNewStore,
  isRefetching
}: DashboardLayoutProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'stores', label: 'Stores', icon: <Store size={18} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <div className="flex min-h-screen bg-background selection:bg-zinc-500/30">
      {/* Sidebar - Desktop */}
      <aside className={cn(
        "hidden md:flex flex-col border-r border-white/5 transition-all duration-300 ease-in-out sticky top-0 h-screen bg-zinc-950/50 backdrop-blur-xl",
        isSidebarCollapsed ? "w-[70px]" : "w-[240px]"
      )}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-8 px-2 h-8">
            {!isSidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <div className="w-6 h-6 bg-zinc-100 rounded-md flex items-center justify-center">
                  <div className="w-3 h-3 bg-black rounded-sm" />
                </div>
                <span className="font-bold text-zinc-100 tracking-tight">Urumi</span>
              </motion.div>
            )}
            {isSidebarCollapsed && (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
                <div className="w-4 h-4 bg-primary-foreground rounded-sm" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1">
            {tabs.map((tab) => (
              <SidebarItem
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                collapsed={isSidebarCollapsed}
              />
            ))}
          </div>

          <div className="mt-auto space-y-1 pt-4 border-t border-white/5">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="flex items-center gap-3 w-full px-3 py-2 text-zinc-500 hover:text-zinc-300 transition-colors group"
            >
              {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              {!isSidebarCollapsed && <span className="text-sm font-medium">Collapse</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-4 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-bold">Urumi</span>
          </div>

          <div className="flex-1 flex items-center justify-center md:justify-start px-4">
            <div className="relative w-full max-w-sm hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search deployments..."
                className="pl-9 pr-12 bg-background/50 border-input focus:bg-background"
              />
              <div className="absolute right-2.5 top-2.5 hidden pointer-events-none select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
                <span className="text-xs">⌘</span>K
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {isRefetching && (
              <div className="flex items-center gap-2 px-2 py-1 rounded bg-secondary/50 border border-border">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter hidden sm:block">Live</span>
              </div>
            )}
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Bell className="h-5 w-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                    <UserIcon className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Admin User</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      admin@urumi.dev
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Billing</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6 md:p-10 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-bold text-zinc-100 tracking-tight capitalize">{activeTab}</h2>
                <p className="text-zinc-500 text-sm mt-1">Manage your infrastructure and store deployments.</p>
              </div>
              <button
                onClick={onNewStore}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-md font-semibold text-sm transition-all shadow-lg active:scale-95"
              >
                <Plus size={16} />
                Create Store
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-zinc-950 border-r border-zinc-800 z-50 p-6 md:hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-zinc-100 rounded-md flex items-center justify-center">
                    <div className="w-4 h-4 bg-black rounded-sm" />
                  </div>
                  <span className="font-bold text-zinc-100 text-xl tracking-tight text-white">Urumi</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-400">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-4 w-full px-4 py-3 rounded-xl transition-all duration-200",
                      activeTab === tab.id
                        ? "bg-zinc-800 text-zinc-100"
                        : "text-zinc-500 hover:bg-zinc-900"
                    )}
                  >
                    {tab.icon}
                    <span className="text-lg font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

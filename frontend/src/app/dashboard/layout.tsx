"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Upload,
    Package,
    BarChart3,
    ShoppingBag,
    FileSpreadsheet,
    LogOut,
    Search,
    Bell,
    Settings,
    ChevronLeft,
    Menu,
} from "lucide-react";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Visão Geral" },
    { href: "/dashboard/products", icon: Package, label: "Produtos" },
    { href: "/dashboard/offers", icon: ShoppingBag, label: "Ofertas" },
    { href: "/dashboard/analysis", icon: BarChart3, label: "Análise" },
    { href: "/dashboard/quotation", icon: FileSpreadsheet, label: "Orçamentos" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading || !user) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100vh",
                    background: "var(--bg-primary)",
                }}
            >
                <div className="skeleton" style={{ width: 200, height: 40 }} />
            </div>
        );
    }

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <div className="flex flex-col md:flex-row w-full h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
            {/* Sidebar (Desktop) */}
            <motion.aside
                animate={{ width: collapsed ? 72 : 260 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="hidden md:flex flex-col flex-shrink-0 z-20 overflow-hidden border-r border-[var(--border)]"
                style={{ background: "var(--bg-secondary)" }}
            >
                {/* Logo area */}
                <div
                    style={{
                        padding: collapsed ? "20px 12px" : "20px 24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: collapsed ? "center" : "space-between",
                        gap: 8,
                        minHeight: 72,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
                        <div
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: "var(--accent)",
                                boxShadow: "0 0 16px var(--accent-glow)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <LayoutDashboard size={16} color="white" />
                        </div>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}
                            >
                                Preço Inteligente
                            </motion.span>
                        )}
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ padding: "16px 12px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 12,
                                    padding: collapsed ? "10px 0" : "10px 12px",
                                    justifyContent: collapsed ? "center" : "flex-start",
                                    borderRadius: 8,
                                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                                    background: isActive ? "rgba(255, 255, 255, 0.05)" : "transparent",
                                    transition: "all 0.2s ease",
                                    textDecoration: "none",
                                    fontSize: 14,
                                    fontWeight: isActive ? 500 : 400,
                                }}
                            >
                                <Icon size={18} style={{ flexShrink: 0, color: isActive ? "var(--text-primary)" : "var(--text-muted)" }} />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Toggle */}
                <div style={{ padding: "16px 12px" }}>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: collapsed ? "center" : "flex-start",
                            gap: 12,
                            padding: "10px 12px",
                            background: "none",
                            border: "none",
                            borderRadius: 8,
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                    >
                        {collapsed ? <Menu size={18} /> : (
                            <>
                                <ChevronLeft size={18} />
                                <span style={{ fontSize: 13, fontWeight: 500 }}>Recolher</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.aside>

            {/* Main content Area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                {/* Topbar */}
                <header className="flex items-center justify-between px-4 md:px-8 border-b border-[var(--border)] z-10" style={{
                    height: 72,
                    background: "rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                }}>
                    {/* Search Mock */}
                    <div className="hidden md:flex items-center gap-3 w-full max-w-[400px]">
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Buscar produtos, orçamentos..."
                            style={{
                                background: "none",
                                border: "none",
                                outline: "none",
                                color: "var(--text-primary)",
                                fontSize: 14,
                                width: "100%",
                            }}
                        />
                    </div>

                    {/* Mobile Logo (Visible only on mobile) */}
                    <div className="flex md:hidden items-center gap-3">
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: "var(--gradient-primary)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 0 16px rgba(99, 102, 241, 0.3)"
                        }}>
                            <LayoutDashboard size={16} color="white" />
                        </div>
                        <span className="gradient-text" style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>Preço Inteligente</span>
                    </div>

                    {/* Right utilities */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <button style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", position: "relative" }}>
                            <Bell size={20} />
                            <span style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, background: "var(--accent)", borderRadius: "50%" }}></span>
                        </button>

                        <div style={{ width: 1, height: 24, background: "var(--border)" }}></div>

                        {/* User Avatar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                            <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 13,
                                fontWeight: 600,
                                color: "white",
                            }}>
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{user.name}</span>
                                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Admin</span>
                            </div>
                            <button onClick={handleLogout} style={{ marginLeft: 8, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
                    <div className="p-4 md:p-8 max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex justify-around p-2 z-50">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href} className="flex flex-col items-center p-2 rounded-lg" style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}>
                                <Icon size={20} color={isActive ? "var(--accent)" : "currentColor"} />
                                <span style={{ fontSize: 10, marginTop: 4, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}

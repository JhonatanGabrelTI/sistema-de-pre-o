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
        <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg-primary)" }}>
            {/* Sidebar */}
            <motion.aside
                animate={{ width: collapsed ? 72 : 260 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    background: "var(--bg-secondary)",
                    borderRight: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: 0,
                    overflow: "hidden",
                    zIndex: 20,
                }}
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
                <header style={{
                    height: 72,
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 32px",
                    background: "rgba(0, 0, 0, 0.5)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    zIndex: 10,
                }}>
                    {/* Search Mock */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 400 }}>
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

                    {/* Right utilities */}
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
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

                <main
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        overflowX: "hidden",
                    }}
                >
                    <div style={{ padding: "32px", maxWidth: 1280, margin: "0 auto" }}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

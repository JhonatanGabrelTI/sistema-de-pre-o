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
    Sparkles,
    ChevronLeft,
    Menu,
} from "lucide-react";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/dashboard/upload", icon: Upload, label: "Upload PDF" },
    { href: "/dashboard/products", icon: Package, label: "Produtos" },
    { href: "/dashboard/analysis", icon: BarChart3, label: "Análise" },
    { href: "/dashboard/offers", icon: ShoppingBag, label: "Ofertas" },
    { href: "/dashboard/quotation", icon: FileSpreadsheet, label: "Orçamento" },
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
        <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
            {/* Sidebar */}
            <motion.aside
                animate={{ width: collapsed ? 72 : 260 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                style={{
                    background: "var(--bg-secondary)",
                    borderRight: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    flexShrink: 0,
                    overflow: "hidden",
                }}
            >
                {/* Logo area */}
                <div
                    style={{
                        padding: collapsed ? "20px 12px" : "20px 20px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: collapsed ? "center" : "space-between",
                        gap: 8,
                        minHeight: 68,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                        <div
                            style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                background: "var(--gradient-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <Sparkles size={18} color="white" />
                        </div>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                style={{ fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}
                            >
                                Preço Inteligente
                            </motion.span>
                        )}
                    </div>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            padding: 4,
                            display: collapsed ? "none" : "flex",
                        }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                </div>

                {/* Nav */}
                <nav style={{ padding: "12px 8px", flex: 1 }}>
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
                                    padding: collapsed ? "12px 0" : "10px 14px",
                                    justifyContent: collapsed ? "center" : "flex-start",
                                    borderRadius: 10,
                                    marginBottom: 4,
                                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                                    background: isActive
                                        ? "rgba(99,102,241,0.12)"
                                        : "transparent",
                                    borderLeft: isActive
                                        ? "3px solid var(--accent)"
                                        : "3px solid transparent",
                                    transition: "all 0.15s ease",
                                    textDecoration: "none",
                                    fontSize: 14,
                                    fontWeight: isActive ? 600 : 400,
                                }}
                            >
                                <Icon size={20} style={{ flexShrink: 0 }} />
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div
                    style={{
                        padding: collapsed ? "16px 8px" : "16px",
                        borderTop: "1px solid var(--border)",
                    }}
                >
                    {!collapsed && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 12,
                            }}
                        >
                            <div
                                style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: "50%",
                                    background: "var(--gradient-primary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 14,
                                    fontWeight: 700,
                                    color: "white",
                                    flexShrink: 0,
                                }}
                            >
                                {user.name?.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ overflow: "hidden" }}>
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {user.name}
                                </div>
                                <div
                                    style={{
                                        fontSize: 11,
                                        color: "var(--text-muted)",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                    }}
                                >
                                    {user.email}
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: collapsed ? "center" : "flex-start",
                            gap: 10,
                            padding: "10px 14px",
                            background: "none",
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            fontSize: 13,
                            transition: "all 0.15s",
                        }}
                    >
                        <LogOut size={18} />
                        {!collapsed && <span>Sair</span>}
                    </button>
                </div>

                {/* Mobile toggle */}
                {collapsed && (
                    <div style={{ padding: "8px", borderTop: "1px solid var(--border)" }}>
                        <button
                            onClick={() => setCollapsed(false)}
                            style={{
                                width: "100%",
                                display: "flex",
                                justifyContent: "center",
                                padding: 8,
                                background: "none",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                            }}
                        >
                            <Menu size={18} />
                        </button>
                    </div>
                )}
            </motion.aside>

            {/* Main content */}
            <main
                style={{
                    flex: 1,
                    overflow: "auto",
                    background: "var(--bg-primary)",
                }}
            >
                <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>{children}</div>
            </main>
        </div>
    );
}

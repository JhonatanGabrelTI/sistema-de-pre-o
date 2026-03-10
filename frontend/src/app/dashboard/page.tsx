"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
    FolderOpen,
    Package,
    ShoppingBag,
    CheckCircle2,
    TrendingUp,
    Upload,
    ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface Stats {
    total_projects: number;
    total_products: number;
    total_offers: number;
    approved_products: number;
}

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
    }),
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.dashboard
            .stats()
            .then((data: any) => setStats(data))
            .catch(() => setStats({ total_projects: 0, total_products: 0, total_offers: 0, approved_products: 0 }))
            .finally(() => setLoading(false));
    }, []);

    const statCards = [
        {
            label: "Total Projetos",
            value: stats?.total_projects ?? 0,
            icon: FolderOpen,
            color: "#6366f1",
            bg: "rgba(99,102,241,0.1)",
        },
        {
            label: "Produtos Analisados",
            value: stats?.total_products ?? 0,
            icon: Package,
            color: "#8b5cf6",
            bg: "rgba(139,92,246,0.1)",
        },
        {
            label: "Ofertas Encontradas",
            value: stats?.total_offers ?? 0,
            icon: ShoppingBag,
            color: "#a855f7",
            bg: "rgba(168,85,247,0.1)",
        },
        {
            label: "Produtos Aprovados",
            value: stats?.approved_products ?? 0,
            icon: CheckCircle2,
            color: "#22c55e",
            bg: "rgba(34,197,94,0.1)",
        },
    ];

    return (
        <div>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 32 }}
            >
                <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
                    Olá, {user?.name?.split(" ")[0]} 👋
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
                    Bem-vindo ao seu painel de cotação inteligente
                </p>
            </motion.div>

            {/* Stats Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 16,
                    marginBottom: 32,
                }}
            >
                {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <motion.div
                            key={card.label}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            className="glass-card"
                            style={{ padding: 24 }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 16,
                                }}
                            >
                                <div
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 12,
                                        background: card.bg,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Icon size={22} color={card.color} />
                                </div>
                            </div>
                            <div
                                style={{
                                    fontSize: 30,
                                    fontWeight: 700,
                                    marginBottom: 4,
                                    fontVariantNumeric: "tabular-nums",
                                }}
                            >
                                {loading ? <div className="skeleton" style={{ width: 60, height: 36 }} /> : card.value}
                            </div>
                            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{card.label}</div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quick actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Ações Rápidas</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                    <Link href="/dashboard/upload" style={{ textDecoration: "none" }}>
                        <div
                            className="glass-card"
                            style={{
                                padding: 24,
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                                cursor: "pointer",
                            }}
                        >
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "var(--gradient-primary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <Upload size={22} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
                                    Novo Upload
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                    Envie um PDF com lista de produtos
                                </div>
                            </div>
                            <ArrowRight size={18} color="var(--text-muted)" />
                        </div>
                    </Link>

                    <Link href="/dashboard/products" style={{ textDecoration: "none" }}>
                        <div
                            className="glass-card"
                            style={{
                                padding: 24,
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                                cursor: "pointer",
                            }}
                        >
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "rgba(139,92,246,0.15)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <TrendingUp size={22} color="#8b5cf6" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
                                    Ver Produtos
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                    Gerencie e analise seus produtos
                                </div>
                            </div>
                            <ArrowRight size={18} color="var(--text-muted)" />
                        </div>
                    </Link>

                    <Link href="/dashboard/quotation" style={{ textDecoration: "none" }}>
                        <div
                            className="glass-card"
                            style={{
                                padding: 24,
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                                cursor: "pointer",
                            }}
                        >
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "rgba(34,197,94,0.15)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <CheckCircle2 size={22} color="#22c55e" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
                                    Orçamentos
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                    Gere e exporte seus orçamentos
                                </div>
                            </div>
                            <ArrowRight size={18} color="var(--text-muted)" />
                        </div>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}

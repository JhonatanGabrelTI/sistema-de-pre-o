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
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ marginBottom: 40 }}
            >
                <h1 style={{
                    fontSize: 32,
                    fontWeight: 800,
                    marginBottom: 8,
                    background: "linear-gradient(90deg, #fff 0%, #a855f7 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    display: "inline-block"
                }}>
                    Olá, {user?.name?.split(" ")[0]} 👋
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 16, maxWidth: 600, lineHeight: 1.5 }}>
                    Bem-vindo ao seu painel de inteligência de preços. Acompanhe suas cotações e maximize suas margens de lucro.
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
                            whileHover={{ y: -5, scale: 1.02, boxShadow: `0 10px 40px ${card.bg}` }}
                            transition={{ duration: 0.3 }}
                            className="glass-card"
                            style={{
                                padding: 28,
                                position: "relative",
                                overflow: "hidden",
                                borderWidth: "1px",
                                borderColor: "rgba(255,255,255,0.05)"
                            }}
                        >
                            <div style={{
                                position: "absolute",
                                top: -20,
                                right: -20,
                                width: 100,
                                height: 100,
                                background: card.color,
                                filter: "blur(50px)",
                                opacity: 0.15,
                                zIndex: 0,
                                borderRadius: "50%"
                            }} />

                            <div style={{ position: "relative", zIndex: 1 }}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: 20,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 14,
                                            background: card.bg,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow: `0 4px 12px ${card.bg}`,
                                        }}
                                    >
                                        <Icon size={24} color={card.color} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div
                                    style={{
                                        fontSize: 36,
                                        fontWeight: 800,
                                        marginBottom: 6,
                                        fontVariantNumeric: "tabular-nums",
                                        letterSpacing: "-0.5px"
                                    }}
                                >
                                    {loading ? <div className="skeleton" style={{ width: 80, height: 42, borderRadius: 8 }} /> : card.value}
                                </div>
                                <div style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>{card.label}</div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quick actions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                style={{ marginTop: 40 }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 4, height: 24, background: "var(--accent)", borderRadius: 4 }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>Ações Rápidas</h2>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                    <Link href="/dashboard/upload" style={{ textDecoration: "none" }}>
                        <motion.div
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card link-card"
                            style={{
                                padding: 24,
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            <div
                                style={{
                                    width: 54,
                                    height: 54,
                                    borderRadius: 14,
                                    background: "var(--gradient-primary)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    boxShadow: "0 8px 20px rgba(139, 92, 246, 0.25)"
                                }}
                            >
                                <Upload size={24} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 4 }}>
                                    Novo Upload
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                    Envie um PDF com a lista técnica
                                </div>
                            </div>
                            <ArrowRight size={20} color="var(--text-muted)" />
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/products" style={{ textDecoration: "none" }}>
                        <motion.div
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card link-card"
                            style={{
                                padding: 24,
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            <div
                                style={{
                                    width: 54,
                                    height: 54,
                                    borderRadius: 14,
                                    background: "rgba(139,92,246,0.1)",
                                    border: "1px solid rgba(139,92,246,0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <TrendingUp size={24} color="#8b5cf6" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 4 }}>
                                    Ver Produtos
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                    Gerencie e analise as margens
                                </div>
                            </div>
                            <ArrowRight size={20} color="var(--text-muted)" />
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/quotation" style={{ textDecoration: "none" }}>
                        <motion.div
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card link-card"
                            style={{
                                padding: 24,
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                            }}
                        >
                            <div
                                style={{
                                    width: 54,
                                    height: 54,
                                    borderRadius: 14,
                                    background: "rgba(34,197,94,0.1)",
                                    border: "1px solid rgba(34,197,94,0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <CheckCircle2 size={24} color="#22c55e" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 4 }}>
                                    Gerar Orçamentos
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                    Exporte PDFs e planilhas finais
                                </div>
                            </div>
                            <ArrowRight size={20} color="var(--text-muted)" />
                        </motion.div>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}

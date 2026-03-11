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
    Activity,
    DollarSign,
    FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Stats {
    total_projects: number;
    total_products: number;
    total_offers: number;
    approved_products: number;
    areaChartData?: { name: string; uv: number }[];
    barChartData?: { name: string; economia: number }[];
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

    // Use data from backend or empty arrays while loading
    const areaChartData = stats?.areaChartData || [];
    const barChartData = stats?.barChartData || [];

    return (
        <div>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col md:flex-row justify-between items-start md:items-end gap-5 mb-10"
            >
                <div>
                    <h1 style={{
                        fontSize: 32,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                        marginBottom: 8,
                        color: "var(--text-primary)"
                    }}>
                        Visão Geral
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
                        Bem-vindo de volta, {user?.name?.split(" ")[0]}. Aqui está o resumo das suas análises de preços.
                    </p>
                </div>
                <div className="flex flex-row w-full md:w-auto gap-3 mt-4 md:mt-0">
                    <Link href="/dashboard/quotation" className="flex-1 md:flex-none">
                        <button className="btn-secondary w-full" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <ArrowRight size={16} /> <span className="hidden sm:inline">Exportar Relatório</span><span className="sm:hidden">Exportar</span>
                        </button>
                    </Link>
                    <Link href="/dashboard/upload" className="flex-1 md:flex-none">
                        <button className="btn-primary w-full" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <Upload size={16} /> Nova Análise
                        </button>
                    </Link>
                </div>
            </motion.div>

            {/* Smart Stats Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 20,
                    marginBottom: 40,
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
                            style={{
                                padding: 24,
                                position: "relative",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                            }}
                        >
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 16,
                            }}>
                                <span style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>{card.label}</span>
                                <div style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    background: card.bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: `1px solid ${card.color}30`
                                }}>
                                    <Icon size={18} color={card.color} strokeWidth={2} />
                                </div>
                            </div>

                            <div style={{
                                fontSize: 32,
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                letterSpacing: "-0.02em",
                                display: "flex",
                                alignItems: "baseline",
                                gap: 8
                            }}>
                                {loading ? <div className="skeleton" style={{ width: 60, height: 38, borderRadius: 6 }} /> : card.value}
                                {!loading && i === 1 && <span style={{ fontSize: 13, color: "var(--success)" }}>+12%</span>}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Charts Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10"
            >
                {/* Area Chart */}
                <div className="glass-card lg:col-span-2" style={{ padding: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Atividade de Análise</h3>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Produtos processados nos últimos 7 dias</p>
                        </div>
                        <Activity size={20} color="var(--text-muted)" />
                    </div>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Area type="monotone" dataKey="uv" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorUv)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Maiores Economias</h3>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Top 4 produtos com maior variação de preço</p>
                        </div>
                        <DollarSign size={20} color="var(--text-muted)" />
                    </div>
                    <div style={{ height: 300, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}
                                    itemStyle={{ color: 'var(--success)' }}
                                />
                                <Bar dataKey="economia" fill="var(--success)" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </motion.div>

            {/* Quick Actions (Portal Cards) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 4, height: 24, background: "var(--accent)", borderRadius: 4 }} />
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>Acesso Rápido</h2>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                    <Link href="/dashboard/upload" style={{ textDecoration: "none" }}>
                        <motion.div
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card link-card"
                            style={{
                                padding: "24px",
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                                cursor: "pointer",
                            }}
                        >
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "var(--accent)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    boxShadow: "0 4px 20px var(--accent-glow)"
                                }}
                            >
                                <Upload size={22} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
                                    Importar Lista PDF
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                    Inicie uma nova cotação agora
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/products" style={{ textDecoration: "none" }}>
                        <motion.div
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card link-card"
                            style={{
                                padding: "24px",
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                                cursor: "pointer",
                            }}
                        >
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "rgba(34, 197, 94, 0.1)",
                                    border: "1px solid rgba(34, 197, 94, 0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <CheckCircle2 size={22} color="var(--success)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
                                    Aprovar Produtos
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                    Revise margens e aprove itens
                                </div>
                            </div>
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/quotation" style={{ textDecoration: "none" }}>
                        <motion.div
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="glass-card link-card"
                            style={{
                                padding: "24px",
                                display: "flex",
                                alignItems: "center",
                                gap: 20,
                                cursor: "pointer",
                            }}
                        >
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 12,
                                    background: "rgba(245, 158, 11, 0.1)",
                                    border: "1px solid rgba(245, 158, 11, 0.2)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <FileSpreadsheet size={22} color="var(--warning)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
                                    Gerar Orçamento Final
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                                    Exporte PDFs e planilhas finais
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}

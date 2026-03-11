"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
    BarChart3,
    TrendingDown,
    TrendingUp,
    Minus,
    Activity,
    ArrowDownUp,
    Hash,
} from "lucide-react";

export default function AnalysisPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [products, setProducts] = useState<any[]>([]);
    const [statsMap, setStatsMap] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.projects
            .list()
            .then((data: any) => {
                setProjects(data.projects);
                if (data.projects.length > 0) setSelectedProject(data.projects[0].id);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedProject) {
            setLoading(true);
            api.products
                .list(selectedProject)
                .then(async (data: any) => {
                    setProducts(data);
                    const statsEntries: Record<string, any> = {};
                    for (const product of data) {
                        try {
                            const stats: any = await api.offers.stats(product.id);
                            statsEntries[product.id] = stats;
                        } catch {
                            statsEntries[product.id] = null;
                        }
                    }
                    setStatsMap(statsEntries);
                })
                .finally(() => setLoading(false));
        }
    }, [selectedProject]);

    const statCard = (
        label: string,
        value: string,
        icon: any,
        color: string,
        bg: string
    ) => {
        const Icon = icon;
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    background: bg,
                    borderRadius: 10,
                    minWidth: 140,
                }}
            >
                <Icon size={18} color={color} />
                <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Análise de Preços</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 24 }}>
                    Inteligência de mercado com estatísticas por produto
                </p>
            </motion.div>

            <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="input-field"
                style={{ width: 260, padding: "10px 14px", marginBottom: 24 }}
            >
                <option value="">Selecione o projeto</option>
                {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                ))}
            </select>

            {loading ? (
                <div style={{ display: "grid", gap: 16 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div
                    className="glass-card"
                    style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}
                >
                    <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <div>Nenhum produto para analisar</div>
                </div>
            ) : (
                <div style={{ display: "grid", gap: 16 }}>
                    {products.map((product, idx) => {
                        const stats = statsMap[product.id];
                        return (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="glass-card"
                                style={{ padding: 24 }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        marginBottom: 16,
                                        flexWrap: "wrap",
                                        gap: 8,
                                    }}
                                >
                                    <div>
                                        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                                            {product.name}
                                        </h3>
                                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                            Qtd: {product.quantity}
                                        </span>
                                    </div>
                                    <span
                                        className={`badge badge-${product.status.toLowerCase()}`}
                                    >
                                        {product.status}
                                    </span>
                                </div>

                                {stats && stats.total_offers > 0 ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 10,
                                        }}
                                    >
                                        {statCard(
                                            "Menor",
                                            formatCurrency(stats.min_price),
                                            TrendingDown,
                                            "#22c55e",
                                            "rgba(34,197,94,0.08)"
                                        )}
                                        {statCard(
                                            "Médio",
                                            formatCurrency(stats.avg_price),
                                            Minus,
                                            "#f59e0b",
                                            "rgba(245,158,11,0.08)"
                                        )}
                                        {statCard(
                                            "Maior",
                                            formatCurrency(stats.max_price),
                                            TrendingUp,
                                            "#ef4444",
                                            "rgba(239,68,68,0.08)"
                                        )}
                                        {statCard(
                                            "Desvio",
                                            formatCurrency(stats.std_deviation),
                                            Activity,
                                            "#6366f1",
                                            "rgba(99,102,241,0.08)"
                                        )}
                                        {statCard(
                                            "Variação",
                                            formatPercent(stats.price_variation_pct),
                                            ArrowDownUp,
                                            "#8b5cf6",
                                            "rgba(139,92,246,0.08)"
                                        )}
                                        {statCard(
                                            "Ofertas",
                                            stats.total_offers.toString(),
                                            Hash,
                                            "#a855f7",
                                            "rgba(168,85,247,0.08)"
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            padding: "16px",
                                            background: "rgba(99,102,241,0.05)",
                                            borderRadius: 8,
                                            fontSize: 13,
                                            color: "var(--text-muted)",
                                            textAlign: "center",
                                        }}
                                    >
                                        Nenhuma oferta encontrada. Busque preços na página de Produtos.
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
    FileSpreadsheet,
    Download,
    Loader2,
    CheckCircle2,
    ExternalLink,
    AlertCircle,
    RefreshCw,
} from "lucide-react";

export default function QuotationPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [quotation, setQuotation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");

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
            loadQuotation();
        }
    }, [selectedProject]);

    const loadQuotation = async () => {
        if (!selectedProject) return;
        setLoading(true);
        try {
            const data: any = await api.quotations.get(selectedProject);
            setQuotation(data);
            setError("");
        } catch {
            setQuotation(null);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedProject) return;
        setGenerating(true);
        setError("");
        try {
            const data: any = await api.quotations.generate(selectedProject);
            setQuotation(data);
        } catch (err: any) {
            setError(err.message || "Erro ao gerar orçamento");
        } finally {
            setGenerating(false);
        }
    };

    const handleExport = async () => {
        if (!selectedProject) return;
        setExporting(true);
        try {
            await api.quotations.export(selectedProject);
        } catch (err: any) {
            setError(err.message || "Erro ao exportar");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Orçamento Final</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 24 }}>
                    Gere e exporte o orçamento final com preços sugeridos
                </p>
            </motion.div>

            {/* Controls */}
            <div
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 24,
                }}
            >
                <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="input-field"
                    style={{ width: 260, padding: "10px 14px" }}
                >
                    <option value="">Selecione o projeto</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleGenerate}
                    disabled={generating || !selectedProject}
                    className="btn-primary"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "10px 20px",
                    }}
                >
                    {generating ? (
                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    ) : (
                        <RefreshCw size={16} />
                    )}
                    {generating ? "Gerando..." : "Gerar Orçamento"}
                </button>

                {quotation && (
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="btn-secondary"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "10px 20px",
                            borderColor: "#22c55e",
                            color: "#22c55e",
                        }}
                    >
                        {exporting ? (
                            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                        ) : (
                            <Download size={16} />
                        )}
                        Exportar Excel
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 16px",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        borderRadius: 10,
                        color: "var(--danger)",
                        fontSize: 14,
                        marginBottom: 20,
                    }}
                >
                    <AlertCircle size={18} />
                    {error}
                </motion.div>
            )}

            {loading ? (
                <div style={{ display: "grid", gap: 12 }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 60, borderRadius: 10 }} />
                    ))}
                </div>
            ) : !quotation ? (
                <div
                    className="glass-card"
                    style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}
                >
                    <FileSpreadsheet size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <div style={{ marginBottom: 8 }}>Nenhum orçamento gerado ainda</div>
                    <div style={{ fontSize: 13 }}>
                        Aprove produtos e clique em &quot;Gerar Orçamento&quot; para criar
                    </div>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Summary cards */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: 12,
                            marginBottom: 24,
                        }}
                    >
                        <div className="glass-card" style={{ padding: 20 }}>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Total Custo</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--warning)" }}>
                                {formatCurrency(quotation.total_cost)}
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: 20 }}>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Total Sugerido</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--success)" }}>
                                {formatCurrency(quotation.total_suggested)}
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: 20 }}>
                            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Itens</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>
                                {quotation.items.length}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card" style={{ overflow: "auto" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Produto</th>
                                    <th>Qtd</th>
                                    <th>Custo</th>
                                    <th>Margem</th>
                                    <th>Preço Sugerido</th>
                                    <th>Total</th>
                                    <th>Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotation.items.map((item: any) => (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 500, maxWidth: 250 }}>{item.product_name}</td>
                                        <td>{item.quantity}</td>
                                        <td>{formatCurrency(item.cost)}</td>
                                        <td>
                                            <span className="badge badge-processing">
                                                {formatPercent(item.margin)}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600, color: "var(--success)" }}>
                                            {formatCurrency(item.suggested_price)}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>
                                            {formatCurrency(item.suggested_price * item.quantity)}
                                        </td>
                                        <td>
                                            {item.product_url ? (
                                                <a
                                                    href={item.product_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 4,
                                                        color: "var(--accent)",
                                                        fontSize: 13,
                                                    }}
                                                >
                                                    <ExternalLink size={14} />
                                                    Ver
                                                </a>
                                            ) : (
                                                <span style={{ color: "var(--text-muted)" }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

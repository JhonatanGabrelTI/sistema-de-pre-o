"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
    FileSpreadsheet,
    FileText,
    Loader2,
    CheckCircle2,
    ExternalLink,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function QuotationPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [quotation, setQuotation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportingExcel, setExportingExcel] = useState(false);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // Reset page when project changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedProject]);

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

    const handleExport = () => {
        if (!selectedProject || !quotation) return;
        setExporting(true);
        try {
            const doc = new jsPDF();

            // Header
            doc.setFontSize(22);
            doc.setTextColor(99, 102, 241); // Accent color
            doc.text("Preço Inteligente", 14, 20);

            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            const project = projects.find(p => p.id === selectedProject);
            doc.text(`Orçamento Final: ${project?.name || "Projeto"}`, 14, 30);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 14, 38);

            // Summary Info
            doc.setFontSize(11);
            doc.setTextColor(20, 20, 20);
            doc.text(`Total de Itens: ${quotation.items.length}`, 14, 48);
            doc.text(`Custo Total: ${formatCurrency(quotation.total_cost)}`, 14, 54);
            doc.setTextColor(34, 197, 94); // Success color
            doc.text(`Total Sugerido de Venda: ${formatCurrency(quotation.total_suggested)}`, 14, 60);

            // Table Data
            const tableColumn = ["Produto", "Qtd", "Custo Unitário", "Margem", "Preço Sugerido", "Total"];
            const tableRows: any[] = [];

            quotation.items.forEach((item: any) => {
                const itemData = [
                    item.product_name,
                    item.quantity,
                    formatCurrency(item.cost),
                    formatPercent(item.margin),
                    formatCurrency(item.suggested_price),
                    formatCurrency(item.suggested_price * item.quantity),
                ];
                tableRows.push(itemData);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 70,
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [99, 102, 241], textColor: 255 },
                alternateRowStyles: { fillColor: [245, 245, 245] },
            });

            // Save PDF
            doc.save(`orcamento_${project?.name?.replace(/\s+/g, "_").toLowerCase() || "doc"}.pdf`);

        } catch (err: any) {
            setError(err.message || "Erro ao gerar PDF");
        } finally {
            setExporting(false);
        }
    };

    const handleExportExcel = async () => {
        if (!selectedProject) return;
        setExportingExcel(true);
        try {
            const project = projects.find(p => p.id === selectedProject);
            const token = localStorage.getItem("token");
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quotations/export/${selectedProject}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Erro ao gerar planilha");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orcamento_${project?.name?.replace(/\s+/g, "_").toLowerCase() || "doc"}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err: any) {
            setError(err.message || "Erro ao exportar Excel");
        } finally {
            setExportingExcel(false);
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
                    <div style={{ display: "flex", gap: 12 }}>
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
                                <FileText size={16} />
                            )}
                            Exportar PDF
                        </button>

                        <button
                            onClick={handleExportExcel}
                            disabled={exportingExcel}
                            className="btn-secondary"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "10px 20px",
                                borderColor: "#3b82f6",
                                color: "#3b82f6",
                            }}
                        >
                            {exportingExcel ? (
                                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                            ) : (
                                <FileSpreadsheet size={16} />
                            )}
                            Exportar Excel
                        </button>
                    </div>
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
                                {quotation.items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item: any) => (
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

                        {/* Pagination Controls */}
                        {quotation.items.length > ITEMS_PER_PAGE && (
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "16px 20px",
                                borderTop: "1px solid var(--border)",
                                background: "rgba(0,0,0,0.2)"
                            }}>
                                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                                    Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, quotation.items.length)} de {quotation.items.length} itens
                                </div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="btn-secondary"
                                        style={{ padding: "6px 12px", fontSize: 13, opacity: currentPage === 1 ? 0.5 : 1 }}
                                    >
                                        Anterior
                                    </button>
                                    <span style={{ fontSize: 14, fontWeight: 500, margin: "0 8px" }}>
                                        {currentPage} de {Math.max(1, Math.ceil(quotation.items.length / ITEMS_PER_PAGE))}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(quotation.items.length / ITEMS_PER_PAGE)), p + 1))}
                                        disabled={currentPage === Math.max(1, Math.ceil(quotation.items.length / ITEMS_PER_PAGE))}
                                        className="btn-secondary"
                                        style={{ padding: "6px 12px", fontSize: 13, opacity: currentPage === Math.max(1, Math.ceil(quotation.items.length / ITEMS_PER_PAGE)) ? 0.5 : 1 }}
                                    >
                                        Próxima
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
}

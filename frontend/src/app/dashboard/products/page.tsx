"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import {
    Package,
    Search,
    Check,
    X,
    Clock,
    ChevronDown,
    ShoppingBag,
    Loader2,
    Trash2,
    ExternalLink,
} from "lucide-react";

export default function ProductsPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [globalMargin, setGlobalMargin] = useState("");
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        api.projects
            .list()
            .then((data: any) => {
                setProjects(data.projects);
                if (data.projects.length > 0) {
                    setSelectedProject(data.projects[0].id);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selectedProject) {
            setLoading(true);
            api.products
                .list(selectedProject)
                .then((data: any) => setProducts(data))
                .finally(() => setLoading(false));
        }
    }, [selectedProject]);

    const updateStatus = async (id: string, status: string) => {
        await api.products.updateStatus(id, status);
        setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, status } : p))
        );
    };

    const updateMargin = async (id: string, margin: number) => {
        await api.products.updateMargin(id, margin);
        setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, margin } : p))
        );
    };

    const deleteProduct = async (id: string) => {
        if (!confirm("Tem certeza que deseja remover este produto?")) return;
        await api.products.delete(id);
        setProducts((prev) => prev.filter((p) => p.id !== id));
    };

    const applyGlobalMargin = async () => {
        if (!globalMargin || !selectedProject) return;
        await api.products.bulkMargin(selectedProject, parseFloat(globalMargin));
        setProducts((prev) =>
            prev.map((p) => ({ ...p, margin: parseFloat(globalMargin) }))
        );
    };

    const searchAllPrices = async () => {
        if (!selectedProject) return;
        setSearching(true);
        try {
            await api.offers.searchAll(selectedProject, true);
            // Refresh products to show updated statuses/counts
            const data: any = await api.products.list(selectedProject);
            setProducts(data);
        } finally {
            setSearching(false);
        }
    };

    const filtered = products.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === "ALL" || p.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const statusBadge = (status: string) => {
        const map: Record<string, { cls: string; icon: any }> = {
            PENDING: { cls: "badge-pending", icon: Clock },
            APPROVED: { cls: "badge-approved", icon: Check },
            DISCARDED: { cls: "badge-discarded", icon: X },
        };
        const s = map[status] || map.PENDING;
        const Icon = s.icon;
        return (
            <span className={`badge ${s.cls}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon size={12} />
                {status === "PENDING" ? "Pendente" : status === "APPROVED" ? "Aprovado" : "Descartado"}
            </span>
        );
    };

    return (
        <div>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Produtos</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 24 }}>
                    Gerencie os produtos extraídos dos seus PDFs
                </p>
            </motion.div>

            {/* Controls */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 20,
                    alignItems: "center",
                }}
            >
                {/* Project selector */}
                <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="input-field"
                    style={{ width: 220, padding: "10px 14px" }}
                >
                    <option value="">Selecione o projeto</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>

                {/* Search */}
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                    <Search
                        size={16}
                        style={{
                            position: "absolute",
                            left: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)",
                        }}
                    />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar produto..."
                        className="input-field"
                        style={{ paddingLeft: 36 }}
                    />
                </div>

                {/* Status filter */}
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="input-field"
                    style={{ width: 150, padding: "10px 14px" }}
                >
                    <option value="ALL">Todos</option>
                    <option value="PENDING">Pendentes</option>
                    <option value="APPROVED">Aprovados</option>
                    <option value="DISCARDED">Descartados</option>
                </select>

                <button
                    onClick={searchAllPrices}
                    disabled={searching}
                    className={`btn-primary ${searching ? 'animate-pulse' : ''}`}
                    style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 160, justifyContent: "center" }}
                >
                    {searching ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <ShoppingBag size={18} />
                    )}
                    {searching ? "Buscando..." : "Buscar Preços"}
                </button>
            </motion.div>

            {/* Global margin */}
            <div
                style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 20,
                    padding: "12px 16px",
                    background: "var(--bg-card)",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                }}
            >
                <span style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>Margem global (%):</span>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                        type="number"
                        value={globalMargin}
                        onChange={(e) => setGlobalMargin(e.target.value)}
                        placeholder="Ex: 5"
                        className="input-field"
                        style={{ width: 80, paddingRight: 30 }}
                    />
                    <span style={{ position: "absolute", right: 10, color: "var(--text-muted)", fontSize: 13 }}>%</span>
                </div>
                <button onClick={applyGlobalMargin} className="btn-secondary" style={{ padding: "10px 16px" }}>
                    Aplicar em Todos
                </button>
            </div>

            {/* Table */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="glass-card"
                style={{ overflow: "auto" }}
            >
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th>Qtd</th>
                            <th>Custo Unit.</th>
                            <th>Custo Total</th>
                            <th>Margem (%)</th>
                            <th>Sugestão Venda (Unid.)</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <td key={j}>
                                            <div className="skeleton" style={{ height: 20, width: "80%" }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                                    <Package size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                                    <div>Nenhum produto encontrado</div>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((product) => (
                                <tr key={product.id}>
                                    <td style={{ fontWeight: 500, maxWidth: 300 }}>{product.name}</td>
                                    <td>{product.quantity}</td>
                                    <td>
                                        <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                                            {product.min_price
                                                ? `R$ ${product.min_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                : (searching ? "Buscando..." : "Pendente")}
                                        </div>
                                        {product.min_price && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11, color: "var(--text-secondary)" }}>
                                                <span>{product.best_offer_marketplace}</span>
                                                {product.best_offer_url && (
                                                    <a
                                                        href={product.best_offer_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: "var(--accent)", display: "flex" }}
                                                        title="Ver no site"
                                                    >
                                                        <ExternalLink size={10} />
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                                            {product.min_price ? `R$ ${(product.min_price * product.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "---"}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                value={product.margin}
                                                onChange={(e) => updateMargin(product.id, parseFloat(e.target.value) || 0)}
                                                className="input-field"
                                                style={{ width: 70, padding: "6px 25px 6px 10px", fontSize: 13 }}
                                            />
                                            <span style={{ position: 'absolute', right: 8, color: 'var(--text-muted)', fontSize: 11 }}>%</span>
                                        </div>
                                    </td>
                                    <td style={{ color: "var(--accent)", fontWeight: 700 }}>
                                        {product.min_price
                                            ? `R$ ${(product.min_price * (1 + product.margin / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                            : "---"
                                        }
                                    </td>
                                    <td>{statusBadge(product.status)}</td>
                                    <td>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button
                                                onClick={() => updateStatus(product.id, "APPROVED")}
                                                style={{
                                                    background: product.status === "APPROVED" ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.08)",
                                                    border: "1px solid rgba(34,197,94,0.3)",
                                                    borderRadius: 8,
                                                    padding: "6px 10px",
                                                    color: "#22c55e",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    fontSize: 12,
                                                }}
                                            >
                                                <Check size={14} /> Aprovar
                                            </button>
                                            <button
                                                onClick={() => updateStatus(product.id, "DISCARDED")}
                                                style={{
                                                    background: product.status === "DISCARDED" ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.08)",
                                                    border: "1px solid rgba(239,68,68,0.3)",
                                                    borderRadius: 8,
                                                    padding: "6px 10px",
                                                    color: "#ef4444",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    fontSize: 12,
                                                }}
                                            >
                                                <X size={14} /> Descartar
                                            </button>
                                            <button
                                                onClick={() => deleteProduct(product.id)}
                                                style={{
                                                    background: "rgba(239,68,68,0.05)",
                                                    border: "1px solid rgba(239,68,68,0.2)",
                                                    borderRadius: 8,
                                                    padding: "6px 10px",
                                                    color: "#f87171",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    fontSize: 12,
                                                }}
                                                title="Remover produto"
                                            >
                                                <Trash2 size={14} /> Remover
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </motion.div>
        </div>
    );
}

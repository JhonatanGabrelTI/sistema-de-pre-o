"use client";

import { useEffect, useState, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
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
    return (
        <Suspense fallback={<div className="skeleton" style={{ height: "100vh", width: "100%" }} />}>
            <ProductsContent />
        </Suspense>
    );
}

function ProductsContent() {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 50;
    const [globalMargin, setGlobalMargin] = useState("");
    const [searching, setSearching] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);

    const searchParams = useSearchParams();
    const urlProjectId = searchParams.get("projectId");

    useEffect(() => {
        api.projects
            .list()
            .then((data: any) => {
                setProjects(data.projects);
                // If projectId in URL, select it, otherwise default to first project
                if (urlProjectId) {
                    setSelectedProject(urlProjectId);
                } else if (data.projects.length > 0) {
                    setSelectedProject(data.projects[0].id);
                }
            })
            .finally(() => setLoading(false));
    }, [urlProjectId]);

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

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginatedProducts = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset pagination when search or status filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, selectedProject]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedProductIds(paginatedProducts.map(p => p.id));
        } else {
            setSelectedProductIds([]);
        }
    };

    const handleSelect = (id: string) => {
        setSelectedProductIds(prev => 
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const bulkUpdateStatus = async (status: string) => {
        if (selectedProductIds.length === 0) return;
        const actionName = status === "APPROVED" ? "aprovar" : "descartar";
        if (!confirm(`Tem certeza que deseja ${actionName} ${selectedProductIds.length} produtos?`)) return;
        
        setIsUpdating(true);
        try {
            await Promise.all(selectedProductIds.map(id => api.products.updateStatus(id, status)));
            setProducts(prev => prev.map(p => selectedProductIds.includes(p.id) ? { ...p, status } : p));
            setSelectedProductIds([]);
        } finally {
            setIsUpdating(false);
        }
    };

    const bulkDelete = async () => {
        if (selectedProductIds.length === 0) return;
        if (!confirm(`Tem certeza que deseja remover ${selectedProductIds.length} produtos?`)) return;
        
        setIsUpdating(true);
        try {
            await Promise.all(selectedProductIds.map(id => api.products.delete(id)));
            setProducts(prev => prev.filter(p => !selectedProductIds.includes(p.id)));
            setSelectedProductIds([]);
        } finally {
            setIsUpdating(false);
        }
    };

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

            {/* Bulk Actions */}
            {selectedProductIds.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }}
                    style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        marginBottom: 20,
                        padding: "12px 16px",
                        background: "rgba(99, 102, 241, 0.05)",
                        borderRadius: 10,
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                    }}
                >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>
                        {selectedProductIds.length} selecionado{selectedProductIds.length > 1 ? "s" : ""}
                    </span>
                    <div style={{ width: 1, height: 24, background: "rgba(99, 102, 241, 0.2)", margin: "0 8px" }} />
                    <button 
                        onClick={() => bulkUpdateStatus("APPROVED")} 
                        disabled={isUpdating}
                        className="btn-secondary" 
                        style={{ padding: "8px 14px", display: "flex", gap: 6, alignItems: "center", borderColor: "rgba(34,197,94,0.3)", color: "#22c55e", fontSize: 13 }}
                    >
                        <Check size={14} /> Aprovar Selecionados
                    </button>
                    <button 
                        onClick={() => bulkUpdateStatus("DISCARDED")} 
                        disabled={isUpdating}
                        className="btn-secondary" 
                        style={{ padding: "8px 14px", display: "flex", gap: 6, alignItems: "center", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444", fontSize: 13 }}
                    >
                        <X size={14} /> Descartar Selecionados
                    </button>
                    <button 
                        onClick={bulkDelete} 
                        disabled={isUpdating}
                        className="btn-secondary" 
                        style={{ padding: "8px 14px", display: "flex", gap: 6, alignItems: "center", borderColor: "rgba(239,68,68,0.3)", color: "#f87171", marginLeft: "auto", fontSize: 13 }}
                    >
                        <Trash2 size={14} /> Remover Selecionados
                    </button>
                </motion.div>
            )}

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
                            <th style={{ width: 40, textAlign: "center" }}>
                                <input 
                                    type="checkbox" 
                                    checked={filtered.length > 0 && selectedProductIds.length === filtered.length}
                                    onChange={handleSelectAll}
                                    style={{ cursor: "pointer", width: 16, height: 16 }}
                                />
                            </th>
                            <th>Lote</th>
                            <th>Produto</th>
                            <th>Unid.</th>
                            <th>Qtd</th>
                            <th>V. Unit. Edital</th>
                            <th>Custo Unit.</th>
                            <th>Acessar Link</th>
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
                                    {Array.from({ length: 13 }).map((_, j) => (
                                        <td key={j}>
                                            <div className="skeleton" style={{ height: 20, width: "80%" }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={13} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                                    <Package size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
                                    <div>Nenhum produto encontrado</div>
                                </td>
                            </tr>
                        ) : (
                            paginatedProducts.map((product) => (
                                <tr key={product.id} style={{ background: selectedProductIds.includes(product.id) ? "rgba(99, 102, 241, 0.05)" : "transparent" }}>
                                    <td style={{ textAlign: "center" }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedProductIds.includes(product.id)}
                                            onChange={() => handleSelect(product.id)}
                                            style={{ cursor: "pointer", width: 16, height: 16 }}
                                        />
                                    </td>
                                    <td>
                                        <span style={{ background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: 4, fontSize: 13, border: "1px solid rgba(255,255,255,0.1)", whiteSpace: "nowrap" }}>
                                            {product.numero_lote || "-"}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 500, maxWidth: 300 }}>{product.name}</td>
                                    <td style={{ color: "var(--text-secondary)", fontSize: 13 }}>{product.unidade_medida || "un"}</td>
                                    <td>{product.quantity}</td>
                                    <td>
                                        <div style={{ color: "var(--text-secondary)", fontSize: 13, whiteSpace: "nowrap" }}>
                                            {product.valor_unitario_estimado ? `R$ ${product.valor_unitario_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "-"}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                                            {product.min_price
                                                ? `R$ ${product.min_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                                : (searching ? "Buscando..." : "Pendente")}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                                            {/* Best Offer Link */}
                                            {product.min_price ? (
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                                                    {product.best_offer_url ? (
                                                        <a
                                                            href={product.best_offer_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                gap: 6,
                                                                fontSize: 12,
                                                                color: "white",
                                                                background: "var(--accent)",
                                                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                                                padding: "6px 12px",
                                                                borderRadius: 8,
                                                                textDecoration: "none",
                                                                fontWeight: 600,
                                                                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                                                boxShadow: "0 2px 8px var(--accent-glow)",
                                                                whiteSpace: "nowrap",
                                                                width: "100%"
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.background = "var(--accent-hover)";
                                                                e.currentTarget.style.transform = "translateY(-1px)";
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.background = "var(--accent)";
                                                                e.currentTarget.style.transform = "translateY(0)";
                                                            }}
                                                            title={`Acessar oferta econômica no ${product.best_marketplace}`}
                                                        >
                                                            Econômico
                                                            <ExternalLink size={12} />
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                                                            {product.best_marketplace || "S/ Link"}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: "var(--text-muted)" }}>---</span>
                                            )}

                                            {/* Mid Offer Link */}
                                            {product.mid_price && (
                                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                                                    <a
                                                        href={product.mid_offer_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: 6,
                                                            fontSize: 12,
                                                            color: "var(--text-primary)",
                                                            background: "rgba(255, 255, 255, 0.05)",
                                                            border: "1px solid var(--border)",
                                                            padding: "6px 12px",
                                                            borderRadius: 8,
                                                            textDecoration: "none",
                                                            fontWeight: 600,
                                                            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                                            whiteSpace: "nowrap",
                                                            width: "100%"
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                                            e.currentTarget.style.transform = "translateY(-1px)";
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                                            e.currentTarget.style.transform = "translateY(0)";
                                                        }}
                                                        title={`Acessar oferta intermediária (+ -)`}
                                                    >
                                                        Intermediário
                                                        <ExternalLink size={12} />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
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

                {/* Pagination Controls */}
                {!loading && filtered.length > ITEMS_PER_PAGE && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "16px 20px",
                        borderTop: "1px solid var(--border)",
                        background: "rgba(0,0,0,0.2)"
                    }}>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} de {filtered.length} itens
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
                                {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="btn-secondary"
                                style={{ padding: "6px 12px", fontSize: 13, opacity: currentPage === totalPages ? 0.5 : 1 }}
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
    ShoppingBag,
    ExternalLink,
    Star,
    Truck,
    Clock,
    Plus,
    Loader2,
    Store,
} from "lucide-react";

const marketplaceColors: Record<string, { bg: string; color: string }> = {
    "Mercado Livre": { bg: "rgba(255,224,51,0.12)", color: "#ffe033" },
    Shopee: { bg: "rgba(238,77,45,0.12)", color: "#ee4d2d" },
    Amazon: { bg: "rgba(255,153,0,0.12)", color: "#ff9900" },
};

export default function OffersPage() {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [products, setProducts] = useState<any[]>([]);
    const [offersMap, setOffersMap] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [loadingOffer, setLoadingOffer] = useState<string>("");

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
                    const offers: Record<string, any[]> = {};
                    for (const product of data) {
                        try {
                            offers[product.id] = await api.offers.get(product.id);
                        } catch {
                            offers[product.id] = [];
                        }
                    }
                    setOffersMap(offers);
                })
                .finally(() => setLoading(false));
        }
    }, [selectedProject]);

    const handleAnotherOffer = async (productId: string) => {
        setLoadingOffer(productId);
        try {
            const offer: any = await api.offers.another(productId);
            setOffersMap((prev) => ({
                ...prev,
                [productId]: [...(prev[productId] || []), offer],
            }));
        } catch {
        } finally {
            setLoadingOffer("");
        }
    };

    return (
        <div>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Ofertas</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 24 }}>
                    Ofertas encontradas nos marketplaces para cada produto
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
                        <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="glass-card" style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
                    <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <div>Nenhum produto com ofertas</div>
                </div>
            ) : (
                <div style={{ display: "grid", gap: 24 }}>
                    {products.map((product) => {
                        const offers = offersMap[product.id] || [];
                        return (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card"
                                style={{ padding: 24 }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 16,
                                        flexWrap: "wrap",
                                        gap: 8,
                                    }}
                                >
                                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>{product.name}</h3>
                                    <button
                                        onClick={() => handleAnotherOffer(product.id)}
                                        disabled={loadingOffer === product.id}
                                        className="btn-secondary"
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            padding: "8px 14px",
                                            fontSize: 13,
                                        }}
                                    >
                                        {loadingOffer === product.id ? (
                                            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                                        ) : (
                                            <Plus size={14} />
                                        )}
                                        Outra oferta
                                    </button>
                                </div>

                                {offers.length === 0 ? (
                                    <div
                                        style={{
                                            padding: 24,
                                            textAlign: "center",
                                            color: "var(--text-muted)",
                                            fontSize: 13,
                                        }}
                                    >
                                        Nenhuma oferta. Busque preços na página de Produtos.
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                                            gap: 12,
                                        }}
                                    >
                                        {offers.map((offer: any, idx: number) => {
                                            const mp =
                                                marketplaceColors[offer.marketplace] ||
                                                marketplaceColors["Mercado Livre"];
                                            return (
                                                <div
                                                    key={offer.id || idx}
                                                    style={{
                                                        background: "var(--bg-secondary)",
                                                        border: "1px solid var(--border)",
                                                        borderRadius: 12,
                                                        padding: 16,
                                                        transition: "all 0.15s",
                                                    }}
                                                >
                                                    {/* Marketplace badge */}
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            alignItems: "center",
                                                            marginBottom: 12,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                background: mp.bg,
                                                                color: mp.color,
                                                                padding: "4px 10px",
                                                                borderRadius: 20,
                                                                fontSize: 11,
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            <Store size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                                                            {offer.marketplace}
                                                        </span>
                                                        {offer.url && (
                                                            <a
                                                                href={offer.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    color: "var(--text-muted)",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                }}
                                                            >
                                                                <ExternalLink size={14} />
                                                            </a>
                                                        )}
                                                    </div>

                                                    {/* Title */}
                                                    <div
                                                        style={{
                                                            fontSize: 13,
                                                            color: "var(--text-secondary)",
                                                            marginBottom: 12,
                                                            lineHeight: 1.4,
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: "vertical",
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {offer.title || offer.marketplace}
                                                    </div>

                                                    {/* Price */}
                                                    <div
                                                        style={{
                                                            fontSize: 22,
                                                            fontWeight: 700,
                                                            color: "var(--text-primary)",
                                                            marginBottom: 12,
                                                        }}
                                                    >
                                                        {formatCurrency(offer.price)}
                                                    </div>

                                                    {/* Details */}
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexWrap: "wrap",
                                                            gap: 10,
                                                            fontSize: 12,
                                                            color: "var(--text-muted)",
                                                        }}
                                                    >
                                                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                            <Truck size={12} />
                                                            {offer.shipping > 0
                                                                ? formatCurrency(offer.shipping)
                                                                : "Grátis"}
                                                        </span>
                                                        {offer.delivery_days && (
                                                            <span
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                }}
                                                            >
                                                                <Clock size={12} />
                                                                {offer.delivery_days}d
                                                            </span>
                                                        )}
                                                        {offer.seller_rating && (
                                                            <span
                                                                style={{
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: 4,
                                                                }}
                                                            >
                                                                <Star size={12} />
                                                                {offer.seller_rating}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
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

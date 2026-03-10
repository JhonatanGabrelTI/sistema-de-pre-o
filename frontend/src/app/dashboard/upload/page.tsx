"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [projectName, setProjectName] = useState("");
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped?.type === "application/pdf") {
            setFile(dropped);
            setError("");
        } else {
            setError("Apenas arquivos PDF são aceitos");
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setError("");
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError("");
        try {
            const data: any = await api.projects.upload(file, projectName || file.name.replace(".pdf", ""));
            setResult(data);
        } catch (err: any) {
            setError(err.message || "Erro ao processar PDF");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Upload de PDF</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 32 }}>
                    Envie um PDF contendo lista de produtos para análise automática
                </p>
            </motion.div>

            {!result ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card"
                    style={{ padding: 32, maxWidth: 600 }}
                >
                    {/* Project name */}
                    <div style={{ marginBottom: 24 }}>
                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontSize: 13,
                                fontWeight: 500,
                                color: "var(--text-secondary)",
                            }}
                        >
                            Nome do projeto (opcional)
                        </label>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Ex: Orçamento Material de Escritório"
                            className="input-field"
                        />
                    </div>

                    {/* Drop zone */}
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById("file-input")?.click()}
                        style={{
                            border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
                            borderRadius: 16,
                            padding: 48,
                            textAlign: "center",
                            cursor: "pointer",
                            background: dragging ? "var(--accent-glow)" : "transparent",
                            transition: "all 0.2s",
                            marginBottom: 24,
                        }}
                    >
                        <input
                            id="file-input"
                            type="file"
                            accept=".pdf"
                            onChange={handleFileSelect}
                            style={{ display: "none" }}
                        />
                        <Upload
                            size={40}
                            color={dragging ? "var(--accent)" : "var(--text-muted)"}
                            style={{ marginBottom: 16 }}
                        />
                        <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
                            {dragging ? "Solte o arquivo aqui" : "Arraste e solte o PDF aqui"}
                        </p>
                        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                            ou clique para selecionar (máx 10MB)
                        </p>
                    </div>

                    {/* Selected file */}
                    {file && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "12px 16px",
                                background: "rgba(99,102,241,0.08)",
                                borderRadius: 10,
                                marginBottom: 24,
                            }}
                        >
                            <FileText size={20} color="var(--accent)" />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{file.name}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                }}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    cursor: "pointer",
                                }}
                            >
                                <X size={18} />
                            </button>
                        </motion.div>
                    )}

                    {/* Error */}
                    {error && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "10px 14px",
                                background: "rgba(239,68,68,0.1)",
                                border: "1px solid rgba(239,68,68,0.3)",
                                borderRadius: 8,
                                color: "var(--danger)",
                                fontSize: 13,
                                marginBottom: 16,
                            }}
                        >
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {/* Upload button */}
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="btn-primary"
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "14px 24px",
                        }}
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                                Processando PDF...
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Enviar e Processar
                            </>
                        )}
                    </button>
                </motion.div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card"
                    style={{ padding: 32, maxWidth: 600, textAlign: "center" }}
                >
                    <div
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: "50%",
                            background: "rgba(34,197,94,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px",
                        }}
                    >
                        <CheckCircle2 size={32} color="#22c55e" />
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>PDF Processado!</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 8 }}>
                        Projeto: <strong>{result.name}</strong>
                    </p>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
                        {result.product_count} produtos extraídos
                    </p>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                        <button
                            onClick={() => router.push("/dashboard/products")}
                            className="btn-primary"
                            style={{ padding: "12px 24px" }}
                        >
                            Ver Produtos
                        </button>
                        <button
                            onClick={() => {
                                setFile(null);
                                setResult(null);
                                setProjectName("");
                            }}
                            className="btn-secondary"
                            style={{ padding: "12px 24px" }}
                        >
                            Novo Upload
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { Sparkles, Eye, EyeOff, ArrowRight, User } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (password.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres");
            return;
        }
        setLoading(true);
        try {
            await register(email, name, password);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Erro ao criar conta");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                    "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.12) 0%, var(--bg-primary) 60%)",
                padding: "20px",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: "20%",
                    right: "20%",
                    width: 300,
                    height: 300,
                    borderRadius: "50%",
                    background: "rgba(168,85,247,0.03)",
                    filter: "blur(80px)",
                    pointerEvents: "none",
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}
            >
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 56,
                            height: 56,
                            borderRadius: 16,
                            background: "var(--gradient-primary)",
                            marginBottom: 16,
                            boxShadow: "0 0 30px var(--accent-glow)",
                        }}
                    >
                        <Sparkles size={28} color="white" />
                    </motion.div>
                    <h1
                        style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}
                        className="gradient-text"
                    >
                        Criar Conta
                    </h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
                        Comece a usar o Preço Inteligente gratuitamente
                    </p>
                </div>

                <div
                    className="glass-card"
                    style={{ padding: 32, position: "relative", overflow: "hidden" }}
                >
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 2,
                            background: "linear-gradient(90deg, #8b5cf6, #6366f1, #a855f7)",
                        }}
                    />

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 20 }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: "var(--text-secondary)",
                                }}
                            >
                                Nome completo
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Seu nome"
                                className="input-field"
                                required
                            />
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: "var(--text-secondary)",
                                }}
                            >
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="seu@email.com"
                                className="input-field"
                                required
                            />
                        </div>

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
                                Senha
                            </label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    className="input-field"
                                    style={{ paddingRight: 44 }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: "absolute",
                                        right: 12,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "none",
                                        border: "none",
                                        color: "var(--text-muted)",
                                        cursor: "pointer",
                                        padding: 4,
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    padding: "10px 14px",
                                    background: "rgba(239,68,68,0.1)",
                                    border: "1px solid rgba(239,68,68,0.3)",
                                    borderRadius: 8,
                                    color: "var(--danger)",
                                    fontSize: 13,
                                    marginBottom: 16,
                                }}
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                fontSize: 15,
                                padding: "14px 24px",
                            }}
                        >
                            {loading ? (
                                <div
                                    style={{
                                        width: 20,
                                        height: 20,
                                        border: "2px solid rgba(255,255,255,0.3)",
                                        borderTopColor: "white",
                                        borderRadius: "50%",
                                        animation: "spin 0.6s linear infinite",
                                    }}
                                />
                            ) : (
                                <>
                                    Criar conta
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div
                        style={{
                            textAlign: "center",
                            marginTop: 24,
                            fontSize: 14,
                            color: "var(--text-secondary)",
                        }}
                    >
                        Já tem conta?{" "}
                        <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
                            Fazer login
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

const getApiBase = () => {
    // Na Vercel/Netlify, se não houver URL definida, usamos caminhos relativos
    if (typeof window !== "undefined") {
        if (window.location.hostname.includes("vercel.app") || window.location.hostname.includes("netlify.app")) {
            return ""; 
        }
    }
    
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
    }
    
    return ""; // Default to relative path to avoid breaking the build
};

const API_BASE = getApiBase();

if (typeof window !== "undefined") {
    console.log("Using API Base URL:", API_BASE || "(relative)");
}

function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData
    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
        throw new Error(error.detail || `HTTP ${res.status}`);
    }

    // Handle blob responses (Excel export)
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("spreadsheet") || contentType?.includes("octet-stream")) {
        return res.blob() as Promise<T>;
    }

    return res.json();
}

// Auth
export const api = {
    auth: {
        register: (data: { email: string; name: string; password: string }) =>
            request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
        login: (data: { email: string; password: string }) =>
            request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
        me: () => request("/api/auth/me"),
    },

    projects: {
        list: () => request<{ projects: any[]; total: number }>("/api/projects"),
        get: (id: string) => request(`/api/projects/${id}`),
        upload: (file: File, name: string, pagesConfig?: string) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("name", name);
            if (pagesConfig) {
                formData.append("pages_config", pagesConfig);
            }
            return request("/api/projects/upload", { method: "POST", body: formData });
        },
        uploadManual: (projectName: string, productName: string, quantity: number) => {
            const formData = new FormData();
            formData.append("name", projectName);
            formData.append("product_name", productName);
            formData.append("quantity", quantity.toString());
            return request("/api/projects/manual", { method: "POST", body: formData });
        },
        delete: (id: string) => request(`/api/projects/${id}`, { method: "DELETE" }),
    },

    products: {
        list: (projectId: string) => request<any[]>(`/api/products/project/${projectId}`),
        updateStatus: (id: string, status: string) =>
            request(`/api/products/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            }),
        updateMargin: (id: string, margin: number) =>
            request(`/api/products/${id}/margin`, {
                method: "PATCH",
                body: JSON.stringify({ margin }),
            }),
        bulkMargin: (projectId: string, margin: number) =>
            request(`/api/products/project/${projectId}/bulk-margin`, {
                method: "POST",
                body: JSON.stringify({ margin }),
            }),
        delete: (id: string) => request(`/api/products/${id}`, { method: "DELETE" }),
    },

    offers: {
        search: (productId: string) =>
            request<any[]>(`/api/offers/search/${productId}`, { method: "POST" }),
        get: (productId: string) => request<any[]>(`/api/offers/${productId}`),
        stats: (productId: string) => request(`/api/offers/${productId}/stats`),
        another: (productId: string) =>
            request(`/api/offers/${productId}/another`, { method: "POST" }),
        searchAll: (projectId: string, force: boolean = false) =>
            request(`/api/offers/search-all/${projectId}${force ? '?force=true' : ''}`, { method: "POST" }),
    },

    quotations: {
        generate: (projectId: string) =>
            request(`/api/quotations/generate/${projectId}`, { method: "POST" }),
        get: (projectId: string) => request(`/api/quotations/${projectId}`),
        export: async (projectId: string) => {
            const blob = await request<Blob>(`/api/quotations/export/${projectId}`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `orcamento.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        },
    },

    dashboard: {
        stats: () => request("/api/dashboard/stats"),
    },
};

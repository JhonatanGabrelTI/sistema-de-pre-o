module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/src/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "api",
    ()=>api
]);
const API_BASE = ("TURBOPACK compile-time value", "http://127.0.0.1:8000") || "http://127.0.0.1:8000";
function getToken() {
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
}
async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        ...options.headers
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
        headers
    });
    if (!res.ok) {
        const error = await res.json().catch(()=>({
                detail: "Erro desconhecido"
            }));
        throw new Error(error.detail || `HTTP ${res.status}`);
    }
    // Handle blob responses (Excel export)
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("spreadsheet") || contentType?.includes("octet-stream")) {
        return res.blob();
    }
    return res.json();
}
const api = {
    auth: {
        register: (data)=>request("/api/auth/register", {
                method: "POST",
                body: JSON.stringify(data)
            }),
        login: (data)=>request("/api/auth/login", {
                method: "POST",
                body: JSON.stringify(data)
            }),
        me: ()=>request("/api/auth/me")
    },
    projects: {
        list: ()=>request("/api/projects"),
        get: (id)=>request(`/api/projects/${id}`),
        upload: (file, name)=>{
            const formData = new FormData();
            formData.append("file", file);
            formData.append("name", name);
            return request("/api/projects/upload", {
                method: "POST",
                body: formData
            });
        },
        uploadManual: (projectName, productName, quantity)=>{
            const formData = new FormData();
            formData.append("name", projectName);
            formData.append("product_name", productName);
            formData.append("quantity", quantity.toString());
            return request("/api/projects/manual", {
                method: "POST",
                body: formData
            });
        },
        delete: (id)=>request(`/api/projects/${id}`, {
                method: "DELETE"
            })
    },
    products: {
        list: (projectId)=>request(`/api/products/project/${projectId}`),
        updateStatus: (id, status)=>request(`/api/products/${id}/status`, {
                method: "PATCH",
                body: JSON.stringify({
                    status
                })
            }),
        updateMargin: (id, margin)=>request(`/api/products/${id}/margin`, {
                method: "PATCH",
                body: JSON.stringify({
                    margin
                })
            }),
        bulkMargin: (projectId, margin)=>request(`/api/products/project/${projectId}/bulk-margin`, {
                method: "POST",
                body: JSON.stringify({
                    margin
                })
            }),
        delete: (id)=>request(`/api/products/${id}`, {
                method: "DELETE"
            })
    },
    offers: {
        search: (productId)=>request(`/api/offers/search/${productId}`, {
                method: "POST"
            }),
        get: (productId)=>request(`/api/offers/${productId}`),
        stats: (productId)=>request(`/api/offers/${productId}/stats`),
        another: (productId)=>request(`/api/offers/${productId}/another`, {
                method: "POST"
            }),
        searchAll: (projectId, force = false)=>request(`/api/offers/search-all/${projectId}${force ? '?force=true' : ''}`, {
                method: "POST"
            })
    },
    quotations: {
        generate: (projectId)=>request(`/api/quotations/generate/${projectId}`, {
                method: "POST"
            }),
        get: (projectId)=>request(`/api/quotations/${projectId}`),
        export: async (projectId)=>{
            const blob = await request(`/api/quotations/export/${projectId}`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `orcamento.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        }
    },
    dashboard: {
        stats: ()=>request("/api/dashboard/stats")
    }
};
}),
"[project]/src/lib/auth.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/api.ts [app-ssr] (ecmascript)");
"use client";
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])(undefined);
function AuthProvider({ children }) {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [token, setToken] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [isLoading, setIsLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const savedToken = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user");
        if (savedToken) {
            setToken(savedToken);
            if (savedUser) {
                try {
                    setUser(JSON.parse(savedUser));
                } catch (e) {
                    console.error("Erro ao ler user do cache", e);
                }
            }
            // Valida o token em background sem travar o loading inicial
            __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].auth.me().then((data)=>{
                setUser(data);
                localStorage.setItem("user", JSON.stringify(data));
            }).catch(()=>{
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                setToken(null);
                setUser(null);
            }).finally(()=>setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);
    const login = async (email, password)=>{
        const data = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].auth.login({
            email,
            password
        });
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.access_token);
        setUser(data.user);
    };
    const register = async (email, name, password)=>{
        const data = await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["api"].auth.register({
            email,
            name,
            password
        });
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setToken(data.access_token);
        setUser(data.user);
    };
    const logout = ()=>{
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: {
            user,
            token,
            isLoading,
            login,
            register,
            logout
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/src/lib/auth.tsx",
        lineNumber: 86,
        columnNumber: 9
    }, this);
}
function useAuth() {
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        if ("TURBOPACK compile-time truthy", 1) {
            if ("TURBOPACK compile-time truthy", 1) {
                module.exports = __turbopack_context__.r("[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)");
            } else //TURBOPACK unreachable
            ;
        } else //TURBOPACK unreachable
        ;
    }
} //# sourceMappingURL=module.compiled.js.map
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].ReactJsxDevRuntime; //# sourceMappingURL=react-jsx-dev-runtime.js.map
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-ssr] (ecmascript)").vendored['react-ssr'].React; //# sourceMappingURL=react.js.map
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__5cd1ad0f._.js.map
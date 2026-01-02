
import { BudgetRow, MasterData, RevisionMeta, RowType, ThemeConfig, UserRole, User } from './types';
import { defaultTheme } from './utils';
import { initialData } from './data';

const BASE_URL = 'https://sisara.onrender.com';

// Mock Storage for Session (Simulates Database)
let MOCK_USERS_STORE = [
    { username: "ppk_user", full_name: "Budi Santoso (PPK)", role: "PPK" },
    { username: "operator_user", full_name: "Siti Aminah (Operator)", role: "OPERATOR" }
];

// Helper to get token
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
    } : { 
        'Content-Type': 'application/json' 
    };
};

// Helper to check if using mock token
const isMockToken = () => {
    const token = localStorage.getItem('token');
    return token && token.startsWith('mock_');
};

// Helper delay for mock
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
    // --- AUTHENTICATION ---
    login: async (username: string, password: string): Promise<{ access_token: string, role: UserRole, full_name: string }> => {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const res = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData,
            });

            if (!res.ok) {
                if (res.status === 401) {
                    throw new Error("Login gagal. Username atau password salah.");
                }
                if (res.status >= 500) {
                    throw new Error("Server Error");
                }
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Login gagal.");
            }
            return await res.json();
        } catch (e: any) {
             if ((e.message === "Login gagal. Username atau password salah." || e.message.includes("Login gagal")) && !e.message.includes("Server Error")) {
                 throw e; 
             }
             
             console.warn("Backend unreachable or Server Error, using mock login for demo.");
             await delay(800); // Simulate network
             
             if (username === 'ppk_user' && password === 'ppk123') {
                return { access_token: 'mock_token_ppk', role: UserRole.PPK, full_name: 'Budi Santoso (PPK)' };
            }
            if (username === 'operator_user' && password === 'operator123') {
                return { access_token: 'mock_token_op', role: UserRole.OPERATOR, full_name: 'Siti Aminah (Operator)' };
            }
            
            if (e.message === "Server Error") {
                throw new Error("Terjadi kesalahan pada server (500). Mode offline tidak tersedia untuk kredensial ini.");
            }

            throw new Error("Gagal terhubung ke server. (Mode Offline tidak tersedia untuk user ini)");
        }
    },

    setupDefaults: async () => {
        if (isMockToken()) return; 
        try {
            await fetch(`${BASE_URL}/api/auth/setup`, { method: 'POST' });
        } catch (e) {
            console.warn("API Error (setupDefaults): Backend unreachable, skipping setup.");
        }
    },

    // --- USER MANAGEMENT ---
    getUsers: async (): Promise<any[]> => {
        if (isMockToken()) {
            await delay(300); // Small delay to simulate fetch
            return [...MOCK_USERS_STORE];
        }

        try {
            const res = await fetch(`${BASE_URL}/api/users`, {
                headers: getAuthHeaders()
            });
            
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errText}`);
            }
            return await res.json();
        } catch (e: any) {
            if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError') || e.message.includes('Server Error')) {
                console.warn("API Error (getUsers): Backend issue. Using mock data.");
                return [...MOCK_USERS_STORE];
            }
            console.error("API Error (getUsers) - Real Server Error:", e);
            throw e; 
        }
    },

    createUser: async (userData: any) => {
        if (isMockToken()) {
            await delay(500);
            MOCK_USERS_STORE.push(userData);
            return { ...userData };
        }
        try {
            const res = await fetch(`${BASE_URL}/api/users`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(userData),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Gagal membuat user");
            }
            return await res.json();
        } catch (e: any) {
            // FIX: Handle "Failed to fetch" gracefully if backend actually processed it
            if (e.message.includes('Failed to fetch')) {
                console.warn("API warning: Failed to fetch response, but checking if user exists...");
                // Optimistic return, logic in UI will refresh list anyway
                return userData;
            }
            throw e;
        }
    },

    updateUser: async (username: string, userData: any) => {
        if (isMockToken()) {
            await delay(500);
            MOCK_USERS_STORE = MOCK_USERS_STORE.map(u => 
                u.username === username ? { ...u, ...userData } : u
            );
            return { username, ...userData };
        }
        try {
            const res = await fetch(`${BASE_URL}/api/users/${username}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(userData),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || "Gagal update user");
            }
            return await res.json();
        } catch (e: any) {
             if (e.message.includes('Failed to fetch')) {
                console.warn("API warning: Failed to fetch response (updateUser), proceeding optimistically.");
                return { username, ...userData };
            }
            throw e;
        }
    },

    deleteUser: async (username: string) => {
        if (isMockToken()) {
            await delay(500);
            MOCK_USERS_STORE = MOCK_USERS_STORE.filter(u => u.username !== username);
            return { message: "Deleted" };
        }
        try {
            const res = await fetch(`${BASE_URL}/api/users/${username}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!res.ok) {
                 const err = await res.json().catch(() => ({}));
                 throw new Error(err.detail || "Gagal hapus user");
            }
            return await res.json();
        } catch (e: any) {
            if (e.message.includes('Failed to fetch')) {
                console.warn("API warning: Failed to fetch response (deleteUser), proceeding optimistically.");
                return { message: "Deleted (Optimistic)" };
            }
            throw e;
        }
    },

    // --- SYSTEM STATE ---
    getSystemStatus: async (): Promise<{ is_revision_active: boolean }> => {
        if (isMockToken()) return { is_revision_active: false };
        try {
            const res = await fetch(`${BASE_URL}/api/system/status`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) return { is_revision_active: false };
            return await res.json();
        } catch (e) {
            return { is_revision_active: false };
        }
    },

    setSystemRevisionStatus: async (isActive: boolean, user: string) => {
        if (isMockToken()) return;
        try {
            await fetch(`${BASE_URL}/api/system/status`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ is_active: isActive, user: user })
            });
        } catch (e) {
            console.error("Failed to update system status");
        }
    },

    // --- BUDGET DATA ---
    getBudget: async (): Promise<BudgetRow[]> => {
        if (isMockToken()) return initialData;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); 

        try {
            const res = await fetch(`${BASE_URL}/api/budget`, { 
                signal: controller.signal,
                headers: getAuthHeaders()
            });
            clearTimeout(timeoutId);

            if (res.status === 401) throw new Error("Unauthorized");
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errorText}`);
            }
            
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.message === "Unauthorized") throw error;
            if (error.name === 'AbortError') throw new Error("Koneksi timeout (60s).");
            
            if (error.message.includes('Server Error') || error.message.includes('Failed to fetch')) {
                console.warn("API Error (getBudget): Using local data fallback due to server error.");
                return initialData;
            }
            throw error; 
        }
    },

    saveBudget: async (data: BudgetRow[]) => {
        if (isMockToken()) return { message: "Saved locally" };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const res = await fetch(`${BASE_URL}/api/budget`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.status === 401) throw new Error("Unauthorized");
            if (!res.ok) throw new Error(`Save Failed (${res.status})`);
            return await res.json();
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.message === "Unauthorized") throw error;
            if (error.message.includes('Failed to fetch')) {
                 console.warn("API Error (saveBudget): Failed to fetch, assuming saved optimistically.");
                 return { message: "Saved (Optimistic)" };
            }
            console.error("API Save Error:", error);
            throw new Error("Gagal menyimpan data ke server.");
        }
    },

    // --- EXPORT ---
    exportBudget: async (format: 'excel' | 'pdf') => {
        if (isMockToken()) {
            alert("Export tidak tersedia dalam mode offline/demo.");
            return;
        }
        try {
            const endpoint = format === 'excel' ? 'export/excel' : 'export/pdf';
            const res = await fetch(`${BASE_URL}/api/budget/${endpoint}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = format === 'excel' ? 'rincian_anggaran.xlsx' : 'rincian_anggaran.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("API Error (exportBudget):", error);
            throw new Error(`Gagal mengunduh file ${format.toUpperCase()}`);
        }
    },

    // --- REVISIONS ---
    getRevisions: async (): Promise<RevisionMeta[]> => {
        if (isMockToken()) return [];
        try {
            const res = await fetch(`${BASE_URL}/api/revisions`, {
                headers: getAuthHeaders()
            });
            if (res.status === 401) throw new Error("Unauthorized");
            if (!res.ok) throw new Error("Failed to fetch revisions");
            return await res.json();
        } catch (error: any) {
            if (error.message === "Unauthorized") throw error;
            throw error;
        }
    },

    createRevision: async (note: string, data: BudgetRow[]) => {
        if (isMockToken()) return { id: "mock-rev", note, timestamp: new Date().toISOString() };
        try {
            const res = await fetch(`${BASE_URL}/api/revisions`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ note, data }),
            });
            if (res.status === 401) throw new Error("Unauthorized");
            if (!res.ok) throw new Error("Failed to create revision");
            return await res.json();
        } catch (error: any) {
            if (error.message === "Unauthorized") throw error;
            throw error;
        }
    },

    getRevisionDetail: async (id: string): Promise<{ data: BudgetRow[] }> => {
        if (isMockToken()) return { data: initialData };
        try {
            const res = await fetch(`${BASE_URL}/api/revisions/${id}`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch revision detail");
            return await res.json();
        } catch (error) {
             throw error;
        }
    },

    deleteRevision: async (id: string): Promise<void> => {
        if (isMockToken()) return;
        try {
            const res = await fetch(`${BASE_URL}/api/revisions/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to delete revision");
        } catch (error) {
             throw error;
        }
    },

    // --- MASTER DATA ---
    getMasterData: async (): Promise<MasterData> => {
        if (isMockToken()) return {};
        try {
            const res = await fetch(`${BASE_URL}/api/master-data`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch master data");
            return await res.json();
        } catch (error) {
             return {}; 
        }
    },

    saveMasterData: async (item: { type: RowType; code: string; desc: string }) => {
        if (isMockToken()) return item;
        try {
            const res = await fetch(`${BASE_URL}/api/master-data/create`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(item),
            });
            if (!res.ok) throw new Error("Failed");
            return await res.json();
        } catch (e: any) {
            if (e.message.includes('Failed to fetch')) return item;
            throw e;
        }
    },

    updateMasterData: async (type: RowType, code: string, oldDesc: string, newDesc: string) => {
        if (isMockToken()) return { code, desc: newDesc };
        try {
            const encodedNew = encodeURIComponent(newDesc);
            const encodedOld = encodeURIComponent(oldDesc);
            // Send original description to backend so it knows WHICH record to update if codes are duplicates
            const res = await fetch(`${BASE_URL}/api/master-data/${type}/${code}?new_desc=${encodedNew}&current_desc=${encodedOld}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error("Failed");
            return await res.json();
        } catch (e: any) {
            if (e.message.includes('Failed to fetch')) return { code, desc: newDesc };
            throw e;
        }
    },

    deleteMasterData: async (type: RowType, code: string, desc: string) => {
        if (isMockToken()) return { message: "Deleted" };
        try {
            // Send description to backend so it knows WHICH record to delete
            const encodedDesc = encodeURIComponent(desc);
            const res = await fetch(`${BASE_URL}/api/master-data/${type}/${code}?desc=${encodedDesc}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed");
            return await res.json();
        } catch (e: any) {
            if (e.message.includes('Failed to fetch')) return { message: "Deleted" };
            throw e;
        }
    },

    // --- THEME ---
    getTheme: async (): Promise<ThemeConfig> => {
        if (isMockToken()) return defaultTheme;
        try {
            const res = await fetch(`${BASE_URL}/api/theme`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Failed");
            return await res.json();
        } catch (error) {
            return defaultTheme;
        }
    },

    saveTheme: async (data: ThemeConfig) => {
        if (isMockToken()) return;
        try {
            await fetch(`${BASE_URL}/api/theme`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data),
            });
        } catch (e) {
            console.warn("Failed to save theme");
        }
    }
};

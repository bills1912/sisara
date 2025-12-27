
import { BudgetRow, MasterData, RevisionMeta, RowType, ThemeConfig } from './types';
import { defaultTheme } from './utils';

const BASE_URL = 'https://sisara.onrender.com';

export const api = {
    // --- BUDGET DATA ---
    getBudget: async (): Promise<BudgetRow[]> => {
        console.log(`Fetching budget from ${BASE_URL}/api/budget...`);
        // Increased timeout to 60s because Render free tier takes time to wake up (Cold Start)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); 

        try {
            const res = await fetch(`${BASE_URL}/api/budget`, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errorText}`);
            }
            
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        } catch (error: any) {
            clearTimeout(timeoutId);
            console.error("API Error (getBudget):", error);
            if (error.name === 'AbortError') {
                throw new Error("Koneksi timeout (60s). Server mungkin sedang bangun dari mode tidur, silakan coba lagi.");
            }
            throw error; // Throw error agar UI menampilkan pesan error, BUKAN data dummy
        }
    },

    saveBudget: async (data: BudgetRow[]) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            console.log("Saving budget to API...", data.length, "rows");
            const res = await fetch(`${BASE_URL}/api/budget`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!res.ok) {
                throw new Error(`Save Failed (${res.status})`);
            }
            return await res.json();
        } catch (error: any) {
            clearTimeout(timeoutId);
            console.error("API Save Error:", error);
            throw new Error("Gagal menyimpan data ke server. Periksa koneksi internet Anda.");
        }
    },

    // --- EXPORT ---
    exportBudget: async (format: 'excel' | 'pdf') => {
        try {
            const endpoint = format === 'excel' ? 'export/excel' : 'export/pdf';
            const res = await fetch(`${BASE_URL}/api/budget/${endpoint}`, {
                method: 'GET',
            });

            if (!res.ok) throw new Error("Export failed");

            // Convert to blob and trigger download
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
        try {
            const res = await fetch(`${BASE_URL}/api/revisions`);
            if (!res.ok) throw new Error("Failed to fetch revisions");
            return await res.json();
        } catch (error) {
            console.error("API Error (getRevisions):", error);
            throw error;
        }
    },

    createRevision: async (note: string, data: BudgetRow[]) => {
        try {
            const res = await fetch(`${BASE_URL}/api/revisions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note, data }),
            });
            if (!res.ok) throw new Error("Failed to create revision");
            return await res.json();
        } catch (error) {
            console.error("API Error (createRevision):", error);
            throw error;
        }
    },

    getRevisionDetail: async (id: string): Promise<{ data: BudgetRow[] }> => {
        try {
            const res = await fetch(`${BASE_URL}/api/revisions/${id}`);
            if (!res.ok) throw new Error("Failed to fetch revision detail");
            return await res.json();
        } catch (error) {
             console.error("API Error (getRevisionDetail):", error);
             throw error;
        }
    },

    deleteRevision: async (id: string): Promise<void> => {
        try {
            const res = await fetch(`${BASE_URL}/api/revisions/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error("Failed to delete revision");
        } catch (error) {
             console.error("API Error (deleteRevision):", error);
             throw error;
        }
    },

    // --- MASTER DATA ---
    getMasterData: async (): Promise<MasterData> => {
        try {
            const res = await fetch(`${BASE_URL}/api/master-data`);
            if (!res.ok) throw new Error("Failed to fetch master data");
            return await res.json();
        } catch (error) {
             console.error("API Error (getMasterData):", error);
             // Return empty object if master data fails specifically, to allow app to load partial UI
             // But log the error clearly
             return {}; 
        }
    },

    saveMasterData: async (item: { type: RowType; code: string; desc: string }) => {
        const res = await fetch(`${BASE_URL}/api/master-data/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
        });
        if (!res.ok) throw new Error("Failed");
        return await res.json();
    },

    updateMasterData: async (type: RowType, code: string, newDesc: string) => {
        const encodedDesc = encodeURIComponent(newDesc);
        const res = await fetch(`${BASE_URL}/api/master-data/${type}/${code}?new_desc=${encodedDesc}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error("Failed");
        return await res.json();
    },

    deleteMasterData: async (type: RowType, code: string) => {
        const res = await fetch(`${BASE_URL}/api/master-data/${type}/${code}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error("Failed");
        return await res.json();
    },

    // --- THEME ---
    getTheme: async (): Promise<ThemeConfig> => {
        try {
            const res = await fetch(`${BASE_URL}/api/theme`);
            if (!res.ok) throw new Error("Failed");
            return await res.json();
        } catch (error) {
            return defaultTheme;
        }
    },

    saveTheme: async (data: ThemeConfig) => {
        await fetch(`${BASE_URL}/api/theme`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    }
};

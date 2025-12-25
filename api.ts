
import { BudgetRow, MasterData, RowType, ThemeConfig } from './types';
import { defaultTheme } from './utils';

const BASE_URL = 'https://sisara.onrender.com';

export const api = {
    // --- BUDGET DATA ---
    getBudget: async (): Promise<BudgetRow[]> => {
        try {
            console.log(`Fetching budget from ${BASE_URL}/api/budget...`);
            const res = await fetch(`${BASE_URL}/api/budget`);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Failed to fetch budget: ${res.status} ${text}`);
            }
            const data = await res.json();
            console.log("Budget fetched successfully:", data);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("API Error (getBudget):", error);
            throw error;
        }
    },

    saveBudget: async (data: BudgetRow[]) => {
        try {
            console.log("Saving budget...", data.length, "rows");
            const res = await fetch(`${BASE_URL}/api/budget`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Failed to save budget: ${res.status} ${text}`);
            }
            const result = await res.json();
            console.log("Budget saved successfully:", result);
            return result;
        } catch (error) {
            console.error("API Error (saveBudget):", error);
            throw error;
        }
    },

    // --- MASTER DATA ---
    getMasterData: async (): Promise<MasterData> => {
        try {
            console.log(`Fetching master data from ${BASE_URL}/api/master-data...`);
            const res = await fetch(`${BASE_URL}/api/master-data`);
            if (!res.ok) {
                 const text = await res.text();
                 throw new Error(`Failed to fetch master data: ${res.status} ${text}`);
            }
            const data = await res.json();
            return data || {};
        } catch (error) {
            console.error("API Error (getMasterData):", error);
            throw error;
        }
    },

    // Save new item
    saveMasterData: async (item: { type: RowType; code: string; desc: string }) => {
        try {
            console.log("Saving master data item:", item);
            // Updated to use /create endpoint for single item insertion
            const res = await fetch(`${BASE_URL}/api/master-data/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
            });
            if (!res.ok) {
                 const text = await res.text();
                 throw new Error(`Failed to save master data: ${res.status} ${text}`);
            }
            const result = await res.json();
            console.log("Master data saved successfully");
            return result;
        } catch (error) {
            console.error("API Error (saveMasterData):", error);
            throw error;
        }
    },

    // Update existing item description
    // Backend signature: @router.put("/{row_type}/{code}") with new_desc as query param
    updateMasterData: async (type: RowType, code: string, newDesc: string) => {
        try {
            const encodedDesc = encodeURIComponent(newDesc);
            console.log(`Updating master data: ${type}/${code} -> ${newDesc}`);
            const res = await fetch(`${BASE_URL}/api/master-data/${type}/${code}?new_desc=${encodedDesc}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                 const text = await res.text();
                 throw new Error(`Failed to update master data: ${res.status} ${text}`);
            }
            return await res.json();
        } catch (error) {
            console.error("API Error (updateMasterData):", error);
            throw error;
        }
    },

    // Delete item
    // Backend signature: @router.delete("/{row_type}/{code}")
    deleteMasterData: async (type: RowType, code: string) => {
        try {
            console.log(`Deleting master data: ${type}/${code}`);
            const res = await fetch(`${BASE_URL}/api/master-data/${type}/${code}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                 const text = await res.text();
                 throw new Error(`Failed to delete master data: ${res.status} ${text}`);
            }
            return await res.json();
        } catch (error) {
            console.error("API Error (deleteMasterData):", error);
            throw error;
        }
    },

    // --- THEME ---
    getTheme: async (): Promise<ThemeConfig> => {
        try {
            const res = await fetch(`${BASE_URL}/api/theme`);
            if (!res.ok) {
                 const text = await res.text();
                 throw new Error(`Failed to fetch theme: ${res.status} ${text}`);
            }
            const data = await res.json();
            return data || defaultTheme;
        } catch (error) {
            console.error("API Error (getTheme):", error);
            throw error; // Let App handle defaults if needed, or rethrow
        }
    },

    saveTheme: async (data: ThemeConfig) => {
        try {
            const res = await fetch(`${BASE_URL}/api/theme`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                 const text = await res.text();
                 throw new Error(`Failed to save theme: ${res.status} ${text}`);
            }
            console.log("Theme saved successfully");
        } catch (error) {
            console.error("API Error (saveTheme):", error);
            throw error;
        }
    }
};

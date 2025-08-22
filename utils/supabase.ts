import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const SUPABASE_URL_KEY = 'supabaseUrl';
const SUPABASE_ANON_KEY = 'supabaseAnonKey';

interface SupabaseCredentials {
    url: string | null;
    anonKey: string | null;
}

/**
 * Retrieves Supabase credentials from localStorage.
 */
export const getSupabaseCredentials = (): SupabaseCredentials => {
    try {
        return {
            url: window.localStorage.getItem(SUPABASE_URL_KEY),
            anonKey: window.localStorage.getItem(SUPABASE_ANON_KEY),
        };
    } catch (error) {
        console.error("Could not access localStorage:", error);
        return { url: null, anonKey: null };
    }
};

/**
 * Saves Supabase credentials to localStorage.
 */
export const setSupabaseCredentials = (url: string, anonKey: string): void => {
    try {
        window.localStorage.setItem(SUPABASE_URL_KEY, url);
        window.localStorage.setItem(SUPABASE_ANON_KEY, anonKey);
    } catch (error) {
        console.error("Could not write to localStorage:", error);
    }
};

/**
 * Checks if both URL and Anon Key are present and seem valid.
 */
export const areCredentialsSet = (): boolean => {
    const { url, anonKey } = getSupabaseCredentials();
    return !!(url && anonKey && url.trim().startsWith('http') && anonKey.trim().length > 20);
};

/**
 * Creates and returns a Supabase client if credentials are set.
 * Otherwise, returns null.
 */
export const createSupabaseClient = (): SupabaseClient<Database> | null => {
    if (!areCredentialsSet()) {
        return null;
    }
    const { url, anonKey } = getSupabaseCredentials();
    // The null checks are technically handled by areCredentialsSet, but TS doesn't know that.
    if (url && anonKey) {
        return createClient<Database>(url, anonKey);
    }
    return null;
};

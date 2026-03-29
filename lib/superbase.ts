import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import { Database } from "../database.types";

// AsyncStorage has no 2048-byte limit (unlike SecureStore),
// so large JWTs (Supabase session tokens) are stored correctly.
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
export const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabaseConfigErrorMessage =
  "Supabase is not configured. Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.";

const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co";
const FALLBACK_SUPABASE_KEY = "placeholder-anon-key";

let hasWarnedMissingSupabaseConfig = false;

export function warnMissingSupabaseConfig(context?: string) {
  if (hasWarnedMissingSupabaseConfig) return;

  hasWarnedMissingSupabaseConfig = true;
  const contextLabel = context ? ` (${context})` : "";
  console.warn(
    `[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY${contextLabel}. ` +
      "Using a placeholder client so the app can boot. Copy .env.example to .env and set real values.",
  );
}

export function createSupabaseConfigError(context?: string) {
  warnMissingSupabaseConfig(context);
  return new Error(supabaseConfigErrorMessage);
}

export function assertSupabaseConfigured(context?: string) {
  if (isSupabaseConfigured) {
    return;
  }

  throw createSupabaseConfigError(context);
}

const isServer = typeof window === "undefined";

const webStorage = {
  getItem: async (key: string) => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  },
};

const noopStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

const authStorage = isServer
  ? noopStorage
  : Platform.OS === "web"
    ? webStorage
    : AsyncStorage;

export const supabase = createClient<Database>(
  isSupabaseConfigured ? supabaseUrl : FALLBACK_SUPABASE_URL,
  isSupabaseConfigured ? supabaseKey : FALLBACK_SUPABASE_KEY,
  {
  auth: {
    storage: authStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
  },
);

if (!isSupabaseConfigured) {
  warnMissingSupabaseConfig("lib/superbase.ts");
}

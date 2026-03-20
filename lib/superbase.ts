import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import { Database } from "../database.types";

// AsyncStorage has no 2048-byte limit (unlike SecureStore),
// so large JWTs (Supabase session tokens) are stored correctly.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || "";
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

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});

import {
  assertSupabaseConfigured,
  isSupabaseConfigured,
  supabase,
} from "./superbase";

/**
 * LOGIN FUNCTION
 * This sends email + password to Supabase backend
 */
// module-level cache for the currently signed in user
let _currentUser: import("@supabase/supabase-js").User | null = null;

/**
 * LOGIN FUNCTION
 * This sends email + password to Supabase backend
 */
export async function loginUser(email: string, password: string) {
  assertSupabaseConfigured("lib/auth.ts loginUser");

  // Call Supabase Auth backend
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  // If login fails, throw the error
  if (error) {
    throw error;
  }

  // If login succeeds, cache the user and return it
  _currentUser = data.user;
  return data.user;
}

/**
 * RETURN CURRENT USER
 * Fetches the currently authenticated user from Supabase
 */
export async function getCurrentUser() {
  // prefer the cached user if available
  if (_currentUser) {
    return _currentUser;
  }

  assertSupabaseConfigured("lib/auth.ts getCurrentUser");

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  _currentUser = data.user;
  return data.user;
}

/**
 * Set current user manually (e.g. when restoring session)
 */
export function setCurrentUser(user: import("@supabase/supabase-js").User | null) {
  _currentUser = user;
}

/**
 * LOGOUT FUNCTION
 * This signs out the current user from Supabase.
 */
export async function logoutUser() {
  if (!isSupabaseConfigured) {
    _currentUser = null;
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

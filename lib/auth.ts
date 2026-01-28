import { supabase } from "./superbase";

/**
 * LOGIN FUNCTION
 * This sends email + password to Supabase backend
 */
export async function loginUser(email: string, password: string) {
  // Call Supabase Auth backend
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  // If login fails, throw the error
  if (error) {
    throw error;
  }

  // If login succeeds, return the logged user
  return data.user;
}

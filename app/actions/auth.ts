"use server";

/* Authentication actions (Blueprint section 6.1)
   Sign up, sign in, sign out, password reset */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/client";
import { z } from "zod";

const signUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1, "Display name is required"),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const updatePasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const displayName = formData.get("displayName") as string;

  // Validate
  const result = signUpSchema.safeParse({ email, password, displayName });
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();

  // Sign up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled, redirect to onboarding
  if (data.user && !data.user.identities?.length) {
    return { error: "Email already registered" };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string) || "/farmer";

  // Validate
  const result = signInSchema.safeParse({ email, password });
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Invalid email or password" };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/sign-in");
}

export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string;

  const result = resetPasswordSchema.safeParse({ email });
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Check your email for the reset link" };
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;

  const result = updatePasswordSchema.safeParse({ password });
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getCurrentUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) return null;

  // Get profile with role
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

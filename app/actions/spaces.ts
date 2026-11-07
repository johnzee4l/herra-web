"use server";

/* Space and membership actions (Blueprint section 6)
   Join space, create/update spaces, manage members */

import { revalidatePath } from "next/cache";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/client";
import { z } from "zod";
import crypto from "crypto";

const joinSpaceSchema = z.object({
  code: z.string().min(8, "Invalid access code"),
});

export async function joinSpace(formData: FormData) {
  const code = formData.get("code") as string;

  const result = joinSpaceSchema.safeParse({ code });
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();

  // Call the database function
  const { data, error } = await supabase.rpc("join_space", {
    code_text: code,
  });

  if (error) {
    return { error: error.message };
  }

  const response = data as { success: boolean; error?: string; message?: string; space_id?: string };

  if (!response.success) {
    return { error: response.message || "Failed to join space" };
  }

  revalidatePath("/farmer/spaces");
  return { success: true, spaceId: response.space_id };
}

const createSpaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  boundary: z.array(z.tuple([z.number(), z.number()])).min(3, "Boundary must have at least 3 points"),
  cropFocus: z.array(z.string()).optional(),
});

export async function createSpace(data: z.infer<typeof createSpaceSchema>) {
  const result = createSpaceSchema.safeParse(data);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const supabase = await supabaseServer();

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  // Convert boundary to WKT polygon
  const coords = [...result.data.boundary, result.data.boundary[0]]; // Close the ring
  const wkt = `POLYGON((${coords.map(([lng, lat]) => `${lng} ${lat}`).join(", ")}))`;

  const { data: space, error } = await supabase
    .from("spaces")
    .insert({
      name: result.data.name,
      description: result.data.description || "",
      boundary: wkt as any,
      crop_focus: result.data.cropFocus || [],
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Write audit log
  await supabaseAdmin()
    .from("audit_log")
    .insert({
      actor_id: (await supabase.auth.getUser()).data.user!.id,
      action: "space.create",
      target_type: "space",
      target_id: space.id,
      meta: { name: result.data.name },
    });

  revalidatePath("/admin/spaces");
  return { success: true, spaceId: space.id };
}

// Generate access code (Blueprint 6.2)
function generateAccessCode(): string {
  // 8 random bytes -> base32 Crockford
  const bytes = crypto.randomBytes(5);
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32, excluding I, L, O, U
  
  let code = "";
  for (let i = 0; i < 8; i++) {
    const index = bytes[i % 5] % 32;
    code += alphabet[index];
  }
  
  // Format as HRA-XXXX-XXXX
  return `HRA-${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

function hashAccessCode(code: string, pepper: string): string {
  // Normalize (Blueprint 6.2)
  let normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  normalized = normalized.replace(/[IL]/g, "1").replace(/[OU]/g, "0");
  
  // HMAC-SHA256
  return crypto.createHmac("sha256", pepper).update(normalized).digest("hex");
}

export async function createAccessCode(spaceId: string, options?: { expiresInDays?: number; maxUses?: number }) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const pepper = process.env.ACCESS_CODE_PEPPER || process.env.HMAC_PEPPER;
  if (!pepper) {
    return { error: "Access code pepper not configured" };
  }

  const code = generateAccessCode();
  const hash = hashAccessCode(code, pepper);
  const hint = code.slice(-4);

  const expiresAt = options?.expiresInDays
    ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const { data: accessCode, error } = await admin
    .from("access_codes")
    .insert({
      space_id: spaceId,
      code_hash: hash,
      code_hint: hint,
      expires_at: expiresAt,
      max_uses: options?.maxUses || null,
      created_by: (await supabase.auth.getUser()).data.user!.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Write audit log
  await admin.from("audit_log").insert({
    actor_id: (await supabase.auth.getUser()).data.user!.id,
    action: "access_code.create",
    target_type: "access_code",
    target_id: accessCode.id,
    meta: { space_id: spaceId, hint },
  });

  revalidatePath(`/admin/spaces/${spaceId}`);
  return { success: true, code, id: accessCode.id };
}

export async function revokeAccessCode(codeId: string) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const { error } = await admin
    .from("access_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", codeId);

  if (error) {
    return { error: error.message };
  }

  // Write audit log
  await admin.from("audit_log").insert({
    actor_id: (await supabase.auth.getUser()).data.user!.id,
    action: "access_code.revoke",
    target_type: "access_code",
    target_id: codeId,
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateMemberRole(userId: string, role: "farmer" | "admin") {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user!.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const { error } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) {
    return { error: error.message };
  }

  // Write audit log
  await admin.from("audit_log").insert({
    actor_id: (await supabase.auth.getUser()).data.user!.id,
    action: "user.update_role",
    target_type: "user",
    target_id: userId,
    meta: { new_role: role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

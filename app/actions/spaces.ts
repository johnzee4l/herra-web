"use server";

/* Space and membership actions (Blueprint section 6) */

import { revalidatePath } from "next/cache";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/client";
import { z } from "zod";
import crypto from "crypto";

const joinSpaceSchema = z.object({ code: z.string().min(8, "Invalid access code") });

function normalizeCode(code: string) {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/[OU]/g, "0");
}

function hashAccessCode(code: string, pepper: string) {
  return crypto.createHmac("sha256", pepper).update(normalizeCode(code)).digest("hex");
}

function pepper() {
  return process.env.ACCESS_CODE_PEPPER || process.env.HMAC_PEPPER || "";
}

export async function joinSpace(formData: FormData) {
  const parsed = joinSpaceSchema.safeParse({ code: String(formData.get("code") ?? "") });
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const secret = pepper();
  if (!secret) return { error: "Access codes are not configured on this deployment" };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first" };

  const { data: spaceId, error } = await supabase.rpc("join_space", {
    p_code_hash: hashAccessCode(parsed.data.code, secret),
  });

  if (error) return { error: error.message };
  if (!spaceId) return { error: "That code is not valid" };

  revalidatePath("/farmer/spaces");
  revalidatePath("/farmer");
  return { success: true, spaceId: spaceId as string };
}

export async function leaveSpace(spaceId: string) {
  if (!z.string().uuid().safeParse(spaceId).success) return { error: "Invalid space" };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first" };

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "leave_space",
    target_type: "space",
    target_id: spaceId,
  });

  revalidatePath("/farmer/spaces");
  revalidatePath("/farmer");
  revalidatePath(`/farmer/spaces/${spaceId}`);
  return { success: true };
}

const createSpaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  boundary: z.array(z.tuple([z.number(), z.number()])).min(3, "Boundary must have at least 3 points"),
  cropFocus: z.array(z.string()).optional(),
});

export async function createSpace(data: z.infer<typeof createSpaceSchema>) {
  const parsed = createSpaceSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const ring = [...parsed.data.boundary];
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push(ring[0]);
  }
  const wkt = `POLYGON((${ring.map(([lng, lat]) => `${lng} ${lat}`).join(", ")}))`;

  const { data: space, error } = await supabase
    .from("spaces")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || "",
      boundary: wkt,
      crop_focus: parsed.data.cropFocus || [],
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabaseAdmin().from("audit_log").insert({
    actor_id: user.id,
    action: "create_space",
    target_type: "space",
    target_id: space.id,
    meta: { name: parsed.data.name },
  });

  revalidatePath("/admin/spaces");
  return { success: true, spaceId: space.id };
}

const updateSpaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(2000).optional(),
  status: z.enum(["ok", "attention"]).optional(),
});

export async function updateSpace(spaceId: string, data: z.infer<typeof updateSpaceSchema>) {
  const parsed = updateSpaceSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const { error } = await supabase
    .from("spaces")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    })
    .eq("id", spaceId);
  if (error) return { error: error.message };

  await supabaseAdmin().from("audit_log").insert({
    actor_id: user.id,
    action: "update_space",
    target_type: "space",
    target_id: spaceId,
    meta: { name: parsed.data.name, status: parsed.data.status },
  });

  revalidatePath(`/admin/spaces/${spaceId}`);
  revalidatePath("/admin/spaces");
  revalidatePath("/farmer/spaces");
  return { success: true };
}

function generateAccessCode(): string {
  const bytes = crypto.randomBytes(5);
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let code = "";
  for (let i = 0; i < 8; i++) code += alphabet[bytes[i % 5] % 32];
  return `HRA-${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

export async function createAccessCode(
  spaceId: string,
  options?: { expiresInDays?: number; maxUses?: number }
) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const secret = pepper();
  if (!secret) return { error: "Access code pepper not configured" };

  const code = generateAccessCode();
  const expiresAt = options?.expiresInDays
    ? new Date(Date.now() + options.expiresInDays * 86400000).toISOString()
    : null;

  const { data: accessCode, error } = await admin
    .from("access_codes")
    .insert({
      space_id: spaceId,
      code_hash: hashAccessCode(code, secret),
      code_hint: code.slice(-4),
      expires_at: expiresAt,
      max_uses: options?.maxUses ?? 25,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "rotate_code",
    target_type: "access_code",
    target_id: accessCode.id,
    meta: { space_id: spaceId, hint: code.slice(-4) },
  });

  revalidatePath(`/admin/spaces/${spaceId}`);
  return { success: true, code, id: accessCode.id };
}

export async function revokeAccessCode(codeId: string) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const { error } = await admin
    .from("access_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", codeId);
  if (error) return { error: error.message };

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "revoke_code",
    target_type: "access_code",
    target_id: codeId,
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateMemberRole(userId: string, role: "farmer" | "admin") {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "change_role",
    target_type: "user",
    target_id: userId,
    meta: { new_role: role },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function createAnnouncement(input: { spaceId: string; title: string; body: string }) {
  const text = z
    .object({
      spaceId: z.string().uuid(),
      title: z.string().min(1).max(140),
      body: z.string().min(1).max(2000),
    })
    .safeParse(input);
  if (!text.success) return { error: text.error.errors[0].message };

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const { data, error } = await sb
    .from("announcements")
    .insert({
      space_id: text.data.spaceId,
      title: text.data.title,
      body: text.data.body,
      created_by: user.id,
    })
    .select("id, created_at, created_by")
    .single();

  if (error) return { error: error.message };

  await supabaseAdmin().from("audit_log").insert({
    actor_id: user.id,
    action: "broadcast",
    target_type: "announcement",
    target_id: data.id,
    meta: { space_id: text.data.spaceId },
  });

  revalidatePath("/admin");
  revalidatePath("/farmer");
  return { success: true, announcement: data };
}

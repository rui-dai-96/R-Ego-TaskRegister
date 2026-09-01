import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "http://localhost:5173",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json({ error: "Unauthorized" }, 401);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) return json({ error: "Unauthorized" }, 401);

  const { data: callerProfile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .maybeSingle();
  if (callerProfile?.role !== "admin") return json({ error: "Forbidden" }, 403);

  let payload: { vendorId?: string; enabled?: boolean };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!payload.vendorId || typeof payload.enabled !== "boolean") {
    return json({ error: "vendorId and enabled are required" }, 400);
  }

  const { data: existing, error: lookupError } = await adminClient
    .from("vendors")
    .select("id, profile_id, status")
    .eq("id", payload.vendorId)
    .maybeSingle();
  if (lookupError) return json({ error: lookupError.message }, 400);
  if (!existing) return json({ error: "Vendor not found" }, 404);

  const desiredStatus = payload.enabled ? "active" : "disabled";
  if (existing.status === desiredStatus) {
    return json({ vendor: existing });
  }

  const banDuration = payload.enabled ? "none" : "876000h";
  const { error: authError } = await adminClient.auth.admin.updateUserById(
    existing.profile_id,
    { ban_duration: banDuration },
  );
  if (authError) return json({ error: authError.message }, 400);

  const { data: vendor, error: updateError } = await adminClient
    .from("vendors")
    .update({
      status: desiredStatus,
      disabled_at: payload.enabled ? null : new Date().toISOString(),
      disabled_by: payload.enabled ? null : caller.id,
    })
    .eq("id", existing.id)
    .select(
      "id, profile_id, company_name, contact_email, status, disabled_at, updated_at",
    )
    .single();

  if (updateError) {
    await adminClient.auth.admin.updateUserById(existing.profile_id, {
      ban_duration: payload.enabled ? "876000h" : "none",
    });
    return json({ error: updateError.message }, 500);
  }

  return json({ vendor });
});

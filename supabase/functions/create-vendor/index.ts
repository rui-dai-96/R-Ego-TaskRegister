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

  let payload: {
    email?: string;
    temporaryPassword?: string;
    companyName?: string;
    contactName?: string;
    displayName?: string;
    enabled?: boolean;
  };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  const companyName = payload.companyName?.trim();
  const temporaryPassword = payload.temporaryPassword;
  if (
    !email || !companyName || !temporaryPassword ||
    temporaryPassword.length < 10
  ) {
    return json({
      error:
        "Email, company name, and a 10+ character temporary password are required",
    }, 400);
  }

  const { data: created, error: authError } = await adminClient.auth.admin
    .createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        display_name: payload.displayName?.trim() || companyName,
      },
    });
  if (authError || !created.user) {
    return json({
      error: authError?.message ?? "Unable to create vendor account",
    }, 400);
  }

  const enabled = payload.enabled ?? true;
  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: created.user.id,
    role: "vendor",
    display_name: payload.displayName?.trim() || companyName,
    must_change_password: true,
  }, { onConflict: "id" });
  const { data: vendor, error: vendorError } = profileError
    ? { data: null, error: profileError }
    : await adminClient.from("vendors").insert({
      profile_id: created.user.id,
      company_name: companyName,
      contact_name: payload.contactName?.trim() || null,
      contact_email: email,
      status: enabled ? "active" : "disabled",
      disabled_at: enabled ? null : new Date().toISOString(),
      disabled_by: enabled ? null : caller.id,
      created_by: caller.id,
    }).select("id, profile_id, company_name, contact_email, status, created_at")
      .single();

  if (vendorError || !vendor) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return json({
      error: vendorError?.message ?? "Unable to create vendor record",
    }, 400);
  }

  if (!enabled) {
    const { error: banError } = await adminClient.auth.admin.updateUserById(
      created.user.id,
      { ban_duration: "876000h" },
    );
    if (banError) {
      await adminClient.from("vendors").delete().eq("id", vendor.id);
      await adminClient.from("profiles").delete().eq("id", created.user.id);
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ error: banError.message }, 500);
    }
  }

  return json({ vendor }, 201);
});

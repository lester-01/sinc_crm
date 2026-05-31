#!/usr/bin/env node
/**
 * Seed demo users (Auth Admin API) and CRM rows (Supabase REST).
 * Empty database only. No Cursor/MCP — uses SUPABASE_SECRET_KEY from worker/.dev.vars.
 *
 * Preflight checks use Supabase CLI when SUPABASE_DB_URL is set (transaction pooler).
 */

import {
  checkDatabaseHasData,
  checkSchemaExists,
  createAdminClient,
  getDbContext,
} from "./lib/supabase-db-check.mjs";
import {
  getProjectRef,
  getSupabaseSecretKey,
  getSupabaseUrl,
  loadStackEnv,
} from "./lib/load-stack-env.mjs";

const PASSWORD = process.env.SEED_DEMO_PASSWORD || "demo1234";

const MANAGERS = [
  { email: "manager1@demo.local", fullName: "Morgan Manager" },
  { email: "manager2@demo.local", fullName: "Alex Manager" },
];

const SALES = [
  { email: "sales1@demo.local", fullName: "Sam Sales" },
  { email: "sales2@demo.local", fullName: "Jordan Sales" },
  { email: "sales3@demo.local", fullName: "Riley Sales" },
];

const CLIENTS = [
  {
    email: "client1@demo.local",
    fullName: "Aida Client",
    country: "Kazakhstan",
    targetCountry: "Canada",
    assignedSales: 0,
    dealStage: "new_lead",
    threadSubject: "Canada business program",
  },
  {
    email: "client2@demo.local",
    fullName: "Bek Client",
    country: "Uzbekistan",
    targetCountry: "UK",
    assignedSales: 1,
    dealStage: "contacted",
    threadSubject: "UK foundation year",
  },
  {
    email: "client3@demo.local",
    fullName: "Cara Client",
    country: "Kyrgyzstan",
    targetCountry: "Germany",
    assignedSales: 2,
    dealStage: "consultation_booked",
    threadSubject: "German language prep",
  },
  {
    email: "client4@demo.local",
    fullName: "Dana Client",
    country: "Georgia",
    targetCountry: "Canada",
    assignedSales: null,
    dealStage: null,
    threadSubject: "General admission questions",
    unassigned: true,
  },
];

function fail(msg) {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
}

async function createAuthUser(admin, { email, fullName, role }) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (error) {
    throw new Error(`createUser ${email}: ${error.message}`);
  }
  return data.user.id;
}

async function main() {
  const { merged, root } = loadStackEnv();
  const url = getSupabaseUrl(merged);
  const secret = getSupabaseSecretKey(merged);
  const ref = getProjectRef(merged);

  if (!url || !secret) {
    fail("Missing SUPABASE_URL and SUPABASE_SECRET_KEY in worker/.dev.vars");
  }

  const ctx = await getDbContext(merged, ref, root);
  const admin = createAdminClient(url, secret);

  if (!(await checkSchemaExists(ctx, root))) {
    fail("Schema not found. Run: npm run db:schema");
  }

  if (await checkDatabaseHasData(ctx, root)) {
    fail(
      "Database is not empty (auth.users or public rows exist).\n\n" +
        "To re-seed:\n" +
        "  1. Dashboard → Authentication: delete users\n" +
        "  2. Table Editor: delete/truncate public tables\n" +
        "  3. Run: npm run db:seed\n\n" +
        "Scripts never auto-delete data.",
    );
  }

  console.log("Seeding via Supabase API (service role key)...\n");
  console.log(`Demo password (all accounts): ${PASSWORD}`);
  console.log("(override with SEED_DEMO_PASSWORD)\n");

  const salesIds = [];
  for (const m of MANAGERS) {
    await createAuthUser(admin, { ...m, role: "manager" });
  }
  for (const s of SALES) {
    salesIds.push(
      await createAuthUser(admin, { ...s, role: "sales" }),
    );
  }

  const clientProfileIds = [];
  for (const c of CLIENTS) {
    clientProfileIds.push(
      await createAuthUser(admin, {
        email: c.email,
        fullName: c.fullName,
        role: "client",
      }),
    );
  }

  const sales1 = salesIds[0];
  const clientRows = [];

  for (let i = 0; i < CLIENTS.length; i++) {
    const c = CLIENTS[i];
    const { data, error } = await admin
      .from("clients")
      .upsert(
        {
          profile_id: clientProfileIds[i],
          full_name: c.fullName,
          email: c.email,
          phone: "+1000000000" + String(i + 1),
          country: c.country,
          target_country: c.targetCountry,
          created_by: sales1,
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();
    if (error) throw new Error(`clients: ${error.message}`);
    clientRows.push({ ...c, id: data.id, profileId: clientProfileIds[i] });
  }

  await admin.from("clients").insert({
    profile_id: null,
    full_name: "Prospect No Login",
    email: "prospect.no.login@example.com",
    country: "Kazakhstan",
    target_country: "Canada",
    created_by: salesIds[1],
  });

  for (const row of clientRows) {
    const assignee = row.unassigned ? null : salesIds[row.assignedSales ?? 0];
    const { data: thread, error: threadErr } = await admin
      .from("conversation_threads")
      .insert({
        client_id: row.id,
        assigned_to: assignee,
        subject: row.threadSubject,
        status: "open",
      })
      .select("id")
      .single();
    if (threadErr) throw new Error(threadErr.message);

    await admin.from("conversation_messages").insert({
      thread_id: thread.id,
      sender_id: row.profileId,
      sender_type: "client",
      body: `Hello, I need help with ${row.threadSubject}.`,
    });
    await admin.from("conversation_messages").insert({
      thread_id: thread.id,
      sender_id: assignee ?? sales1,
      sender_type: "team",
      body: assignee
        ? "Thanks for reaching out — we will help you shortly."
        : "Thanks — a sales rep will pick this up from the queue soon.",
    });

    if (row.dealStage) {
      const owner = salesIds[row.assignedSales ?? 0];
      const { data: deal, error: dealErr } = await admin
        .from("deals")
        .insert({
          client_id: row.id,
          owner_id: owner,
          title: `${row.targetCountry} application`,
          stage: row.dealStage,
          value_amount: 1200 + (row.assignedSales ?? 0) * 100,
          value_currency: "USD",
          expected_intake: "Fall 2026",
        })
        .select("id")
        .single();
      if (dealErr) throw new Error(dealErr.message);

      await admin.from("deal_stage_history").insert({
        deal_id: deal.id,
        from_stage: null,
        to_stage: "new_lead",
        changed_by: owner,
      });
      if (row.dealStage !== "new_lead") {
        await admin.from("deal_stage_history").insert({
          deal_id: deal.id,
          from_stage: "new_lead",
          to_stage: row.dealStage,
          changed_by: owner,
        });
      }
      await admin.from("deal_notes").insert({
        deal_id: deal.id,
        author_id: owner,
        body: `Initial note for ${row.fullName}.`,
      });
    }
  }

  console.log("\nSeed complete.");
  console.log("  npm run verify:stack:supabase");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

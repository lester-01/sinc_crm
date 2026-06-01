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
    clientMessage:
      "Hi, I'm interested in Canada's business immigration pathways. With a commerce background from Kazakhstan, which programs should I look at first?",
    teamMessage:
      "Hi Aida — thanks for reaching out. I'll review your profile and send a short list of eligible programs within 24 hours.",
    dealNote:
      "PGWP-eligible programs under review. Follow up on IELTS target band and work experience docs.",
  },
  {
    email: "client2@demo.local",
    fullName: "Bek Client",
    country: "Uzbekistan",
    targetCountry: "UK",
    assignedSales: 1,
    dealStage: "contacted",
    threadSubject: "UK foundation year",
    clientMessage:
      "Hello, I finished school in Uzbekistan and want a UK foundation year before a business degree. What are the typical entry requirements?",
    teamMessage:
      "Thanks Bek — I've shared a checklist for transcripts and English scores. Let's schedule a quick call this week.",
    dealNote: "Foundation route preferred. Waiting on school transcript translation.",
  },
  {
    email: "client3@demo.local",
    fullName: "Cara Client",
    country: "Kyrgyzstan",
    targetCountry: "Germany",
    assignedSales: 2,
    dealStage: "consultation_booked",
    threadSubject: "German language prep",
    clientMessage:
      "I need help with German language prep before applying to universities in Germany. Do you offer structured A2/B1 courses?",
    teamMessage:
      "Yes Cara — your consultation is confirmed. We'll map your language timeline to the Fall 2026 intake.",
    dealNote:
      "Consultation booked — interested in Berlin and Munich options; prep timeline to Fall 2026.",
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
    clientMessage:
      "I have general questions about admission timelines and document preparation for studying abroad. Who can help me get started?",
    teamMessage:
      "Thanks Dana — a sales representative will pick this up from the queue shortly.",
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
        "To re-seed from scratch (manual — no auto-delete scripts):\n" +
        "  See docs/database-setup.md → Level B (CRM schema teardown)\n" +
        "  Then: npm run db:schema && npm run db:seed\n\n" +
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
      body: row.clientMessage,
    });
    await admin.from("conversation_messages").insert({
      thread_id: thread.id,
      sender_id: assignee ?? sales1,
      sender_type: "team",
      body: row.teamMessage,
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
        body: row.dealNote,
      });
    }
  }

  console.log("\nSeed complete.");
  console.log("  npm run verify:supabase");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

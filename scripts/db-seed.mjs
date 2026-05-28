#!/usr/bin/env node
/**
 * Seed demo users and CRM data (empty database only).
 * Aborts if auth users or public data already exist.
 */

import { createAdminClient, databaseHasData, schemaExists } from "./lib/supabase-db-check.mjs";
import {
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
  const { merged } = loadStackEnv();
  const url = getSupabaseUrl(merged);
  const secret = getSupabaseSecretKey(merged);

  if (!url || !secret) {
    fail("Missing SUPABASE_URL and SUPABASE_SECRET_KEY");
  }

  const admin = createAdminClient(url, secret);

  if (!(await schemaExists(admin))) {
    fail("Schema not found. Run: npm run db:schema");
  }

  if (await databaseHasData(admin)) {
    fail(
      "Database is not empty (auth users or app rows already exist).\n\n" +
        "To re-seed:\n" +
        "  1. Open Supabase Dashboard → Authentication (delete users) and Table Editor (truncate/delete rows)\n" +
        "     OR drop schema and run npm run db:schema again on an empty project\n" +
        "  2. Run: npm run db:seed\n\n" +
        "Scripts never auto-delete data — this protects databases in use.",
    );
  }

  console.log("Seeding demo users and CRM data...\n");
  console.log(`Demo password (all accounts): ${PASSWORD}`);
  console.log("(override with SEED_DEMO_PASSWORD env)\n");

  const managerIds = [];
  for (const m of MANAGERS) {
    managerIds.push(
      await createAuthUser(admin, { ...m, role: "manager", fullName: m.fullName }),
    );
  }

  const salesIds = [];
  for (const s of SALES) {
    salesIds.push(
      await createAuthUser(admin, { ...s, role: "sales", fullName: s.fullName }),
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
  const createdBy = sales1;

  const clientRows = [];
  for (let i = 0; i < CLIENTS.length; i++) {
    const c = CLIENTS[i];
    const { data, error } = await admin
      .from("clients")
      .insert({
        profile_id: clientProfileIds[i],
        full_name: c.fullName,
        email: c.email,
        phone: "+1000000000" + String(i + 1),
        country: c.country,
        target_country: c.targetCountry,
        created_by: createdBy,
      })
      .select("id")
      .single();
    if (error) throw new Error(`clients insert: ${error.message}`);
    clientRows.push({ ...c, id: data.id, profileId: clientProfileIds[i] });
  }

  const { data: prospect, error: prospectErr } = await admin
    .from("clients")
    .insert({
      profile_id: null,
      full_name: "Prospect No Login",
      email: "prospect.no.login@example.com",
      country: "Kazakhstan",
      target_country: "Canada",
      created_by: salesIds[1],
    })
    .select("id")
    .single();
  if (prospectErr) throw new Error(prospectErr.message);

  for (const row of clientRows) {
    const assignee =
      row.unassigned ? null : salesIds[row.assignedSales ?? 0];

    const { data: thread, error: threadErr } = await admin
      .from("conversation_threads")
      .insert({
        client_id: row.id,
        assigned_to: assignee,
        subject: row.threadSubject,
        status: row.unassigned ? "open" : "open",
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (threadErr) throw new Error(threadErr.message);

    const senderType = "client";
    await admin.from("conversation_messages").insert({
      thread_id: thread.id,
      sender_id: row.profileId,
      sender_type: senderType,
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
          value_amount: 1200 + row.assignedSales * 100,
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
        body: `Initial note for ${row.fullName} — stage ${row.dealStage}.`,
      });
    }
  }

  await admin.from("conversation_threads").insert({
    client_id: prospect.id,
    assigned_to: null,
    subject: "Inbound lead — no account yet",
    status: "open",
  });

  console.log("Seed complete.");
  console.log("  Managers: manager1@demo.local, manager2@demo.local");
  console.log("  Sales:    sales1@demo.local … sales3@demo.local");
  console.log("  Clients:  client1@demo.local … client4@demo.local (client4 unassigned)");
  console.log("  Extra:    prospect.no.login@example.com (CRM only, no auth)");
  console.log("\nRun: npm run verify:stack:supabase");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

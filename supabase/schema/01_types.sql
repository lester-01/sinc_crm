-- Phase 5: enums (idempotent guards for re-run safety during manual recovery only)
do $$ begin
  create type app_role as enum ('client', 'sales', 'manager');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type conversation_status as enum ('open', 'pending', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type message_sender_type as enum ('client', 'team');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type deal_stage as enum (
    'new_lead',
    'contacted',
    'consultation_booked',
    'documents_requested',
    'application_started',
    'submitted',
    'won',
    'lost'
  );
exception when duplicate_object then null;
end $$;

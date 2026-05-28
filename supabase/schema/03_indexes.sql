-- Phase 5: indexes from database.md + queue sort index

create index if not exists clients_email_idx on clients(email);
create index if not exists clients_profile_id_idx on clients(profile_id);

create index if not exists conversation_threads_client_id_idx on conversation_threads(client_id);
create index if not exists conversation_threads_assigned_to_idx on conversation_threads(assigned_to);
create index if not exists conversation_threads_status_idx on conversation_threads(status);
create index if not exists conversation_threads_last_message_at_idx
  on conversation_threads(last_message_at desc);

create index if not exists conversation_messages_thread_id_created_at_idx
  on conversation_messages(thread_id, created_at);

create index if not exists deals_client_id_idx on deals(client_id);
create index if not exists deals_owner_id_idx on deals(owner_id);
create index if not exists deals_stage_idx on deals(stage);

create index if not exists deal_stage_history_deal_id_created_at_idx
  on deal_stage_history(deal_id, created_at desc);

create index if not exists deal_notes_deal_id_created_at_idx
  on deal_notes(deal_id, created_at desc);

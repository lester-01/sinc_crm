-- FIX-080: track when client last viewed a thread (unread indicator)
alter table conversation_threads
  add column if not exists client_last_read_at timestamptz;

-- Private Supabase Storage bucket for meal journal photos (per-user paths).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-images',
  'meal-images',
  false,
  5242880,
  array['image/jpeg']
)
on conflict (id) do nothing;

create policy "users read own meal images"
  on storage.objects for select
  using (
    bucket_id = 'meal-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users upload own meal images"
  on storage.objects for insert
  with check (
    bucket_id = 'meal-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users update own meal images"
  on storage.objects for update
  using (
    bucket_id = 'meal-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'meal-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users delete own meal images"
  on storage.objects for delete
  using (
    bucket_id = 'meal-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

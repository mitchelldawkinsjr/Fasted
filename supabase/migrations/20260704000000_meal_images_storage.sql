-- Private meal photo storage. Paths: {user_id}/{image_id}.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-images',
  'meal-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy "users read own meal images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users upload own meal images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users update own meal images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users delete own meal images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

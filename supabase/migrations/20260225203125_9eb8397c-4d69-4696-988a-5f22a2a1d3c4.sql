
-- Storage RLS policies for outfits bucket (INSERT + DELETE only, SELECT already exists)
CREATE POLICY "Authenticated users can upload outfits"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'outfits' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own outfit files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'outfits' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Create storage bucket for artefacts (images, files, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('artefacts', 'artefacts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for artefacts bucket
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload files to their own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artefacts' AND
  (storage.foldername(name))[1] = 'vault' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'artefacts' AND
  (
    -- Allow reading vault files they own
    (
      (storage.foldername(name))[1] = 'vault' AND
      auth.uid()::text = (storage.foldername(name))[2]
    )
    OR
    -- Allow reading any artefacts they own (based on artefacts table)
    EXISTS (
      SELECT 1 FROM public.artefacts
      WHERE artefacts.user_id = auth.uid()
      AND artefacts.file_path = name
    )
  )
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'artefacts' AND
  (
    (storage.foldername(name))[1] = 'vault' AND
    auth.uid()::text = (storage.foldername(name))[2]
  )
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'artefacts' AND
  (
    (storage.foldername(name))[1] = 'vault' AND
    auth.uid()::text = (storage.foldername(name))[2]
  )
);

-- Grant necessary permissions
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

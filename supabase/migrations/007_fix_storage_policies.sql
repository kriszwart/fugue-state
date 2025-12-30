-- Drop existing policies that might be causing conflicts
DROP POLICY IF EXISTS "Users can upload files to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Recreate storage policies with correct RLS rules

-- Policy 1: Allow authenticated users to insert files into their vault folder
CREATE POLICY "Users can upload to vault"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artefacts' 
  AND (storage.foldername(name))[1] = 'vault'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- Policy 2: Allow authenticated users to read files from their vault folder
CREATE POLICY "Users can read from vault"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'artefacts' 
  AND (storage.foldername(name))[1] = 'vault'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- Policy 3: Allow authenticated users to update files in their vault folder
CREATE POLICY "Users can update vault files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'artefacts' 
  AND (storage.foldername(name))[1] = 'vault'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);

-- Policy 4: Allow authenticated users to delete files from their vault folder
CREATE POLICY "Users can delete vault files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'artefacts' 
  AND (storage.foldername(name))[1] = 'vault'
  AND (storage.foldername(name))[2] = (auth.uid())::text
);













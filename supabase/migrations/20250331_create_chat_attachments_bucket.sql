
-- Create a storage bucket for chat attachments
INSERT INTO storage.buckets(id, name, public)
VALUES('chat_attachments', 'chat_attachments', true);

-- Set up policy to allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat_attachments');

-- Set up policy to allow users to read chat attachments
CREATE POLICY "Allow users to read chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat_attachments');

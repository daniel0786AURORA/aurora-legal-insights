CREATE POLICY "case_files_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'case-files');
CREATE POLICY "case_files_insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'case-files');
CREATE POLICY "case_files_update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'case-files') WITH CHECK (bucket_id = 'case-files');
CREATE POLICY "case_files_delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'case-files');
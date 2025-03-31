
-- Enable RLS on resources, videos, and offers tables
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Create policies for resources
CREATE POLICY "Enable read access for all users on resources" ON resources
FOR SELECT USING (true);

CREATE POLICY "Enable all access for admins on resources" ON resources
FOR ALL USING (is_admin(auth.uid()));

-- Create policies for videos
CREATE POLICY "Enable read access for all users on videos" ON videos
FOR SELECT USING (true);

CREATE POLICY "Enable all access for admins on videos" ON videos
FOR ALL USING (is_admin(auth.uid()));

-- Create policies for offers
CREATE POLICY "Enable read access for all users on offers" ON offers
FOR SELECT USING (true);

CREATE POLICY "Enable all access for admins on offers" ON offers
FOR ALL USING (is_admin(auth.uid()));

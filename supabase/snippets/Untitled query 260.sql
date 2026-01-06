-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Users: Anyone can view profiles, Users can edit their own
CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Workers: Public view, Worker edit
CREATE POLICY "Workers viewable by everyone" ON workers FOR SELECT USING (true);
CREATE POLICY "Workers update own data" ON workers FOR UPDATE USING (auth.uid() = user_id);

-- Jobs: Public view active, Employers edit own
CREATE POLICY "Active jobs viewable" ON jobs FOR SELECT USING (status = 'active' OR auth.uid() = employer_id);
CREATE POLICY "Employers update own jobs" ON jobs FOR UPDATE USING (auth.uid() = employer_id);
CREATE POLICY "Employers insert jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = employer_id);

-- Applications: Workers create, Employers view received
CREATE POLICY "Workers apply" ON job_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Workers view own" ON job_applications FOR SELECT USING (auth.uid() = applicant_id);
CREATE POLICY "Employers view received" ON job_applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_applications.job_id AND jobs.employer_id = auth.uid())
);
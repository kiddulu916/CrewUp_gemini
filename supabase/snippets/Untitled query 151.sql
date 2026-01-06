-- 1. Trigger to update 'has_portfolio' boolean in workers table
CREATE OR REPLACE FUNCTION update_has_portfolio() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE workers SET has_portfolio = true WHERE user_id = NEW.user_id;
    ELSIF (TG_OP = 'DELETE') THEN
        -- Check if any images remain
        IF NOT EXISTS (SELECT 1 FROM portfolio_images WHERE user_id = OLD.user_id) THEN
            UPDATE workers SET has_portfolio = false WHERE user_id = OLD.user_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_has_portfolio
AFTER INSERT OR DELETE ON portfolio_images
FOR EACH ROW EXECUTE FUNCTION update_has_portfolio();

-- 2. Trigger to update 'has_certifications' in workers table
CREATE OR REPLACE FUNCTION update_has_certifications() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE workers SET has_certifications = true WHERE user_id = NEW.worker_id;
    ELSIF (TG_OP = 'DELETE') THEN
        IF NOT EXISTS (SELECT 1 FROM certifications WHERE worker_id = OLD.worker_id) THEN
            UPDATE workers SET has_certifications = false WHERE user_id = OLD.worker_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_has_certifications
AFTER INSERT OR DELETE ON certifications
FOR EACH ROW EXECUTE FUNCTION update_has_certifications();

-- 3. Trigger to update 'has_cl' (Contractor License) in contractors table
CREATE OR REPLACE FUNCTION update_has_cl() RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE contractors SET has_cl = true WHERE user_id = NEW.contractor_id;
    ELSIF (TG_OP = 'DELETE') THEN
        IF NOT EXISTS (SELECT 1 FROM licenses WHERE contractor_id = OLD.contractor_id) THEN
            UPDATE contractors SET has_cl = false WHERE user_id = OLD.contractor_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_has_cl
AFTER INSERT OR DELETE ON licenses
FOR EACH ROW EXECUTE FUNCTION update_has_cl();

-- 4. Auth Trigger (Connects to Supabase Auth)
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
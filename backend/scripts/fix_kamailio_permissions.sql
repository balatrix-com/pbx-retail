-- Connect to the Kamailio database as a superuser (e.g., postgres)
-- psql -h 10.10.0.6 -U postgres -d kamailio

-- 1. Grant usage on schema (usually public)
GRANT USAGE ON SCHEMA public TO ap1;

-- 2. Grant all privileges on the subscriber table
GRANT ALL PRIVILEGES ON TABLE subscriber TO ap1;

-- 3. Grant privileges on the sequence (if subscriber uses a sequence for ID)
GRANT ALL PRIVILEGES ON SEQUENCE subscriber_id_seq TO ap1;

-- 4. Verify permissions
-- \z subscriber

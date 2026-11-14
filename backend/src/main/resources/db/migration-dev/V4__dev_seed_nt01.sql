-- Migration V4: Dev Environment NT-01 Seed Adjustments
-- Only loaded in 'dev' profile. Must NOT be loaded in 'prod' or default clean profile.

-- 1. Configure hr1 account with must_change_password = TRUE and company_id = 1
UPDATE users
SET must_change_password = TRUE,
    company_id = 1
WHERE email = 'hr1@rikkeijobs.test';

-- 2. Configure hr2 account with company_id = 2
UPDATE users
SET company_id = 2
WHERE email = 'hr2@rikkeijobs.test';

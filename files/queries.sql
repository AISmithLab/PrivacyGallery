-- ============================================================
-- Useful queries for your frontend to hit against the database
-- ============================================================

-- All cases (full table)
SELECT * FROM cases ORDER BY year DESC, processed_at DESC;

-- Summary list (lightweight, for a table/grid view)
SELECT
    id,
    company,
    jurisdiction,
    year,
    sector,
    violation_type,
    penalty_original,
    individuals_affected,
    enforcement_outcomes
FROM cases
ORDER BY year DESC;

-- Filter by jurisdiction
SELECT * FROM cases WHERE jurisdiction ILIKE '%GDPR%';

-- Filter by sector
SELECT * FROM cases WHERE sector ILIKE '%health%';

-- Filter by year range
SELECT * FROM cases WHERE year BETWEEN 2018 AND 2024;

-- Cases with criminal referrals
SELECT * FROM cases
WHERE enforcement_outcomes @> '["Criminal Referral"]'::jsonb;

-- Top penalised companies
SELECT company, SUM(penalty_amount_usd) AS total_penalties, COUNT(*) AS case_count
FROM cases
WHERE penalty_amount_usd IS NOT NULL
GROUP BY company
ORDER BY total_penalties DESC
LIMIT 20;

-- Violations by Solove category
SELECT violation_type, COUNT(*) AS count
FROM cases
GROUP BY violation_type
ORDER BY count DESC;

-- Cases by jurisdiction
SELECT jurisdiction, COUNT(*) AS count, SUM(individuals_affected) AS total_affected
FROM cases
GROUP BY jurisdiction
ORDER BY count DESC;

-- Full-text search across company, summary, outcome
SELECT * FROM cases
WHERE
    company ILIKE '%meta%' OR
    summary ILIKE '%facial recognition%' OR
    outcome ILIKE '%facial recognition%';

-- Most recent 10
SELECT id, company, jurisdiction, year, summary, penalty_original
FROM cases
ORDER BY processed_at DESC
LIMIT 10;

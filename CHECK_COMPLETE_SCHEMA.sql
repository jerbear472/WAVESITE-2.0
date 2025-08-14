-- Check all tables in your database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check trend_validations table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trend_validations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Look for user-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name ILIKE '%user%' OR table_name ILIKE '%profile%')
ORDER BY table_name;

-- Look for any earnings/ledger tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name ILIKE '%earning%' OR table_name ILIKE '%ledger%' OR table_name ILIKE '%payment%')
ORDER BY table_name;
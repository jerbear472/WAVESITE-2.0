-- Check what tables actually exist in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check for any table containing "trend" in the name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%trend%'
ORDER BY table_name;

-- Check for any table containing "post" in the name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%post%'
ORDER BY table_name;

-- Check for any table containing "submission" in the name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%submission%'
ORDER BY table_name;

-- Check for any table containing "validation" in the name
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%validation%'
ORDER BY table_name;
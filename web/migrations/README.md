# Database Migrations

## Migration Index

This directory contains all database migrations for the FreeWaveSight application.
Migrations are numbered sequentially and should be run in order.

### Core Migrations

| Version | File | Description | Status |
|---------|------|-------------|--------|
| 001 | `001_create_thumbnail_columns.sql` | Adds thumbnail_url, wave_score, post_url, screenshot_url columns | Core |
| 002 | `002_add_user_id_to_trend_validations.sql` | Adds user_id reference to trend_validations table | Core |
| 003 | `003_add_validation_count.sql` | Adds validation counting functionality | Core |
| 004 | `004_fix_submission_columns.sql` | Fixes submission table column issues | Core |
| 005 | `005_create_xp_events_table.sql` | Creates XP events tracking table | Core |
| 006 | `006_unify_xp_tables.sql` | Unifies XP tracking across tables | Core |
| 007 | `007_fix_user_xp_rls.sql` | Fixes Row Level Security for user XP | Core |
| 008 | `008_fix_dashboard_xp_view.sql` | Fixes dashboard XP view | Core |
| 009 | `009_create_validation_function.sql` | Creates validation helper functions | Core |
| 010 | `010_verify_persona_setup.sql` | Verifies persona system setup | Core |
| 011 | `011_add_enhanced_tracking_fields.sql` | Adds enhanced tracking fields | Core |
| 012 | `012_create_trend_umbrellas.sql` | Creates trend umbrella structure | Core |
| 013 | `013_ensure_social_media_columns.sql` | Ensures social media columns exist | Core |
| 014 | `014_fix_xp_events_tracking.sql` | Fixes XP events tracking with trend references | Core |

### Running Migrations

To run migrations in Supabase:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run each migration file in order (001, 002, 003...)
4. Mark completed migrations in the tracking table

### Migration Tracking

Create a migration tracking table to keep track of applied migrations:

```sql
CREATE TABLE IF NOT EXISTS migrations (
    version INTEGER PRIMARY KEY,
    filename TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT
);
```

### Archived Migrations

The `/archive` folder contains:
- Temporary fix files (FIX_*, FINAL-FIX_*)
- Diagnostic queries (CHECK_*, DIAGNOSE_*)
- Quick patches that have been superseded
- Old migration attempts

These files are kept for reference but should not be run in production.

### Best Practices

1. **Always backup** your database before running migrations
2. **Test migrations** in a development environment first
3. **Run migrations sequentially** - don't skip versions
4. **Document changes** - update this README when adding new migrations
5. **Use transactions** when possible to ensure atomicity

### Adding New Migrations

When creating a new migration:
1. Use the next sequential number (e.g., `011_description.sql`)
2. Include a descriptive name
3. Add comments in the SQL file explaining the changes
4. Update this README with the migration details
5. Test thoroughly before committing
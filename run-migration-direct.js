#!/usr/bin/env node

/**
 * Direct Database Migration Script
 * Uses the PostgreSQL connection string directly
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load from .env.migration file first, then fall back to web/.env.local
require('dotenv').config({ path: path.join(__dirname, '.env.migration') });
require('dotenv').config({ path: path.join(__dirname, 'web', '.env.local') });

// Get the database URL from environment or use the one you provided
const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || 
  'postgresql://postgres:[YOUR-PASSWORD]@db.aicahushpcslwjwrlqbo.supabase.co:5432/postgres';

if (DATABASE_URL.includes('[YOUR-PASSWORD]')) {
  console.error('❌ Please replace [YOUR-PASSWORD] with your actual database password');
  console.error('You can find this in your Supabase dashboard under Settings > Database');
  process.exit(1);
}

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Run diagnostic queries first
    console.log('📊 Checking current database state...\n');
    
    // Check tables
    const tablesResult = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_profiles', 'trend_submissions', 'trend_validations', 'profiles')
      ORDER BY table_name;
    `);
    
    console.log('Tables and Views:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}: ${row.table_type}`);
    });
    console.log();

    // Now run the fixes
    console.log('🔧 Applying fixes...\n');

    // Fix 1: Drop profiles view if it exists
    console.log('1. Dropping profiles view if exists...');
    await client.query('DROP VIEW IF EXISTS public.profiles CASCADE;');
    console.log('   ✅ Done\n');

    // Fix 2: Add missing columns to user_profiles
    console.log('2. Adding missing columns to user_profiles...');
    const columnsToAdd = [
      'earnings_pending DECIMAL(10,2) DEFAULT 0.00',
      'earnings_approved DECIMAL(10,2) DEFAULT 0.00',
      'earnings_paid DECIMAL(10,2) DEFAULT 0.00',
      'total_earnings DECIMAL(10,2) DEFAULT 0.00',
      'daily_earnings DECIMAL(10,2) DEFAULT 0.00',
      'daily_earnings_date DATE',
      'trends_spotted INTEGER DEFAULT 0',
      'accuracy_score DECIMAL(5,2) DEFAULT 0.00',
      'validation_score DECIMAL(5,2) DEFAULT 0.00',
      'current_streak INTEGER DEFAULT 0',
      'last_submission_at TIMESTAMPTZ'
    ];

    for (const column of columnsToAdd) {
      const columnName = column.split(' ')[0];
      try {
        await client.query(`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ${column};`);
        console.log(`   ✅ Added ${columnName}`);
      } catch (err) {
        console.log(`   ⚠️  ${columnName} might already exist`);
      }
    }
    console.log();

    // Fix 3: Recreate profiles view
    console.log('3. Creating profiles view...');
    await client.query('CREATE VIEW public.profiles AS SELECT * FROM public.user_profiles;');
    await client.query('GRANT ALL ON public.profiles TO authenticated;');
    await client.query('GRANT ALL ON public.profiles TO anon;');
    console.log('   ✅ View created with permissions\n');

    // Fix 4: Add columns to trend_submissions
    console.log('4. Adding missing columns to trend_submissions...');
    const trendColumns = [
      'base_amount DECIMAL(10,2) DEFAULT 1.00',
      'bonus_amount DECIMAL(10,2) DEFAULT 0.00',
      'total_earned DECIMAL(10,2) DEFAULT 0.00',
      'tier_multiplier DECIMAL(3,2) DEFAULT 0.70',
      'validation_threshold INTEGER DEFAULT 5'
    ];

    for (const column of trendColumns) {
      const columnName = column.split(' ')[0];
      try {
        await client.query(`ALTER TABLE trend_submissions ADD COLUMN IF NOT EXISTS ${column};`);
        console.log(`   ✅ Added ${columnName}`);
      } catch (err) {
        console.log(`   ⚠️  ${columnName} might already exist`);
      }
    }
    console.log();

    // Fix 5: Create trend_validations table if missing
    console.log('5. Creating trend_validations table if missing...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS trend_validations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
        validator_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
        vote BOOLEAN NOT NULL,
        quality_score DECIMAL(5,2),
        feedback TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(trend_id, validator_id)
      );
    `);
    console.log('   ✅ Table ready\n');

    // Fix 6: Create the voting function
    console.log('6. Creating cast_trend_vote function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION cast_trend_vote(
        p_trend_id UUID,
        p_validator_id UUID,
        p_vote BOOLEAN,
        p_quality_score DECIMAL DEFAULT NULL,
        p_feedback TEXT DEFAULT NULL
      ) RETURNS JSONB AS $$
      DECLARE
        v_spotter_id UUID;
        v_validation_count INTEGER;
        v_approve_count INTEGER;
        v_reject_count INTEGER;
      BEGIN
        -- Get trend info
        SELECT 
          spotter_id,
          COALESCE(validation_count, 0),
          COALESCE(approve_count, 0),
          COALESCE(reject_count, 0)
        INTO 
          v_spotter_id,
          v_validation_count,
          v_approve_count,
          v_reject_count
        FROM trend_submissions
        WHERE id = p_trend_id;
        
        -- Basic checks
        IF v_spotter_id IS NULL THEN
          RETURN jsonb_build_object('success', false, 'error', 'Trend not found');
        END IF;
        
        IF v_spotter_id = p_validator_id THEN
          RETURN jsonb_build_object('success', false, 'error', 'Cannot validate your own trend');
        END IF;
        
        -- Check if already voted
        IF EXISTS (SELECT 1 FROM trend_validations WHERE trend_id = p_trend_id AND validator_id = p_validator_id) THEN
          RETURN jsonb_build_object('success', false, 'error', 'Already voted');
        END IF;
        
        -- Insert vote
        INSERT INTO trend_validations (trend_id, validator_id, vote, quality_score, feedback)
        VALUES (p_trend_id, p_validator_id, p_vote, p_quality_score, p_feedback);
        
        -- Update counts
        IF p_vote THEN
          v_approve_count := v_approve_count + 1;
        ELSE
          v_reject_count := v_reject_count + 1;
        END IF;
        v_validation_count := v_validation_count + 1;
        
        -- Update trend
        UPDATE trend_submissions
        SET 
          validation_count = v_validation_count,
          approve_count = v_approve_count,
          reject_count = v_reject_count,
          status = CASE 
            WHEN v_validation_count >= 5 THEN
              CASE WHEN v_approve_count > v_reject_count THEN 'approved' ELSE 'rejected' END
            ELSE 'validating'
          END
        WHERE id = p_trend_id;
        
        -- Update validator earnings
        UPDATE user_profiles
        SET earnings_pending = COALESCE(earnings_pending, 0) + 0.10
        WHERE id = p_validator_id;
        
        -- Return success
        RETURN jsonb_build_object(
          'success', true,
          'validation_count', v_validation_count,
          'approve_count', v_approve_count,
          'reject_count', v_reject_count,
          'validator_earned', 0.10
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('   ✅ Function created\n');

    // Final check
    console.log('🎉 Migration completed! Running final checks...\n');
    
    const finalCheck = await client.query(`
      SELECT 
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') as has_profiles,
        EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'profiles') as has_view,
        EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'cast_trend_vote') as has_function
    `);
    
    const result = finalCheck.rows[0];
    console.log('Final Status:');
    console.log(`  User Profiles Table: ${result.has_profiles ? '✅' : '❌'}`);
    console.log(`  Profiles View: ${result.has_view ? '✅' : '❌'}`);
    console.log(`  Vote Function: ${result.has_function ? '✅' : '❌'}`);
    
    if (result.has_profiles && result.has_view && result.has_function) {
      console.log('\n✨ Your database is now production ready!');
    } else {
      console.log('\n⚠️ Some components might still be missing. Check the output above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run if called directly
if (require.main === module) {
  console.log('========================================');
  console.log('   WAVESIGHT DATABASE MIGRATION');
  console.log('========================================\n');
  
  runMigration().catch(console.error);
}

module.exports = { runMigration };
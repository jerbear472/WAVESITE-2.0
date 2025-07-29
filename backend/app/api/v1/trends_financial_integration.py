"""
Financial Integration for Trends API
Add this code to the existing trends.py file after trend submission
"""

# Add to imports at the top of trends.py:
from app.services.financial_extractor import FinancialIntelligenceExtractor, process_financial_signals
import asyncio

# Add after line 25 (after router initialization):
financial_extractor = FinancialIntelligenceExtractor()

# Add this function after the submit_trend endpoint (around line 75):
async def process_trend_financial_signals(trend_id: str):
    """Background task to process financial signals"""
    try:
        await process_financial_signals(trend_id)
    except Exception as e:
        print(f"Error processing financial signals for trend {trend_id}: {e}")

# Modify the submit_trend endpoint to include financial processing
# Add this code after the trend is successfully saved to the database (around line 70):

# After this line:
# db.commit()
# db.refresh(trend_submission)

# Add:
# Process financial signals in the background
asyncio.create_task(process_trend_financial_signals(str(trend_submission.id)))

# Also add a new endpoint to manually trigger financial analysis:
@router.post("/{trend_id}/analyze-financial")
async def analyze_trend_financial_signals(
    trend_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger financial analysis for a trend"""
    
    # Check if user owns the trend or is admin
    trend = db.query(TrendSubmission).filter(
        TrendSubmission.id == trend_id
    ).first()
    
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")
    
    if trend.spotter_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Process financial signals
    await process_financial_signals(trend_id)
    
    return {"message": "Financial analysis triggered successfully"}

# Add endpoint to get financial signals for a trend:
@router.get("/{trend_id}/financial-signals")
async def get_trend_financial_signals(
    trend_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get financial signals for a trend (enterprise users only)"""
    
    # Check if user has enterprise access
    if not current_user.subscription_tier in ['enterprise', 'exclusive']:
        raise HTTPException(
            status_code=403, 
            detail="Financial signals are available for enterprise users only"
        )
    
    # Get trend
    trend = db.query(TrendSubmission).filter(
        TrendSubmission.id == trend_id
    ).first()
    
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")
    
    # Get financial signals from Supabase
    from app.core.supabase_client import supabase
    
    signals_response = supabase.table('financial_signals').select(
        '*, stock_signals(*)'
    ).eq('trend_id', trend_id).single().execute()
    
    if not signals_response.data:
        return {"message": "No financial signals generated yet"}
    
    return signals_response.data
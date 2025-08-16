from supabase import create_client, Client
from .config import settings


def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY
    )


# Create a global instance
supabase_client = get_supabase_client()
supabase = supabase_client  # Alias for compatibility
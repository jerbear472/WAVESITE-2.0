import { supabase } from '../config/supabase';
import type {
  Signal,
  SignalFilters,
  SignalSortOptions,
  PaginatedResponse,
  Platform,
  SignalCategory,
  SignalType,
  ConfidenceLevel,
} from '../types';

class SignalService {
  /**
   * Fetch signals with optional filtering and sorting
   */
  async getSignals(
    filters?: SignalFilters,
    sort?: SignalSortOptions,
    page: number = 1,
    perPage: number = 50
  ): Promise<PaginatedResponse<Signal>> {
    let query = supabase
      .from('signals')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters) {
      if (filters.platforms?.length) {
        query = query.in('platform', filters.platforms);
      }
      if (filters.categories?.length) {
        query = query.in('category', filters.categories);
      }
      if (filters.signal_types?.length) {
        query = query.in('signal_type', filters.signal_types);
      }
      if (filters.min_momentum !== undefined) {
        query = query.gte('momentum_score', filters.min_momentum);
      }
      if (filters.max_forecast_days !== undefined) {
        query = query.lte('forecast_mainstream_days', filters.max_forecast_days);
      }
      if (filters.confidence_levels?.length) {
        query = query.in('forecast_confidence', filters.confidence_levels);
      }
      if (filters.detected_after) {
        query = query.gte('detected_at', filters.detected_after);
      }
      if (filters.detected_before) {
        query = query.lte('detected_at', filters.detected_before);
      }
    }

    // Apply sorting
    const sortField = sort?.field || 'momentum_score';
    const sortDirection = sort?.direction || 'desc';
    query = query.order(sortField, { ascending: sortDirection === 'asc' });

    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('getSignals error:', error);
      throw error;
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      per_page: perPage,
      has_more: (count || 0) > page * perPage,
    };
  }

  /**
   * Get a single signal by ID with full history
   */
  async getSignal(signalId: string): Promise<Signal | null> {
    const { data, error } = await supabase
      .from('signals')
      .select('*, outcome:signal_outcomes(*)')
      .eq('id', signalId)
      .single();

    if (error) {
      console.error('getSignal error:', error);
      return null;
    }

    return data;
  }

  /**
   * Get top signals by momentum score
   */
  async getTopSignals(limit: number = 10): Promise<Signal[]> {
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .order('momentum_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('getTopSignals error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get signals detected today
   */
  async getTodaySignals(): Promise<Signal[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .gte('detected_at', today.toISOString())
      .order('momentum_score', { ascending: false });

    if (error) {
      console.error('getTodaySignals error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get signals by platform
   */
  async getSignalsByPlatform(platform: Platform): Promise<Signal[]> {
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .eq('platform', platform)
      .order('momentum_score', { ascending: false })
      .limit(50);

    if (error) {
      console.error('getSignalsByPlatform error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get signals by category
   */
  async getSignalsByCategory(category: SignalCategory): Promise<Signal[]> {
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .eq('category', category)
      .order('momentum_score', { ascending: false })
      .limit(50);

    if (error) {
      console.error('getSignalsByCategory error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Search signals by name or identifier
   */
  async searchSignals(query: string): Promise<Signal[]> {
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .or(`name.ilike.%${query}%,identifier.ilike.%${query}%`)
      .order('momentum_score', { ascending: false })
      .limit(20);

    if (error) {
      console.error('searchSignals error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get signals that are forecasted to go mainstream soon
   */
  async getUpcomingMainstream(maxDays: number = 14): Promise<Signal[]> {
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .not('forecast_mainstream_days', 'is', null)
      .lte('forecast_mainstream_days', maxDays)
      .order('forecast_mainstream_days', { ascending: true });

    if (error) {
      console.error('getUpcomingMainstream error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get high confidence signals
   */
  async getHighConfidenceSignals(): Promise<Signal[]> {
    const { data, error } = await supabase
      .from('signals')
      .select('*')
      .eq('forecast_confidence', 'high')
      .order('momentum_score', { ascending: false })
      .limit(20);

    if (error) {
      console.error('getHighConfidenceSignals error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get signal count by filters
   */
  async getSignalCount(filters?: SignalFilters): Promise<number> {
    let query = supabase
      .from('signals')
      .select('*', { count: 'exact', head: true });

    if (filters) {
      if (filters.platforms?.length) {
        query = query.in('platform', filters.platforms);
      }
      if (filters.categories?.length) {
        query = query.in('category', filters.categories);
      }
      if (filters.min_momentum !== undefined) {
        query = query.gte('momentum_score', filters.min_momentum);
      }
    }

    const { count, error } = await query;

    if (error) {
      console.error('getSignalCount error:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Subscribe to real-time signal updates
   */
  subscribeToSignals(
    callback: (signal: Signal) => void
  ): () => void {
    const subscription = supabase
      .channel('signals-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signals',
        },
        (payload) => {
          callback(payload.new as Signal);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export default new SignalService();

import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = {
  // Authentication
  async register(userData: {
    email: string
    password: string
    username: string
    demographics?: any
    interests?: any
  }) {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Registration failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  async login(credentials: { email: string; password: string }) {
    try {
      const formData = new FormData()
      formData.append('username', credentials.email) // OAuth2 expects username field
      formData.append('password', credentials.password)

      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Login failed')
      }

      const data = await response.json()
      
      // Store the token
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token)
      }

      return data
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  async logout() {
    try {
      const token = localStorage.getItem('access_token')
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      localStorage.removeItem('access_token')
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  },

  async getCurrentUser() {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return null

      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token')
          return null
        }
        throw new Error('Failed to get user')
      }

      return await response.json()
    } catch (error) {
      console.error('Get user error:', error)
      return null
    }
  },
  // Get trending discoveries
  async getTrends({ category, timeframe }: { category?: string; timeframe: string }) {
    try {
      // For MVP, get data directly from Supabase
      let query = supabase
        .from('trend_submissions')
        .select('*')
        .in('status', ['approved', 'viral'])
        .order('validation_count', { ascending: false })
        .limit(50)

      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      // Filter by timeframe
      const now = new Date()
      let since = new Date()
      
      switch (timeframe) {
        case 'day':
          since.setDate(now.getDate() - 1)
          break
        case 'week':
          since.setDate(now.getDate() - 7)
          break
        case 'month':
          since.setMonth(now.getMonth() - 1)
          break
      }

      query = query.gte('created_at', since.toISOString())

      const { data, error } = await query

      if (error) throw error

      // Transform data to include wave score
      return data?.map(trend => ({
        ...trend,
        waveScore: trend.quality_score * 10 // Convert to 0-10 scale
      })) || []
    } catch (error) {
      console.error('Error fetching trends:', error)
      return []
    }
  },

  // Get insights
  async getInsights({ timeframe }: { timeframe: string }) {
    try {
      // For MVP, generate insights from trend data
      const { data: trends } = await supabase
        .from('trend_submissions')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10)

      // Transform trends into insights
      return trends?.map(trend => ({
        id: trend.id,
        title: `${trend.category.replace('_', ' ')} trend spotted`,
        description: trend.description,
        category: trend.category,
        impact: trend.quality_score > 0.7 ? 'high' : trend.quality_score > 0.4 ? 'medium' : 'low',
        timestamp: trend.created_at
      })) || []
    } catch (error) {
      console.error('Error fetching insights:', error)
      return []
    }
  },

  // Get competitors/top spotters
  async getCompetitors() {
    try {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .order('trends_spotted', { ascending: false })
        .limit(10)

      return profiles?.map(profile => ({
        id: profile.id,
        name: profile.username,
        platform: 'WaveSite',
        trendCount: profile.trends_spotted,
        lastActive: profile.created_at,
        recentActivity: `Spotted ${profile.trends_spotted} trends`
      })) || []
    } catch (error) {
      console.error('Error fetching competitors:', error)
      return []
    }
  },

  // Submit a new trend
  async submitTrend(trendData: {
    category: string
    description: string
    screenshot?: File
    evidence: string[]
    viralityPrediction: number
  }) {
    try {
      // Upload screenshot if provided
      let screenshotUrl = null
      if (trendData.screenshot) {
        const fileName = `${Date.now()}-${trendData.screenshot.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(fileName, trendData.screenshot)

        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage
          .from('screenshots')
          .getPublicUrl(fileName)
          
        screenshotUrl = publicUrl
      }

      // Submit to backend API
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/trends/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...trendData,
          screenshot_url: screenshotUrl
        })
      })

      if (!response.ok) throw new Error('Failed to submit trend')
      
      return await response.json()
    } catch (error) {
      console.error('Error submitting trend:', error)
      throw error
    }
  },

  // Validate a trend
  async validateTrend(trendId: string, validation: {
    confirmed: boolean
    evidence_url?: string
    notes?: string
  }) {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/trends/validate/${trendId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(validation)
      })

      if (!response.ok) throw new Error('Failed to validate trend')
      
      return await response.json()
    } catch (error) {
      console.error('Error validating trend:', error)
      throw error
    }
  },

  // Get trend umbrellas with grouped submissions
  async getTrendUmbrellas({ status, limit = 20 }: { status?: string; limit?: number } = {}) {
    try {
      const token = localStorage.getItem('access_token')
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      if (limit) params.append('limit', limit.toString())

      const response = await fetch(`${API_URL}/api/v1/trend-umbrellas?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        console.error('Failed to fetch trend umbrellas, falling back to Supabase')
        // Fallback to Supabase for backward compatibility
        return this.getTrendUmbrellasFromSupabase({ status, limit })
      }

      const data = await response.json()
      
      // Transform data to match expected format
      return data?.map((umbrella: any) => ({
        id: umbrella.id,
        title: umbrella.name,
        description: umbrella.description,
        waveScore: Math.round(umbrella.avg_virality_score * 10) || 50,
        category: umbrella.categories?.split(', ')[0] || 'Lifestyle',
        status: umbrella.status as 'emerging' | 'trending' | 'peak' | 'declining',
        totalEarnings: umbrella.total_engagement || 0,
        contentCount: umbrella.submission_count || 0,
        thumbnailUrls: [], // Will be populated from individual submissions if needed
        platformDistribution: this.extractPlatformDistribution(umbrella.common_hashtags || []),
        isCollaborative: umbrella.submission_count > 1,
        firstContentDate: umbrella.first_seen_at,
        lastContentDate: umbrella.last_updated_at,
        contentItems: [],
        umbrellaId: umbrella.id,
        keywords: umbrella.keywords || [],
        commonHashtags: umbrella.common_hashtags || []
      })) || []
    } catch (error) {
      console.error('Error fetching trend umbrellas:', error)
      return this.getTrendUmbrellasFromSupabase({ status, limit })
    }
  },

  // Fallback method using Supabase
  async getTrendUmbrellasFromSupabase({ status, limit = 20 }: { status?: string; limit?: number } = {}) {
    try {
      let query = supabase
        .from('trend_umbrellas')
        .select(`
          *,
          submissions:trend_submissions(
            id,
            description,
            screenshot_url,
            thumbnail_url,
            quality_score,
            validation_count,
            bounty_amount,
            created_at,
            validated_at,
            hashtags,
            category,
            status,
            spotter_id
          )
        `)
        .order('total_engagement', { ascending: false })
        .limit(limit)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error

      // Transform data to match expected format
      return data?.map(umbrella => ({
        id: umbrella.id,
        title: umbrella.name,
        description: umbrella.description,
        waveScore: Math.round(umbrella.avg_virality_score * 10) || 50,
        category: umbrella.submissions?.[0]?.category || 'Lifestyle',
        status: umbrella.status as 'emerging' | 'trending' | 'peak' | 'declining',
        totalEarnings: umbrella.submissions?.reduce((sum: number, sub: any) => sum + (sub.bounty_amount || 0), 0) || 0,
        contentCount: umbrella.submission_count || umbrella.submissions?.length || 0,
        thumbnailUrls: umbrella.submissions?.map((sub: any) => sub.screenshot_url || sub.thumbnail_url).filter(Boolean).slice(0, 4) || [],
        platformDistribution: this.extractPlatformDistribution(umbrella.common_hashtags || []),
        isCollaborative: umbrella.submission_count > 1,
        firstContentDate: umbrella.first_seen_at || umbrella.created_at,
        lastContentDate: umbrella.last_updated_at || umbrella.created_at,
        contentItems: umbrella.submissions || [],
        umbrellaId: umbrella.id,
        keywords: umbrella.keywords || [],
        commonHashtags: umbrella.common_hashtags || []
      })) || []
    } catch (error) {
      console.error('Error fetching trend umbrellas from Supabase:', error)
      return []
    }
  },

  // Get submissions for a specific umbrella
  async getUmbrellaSubmissions(umbrellaId: string) {
    try {
      const { data, error } = await supabase
        .from('trend_submissions')
        .select(`
          *,
          user_profiles!spotter_id (username)
        `)
        .eq('trend_umbrella_id', umbrellaId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching umbrella submissions:', error)
      return []
    }
  },

  // Create or update a trend umbrella
  async createTrendUmbrella(umbrellaData: {
    name: string
    description?: string
    keywords?: string[]
    submissionIds?: string[]
  }) {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${API_URL}/api/v1/trend-umbrellas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: umbrellaData.name,
          description: umbrellaData.description,
          keywords: umbrellaData.keywords || [],
          submission_ids: umbrellaData.submissionIds || []
        }),
      })

      if (!response.ok) {
        console.error('Failed to create trend umbrella via API, falling back to Supabase')
        return this.createTrendUmbrellaWithSupabase(umbrellaData)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating trend umbrella:', error)
      return this.createTrendUmbrellaWithSupabase(umbrellaData)
    }
  },

  // Fallback method using Supabase
  async createTrendUmbrellaWithSupabase(umbrellaData: {
    name: string
    description?: string
    keywords?: string[]
    submissionIds?: string[]
  }) {
    try {
      // Create umbrella
      const { data: umbrella, error: umbrellaError } = await supabase
        .from('trend_umbrellas')
        .insert({
          name: umbrellaData.name,
          description: umbrellaData.description,
          keywords: umbrellaData.keywords || [],
          status: 'emerging'
        })
        .select('id')
        .single()

      if (umbrellaError) throw umbrellaError

      // Link submissions to umbrella
      if (umbrellaData.submissionIds?.length) {
        const { error: linkError } = await supabase
          .from('trend_submissions')
          .update({ trend_umbrella_id: umbrella.id })
          .in('id', umbrellaData.submissionIds)

        if (linkError) throw linkError
      }

      return umbrella
    } catch (error) {
      console.error('Error creating trend umbrella:', error)
      throw error
    }
  },

  // Add submission to existing umbrella
  async addSubmissionToUmbrella(submissionId: string, umbrellaId: string) {
    try {
      const { error } = await supabase
        .from('trend_submissions')
        .update({ trend_umbrella_id: umbrellaId })
        .eq('id', submissionId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error adding submission to umbrella:', error)
      throw error
    }
  },

  // Remove submission from umbrella
  async removeSubmissionFromUmbrella(submissionId: string) {
    try {
      const { error } = await supabase
        .from('trend_submissions')
        .update({ trend_umbrella_id: null })
        .eq('id', submissionId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error removing submission from umbrella:', error)
      throw error
    }
  },

  // Helper function to extract platform distribution from hashtags
  extractPlatformDistribution(hashtags: string[]): Record<string, number> {
    const platforms: Record<string, number> = {}
    
    hashtags.forEach(tag => {
      const lowerTag = tag.toLowerCase()
      if (lowerTag.includes('tiktok')) platforms.tiktok = (platforms.tiktok || 0) + 1
      if (lowerTag.includes('instagram') || lowerTag.includes('insta')) platforms.instagram = (platforms.instagram || 0) + 1
      if (lowerTag.includes('youtube') || lowerTag.includes('yt')) platforms.youtube = (platforms.youtube || 0) + 1
      if (lowerTag.includes('twitter') || lowerTag.includes('x.com')) platforms.twitter = (platforms.twitter || 0) + 1
      if (lowerTag.includes('linkedin')) platforms.linkedin = (platforms.linkedin || 0) + 1
    })
    
    // Default if no platforms detected
    if (Object.keys(platforms).length === 0) {
      platforms.tiktok = Math.floor(Math.random() * 5) + 1
    }
    
    return platforms
  }
}
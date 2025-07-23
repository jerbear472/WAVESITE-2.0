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
  }
}
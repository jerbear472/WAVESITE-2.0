'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import WaveLogo from '@/components/WaveLogo';
import { 
  Users as UsersIcon,
  UserCheck as UserCheckIcon,
  UserX as UserXIcon,
  Shield as ShieldIcon,
  Building as BuildingIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  X as XIcon,
  Search as SearchIcon,
  Filter as FilterIcon,
  Download as DownloadIcon,
  RefreshCw as RefreshCwIcon,
  ChevronDown as ChevronDownIcon
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'participant' | 'validator' | 'manager' | 'client' | 'admin';
  account_type: 'user' | 'client';
  organization?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  subscription_tier: string;
  trends_spotted: number;
  accuracy_score: number;
  total_earnings: number;
  total_submissions: number;
  total_validations: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterAccountType, setFilterAccountType] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Partial<User>>({});
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  const checkAdminAccess = async () => {
    try {
      // Check if user is admin through AuthContext
      if (!user?.is_admin) {
        router.push('/dashboard');
        return;
      }

      fetchUsers();
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/dashboard');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_management_view')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, updates: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: updates.role,
          account_type: updates.account_type,
          organization: updates.organization,
          is_active: updates.is_active,
          subscription_tier: updates.subscription_tier
        })
        .eq('id', userId);

      if (error) throw error;

      // Log the activity
      await supabase.rpc('log_user_activity', {
        p_action: 'update_user',
        p_target_user_id: userId,
        p_details: { updates }
      });

      // Refresh users
      fetchUsers();
      setEditingUser(null);
      setEditedData({});
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.organization?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesAccountType = filterAccountType === 'all' || user.account_type === filterAccountType;

    return matchesSearch && matchesRole && matchesAccountType;
  });

  const exportUsers = () => {
    const csv = [
      ['Username', 'Email', 'Role', 'Account Type', 'Organization', 'Status', 'Trends Spotted', 'Accuracy Score', 'Total Earnings', 'Created At'],
      ...filteredUsers.map(user => [
        user.username,
        user.email,
        user.role,
        user.account_type,
        user.organization || '',
        user.is_active ? 'Active' : 'Inactive',
        user.trends_spotted,
        user.accuracy_score,
        user.total_earnings,
        new Date(user.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wavesite-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wave-500 mx-auto mb-4"></div>
          <p className="text-wave-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <WaveLogo size={50} animated={true} showTitle={false} />
              <div>
                <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-wave-400 mt-1">Manage users and access levels</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-wave-700/50 hover:bg-wave-600/50 rounded-lg transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="wave-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-wave-400 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-white mt-1">{users.length}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-wave-500" />
            </div>
          </div>
          
          <div className="wave-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-wave-400 text-sm">Active Users</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {users.filter(u => u.is_active).length}
                </p>
              </div>
              <UserCheckIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="wave-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-wave-400 text-sm">Client Accounts</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {users.filter(u => u.account_type === 'client').length}
                </p>
              </div>
              <BuildingIcon className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          
          <div className="wave-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-wave-400 text-sm">Admins</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <ShieldIcon className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="wave-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-wave-500" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-wave-900/50 border border-wave-700 rounded-lg text-white placeholder-wave-500 focus:border-wave-500 focus:outline-none"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-wave-800/50 hover:bg-wave-700/50 rounded-lg transition-all"
              >
                <FilterIcon className="w-4 h-4" />
                Filters
                <ChevronDownIcon className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              <button
                onClick={fetchUsers}
                className="p-2 bg-wave-800/50 hover:bg-wave-700/50 rounded-lg transition-all"
              >
                <RefreshCwIcon className="w-5 h-5" />
              </button>
              
              <button
                onClick={exportUsers}
                className="flex items-center gap-2 px-4 py-2 bg-wave-600 hover:bg-wave-500 rounded-lg transition-all"
              >
                <DownloadIcon className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-wave-700">
              <div>
                <label className="block text-sm text-wave-400 mb-2">Filter by Role</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full px-3 py-2 bg-wave-800/50 border border-wave-700 rounded-lg text-white focus:border-wave-500 focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="participant">Participant</option>
                  <option value="validator">Validator</option>
                  <option value="manager">Manager</option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-wave-400 mb-2">Filter by Account Type</label>
                <select
                  value={filterAccountType}
                  onChange={(e) => setFilterAccountType(e.target.value)}
                  className="w-full px-3 py-2 bg-wave-800/50 border border-wave-700 rounded-lg text-white focus:border-wave-500 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="user">User</option>
                  <option value="client">Client</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm text-wave-400 mb-2">Results</label>
                <p className="text-2xl font-bold text-white">{filteredUsers.length} users</p>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="wave-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-wave-900/50 border-b border-wave-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-wave-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-wave-300 uppercase tracking-wider">Role & Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-wave-300 uppercase tracking-wider">Organization</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-wave-300 uppercase tracking-wider">Stats</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-wave-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-wave-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-wave-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-wave-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{user.username}</p>
                        <p className="text-wave-400 text-sm">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingUser === user.id ? (
                        <div className="space-y-2">
                          <select
                            value={editedData.role || user.role}
                            onChange={(e) => setEditedData({ ...editedData, role: e.target.value as User['role'] })}
                            className="px-2 py-1 bg-wave-800 border border-wave-600 rounded text-sm text-white"
                          >
                            <option value="participant">Participant</option>
                            <option value="validator">Validator</option>
                            <option value="manager">Manager</option>
                            <option value="client">Client</option>
                            <option value="admin">Admin</option>
                          </select>
                          <select
                            value={editedData.account_type || user.account_type}
                            onChange={(e) => setEditedData({ ...editedData, account_type: e.target.value as User['account_type'] })}
                            className="px-2 py-1 bg-wave-800 border border-wave-600 rounded text-sm text-white"
                          >
                            <option value="user">User</option>
                            <option value="client">Client</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                            user.role === 'manager' ? 'bg-yellow-500/20 text-yellow-400' :
                            user.role === 'client' ? 'bg-purple-500/20 text-purple-400' :
                            user.role === 'validator' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {user.role}
                          </span>
                          <p className="text-wave-500 text-xs mt-1">{user.account_type}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingUser === user.id ? (
                        <input
                          type="text"
                          value={editedData.organization || user.organization || ''}
                          onChange={(e) => setEditedData({ ...editedData, organization: e.target.value })}
                          placeholder="Organization name"
                          className="px-2 py-1 bg-wave-800 border border-wave-600 rounded text-sm text-white w-full"
                        />
                      ) : (
                        <p className="text-wave-300 text-sm">{user.organization || '-'}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-wave-300">Trends: {user.trends_spotted}</p>
                        <p className="text-wave-400">Accuracy: {user.accuracy_score}%</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingUser === user.id ? (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editedData.is_active ?? user.is_active}
                            onChange={(e) => setEditedData({ ...editedData, is_active: e.target.checked })}
                            className="rounded border-wave-600"
                          />
                          <span className="text-sm text-wave-300">Active</span>
                        </label>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          user.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {editingUser === user.id ? (
                          <>
                            <button
                              onClick={() => updateUserRole(user.id, editedData)}
                              className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-all"
                            >
                              <SaveIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingUser(null);
                                setEditedData({});
                              }}
                              className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-all"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingUser(user.id);
                              setEditedData({
                                role: user.role,
                                account_type: user.account_type,
                                organization: user.organization,
                                is_active: user.is_active
                              });
                            }}
                            className="p-2 bg-wave-700/50 hover:bg-wave-600/50 rounded transition-all"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
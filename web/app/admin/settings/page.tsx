'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  role: string;
  permissions: Record<string, boolean>;
  view_mode: 'user' | 'professional';
}

interface AccessControl {
  id: string;
  user_id: string;
  access_level: 'viewer' | 'analyst' | 'manager' | 'admin';
  permissions: Record<string, boolean>;
  granted_at: string;
  expires_at?: string;
  user?: UserProfile;
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [accessControls, setAccessControls] = useState<AccessControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showGrantAccess, setShowGrantAccess] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
    fetchAccessControls();
  }, [user, router]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAccessControls = async () => {
    try {
      const { data, error } = await supabase
        .from('access_controls')
        .select(`
          *,
          user:user_profiles(*)
        `)
        .order('granted_at', { ascending: false });

      if (error) throw error;
      setAccessControls(data || []);
    } catch (error) {
      console.error('Error fetching access controls:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const updateUserPermission = async (userId: string, permission: string, value: boolean) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const updatedPermissions = {
        ...user.permissions,
        [permission]: value
      };

      const { error } = await supabase
        .from('user_profiles')
        .update({ permissions: updatedPermissions })
        .eq('id', userId);

      if (error) throw error;
      
      // Refresh users list
      fetchUsers();
    } catch (error) {
      console.error('Error updating user permission:', error);
    }
  };

  const grantAccess = async (userId: string, accessLevel: string, permissions: Record<string, boolean>) => {
    try {
      const { error } = await supabase
        .from('access_controls')
        .upsert({
          admin_id: user?.id,
          user_id: userId,
          access_level: accessLevel,
          permissions: permissions
        });

      if (error) throw error;
      
      setShowGrantAccess(false);
      setSelectedUser(null);
      fetchAccessControls();
    } catch (error) {
      console.error('Error granting access:', error);
    }
  };

  const revokeAccess = async (accessControlId: string) => {
    try {
      const { error } = await supabase
        .from('access_controls')
        .delete()
        .eq('id', accessControlId);

      if (error) throw error;
      
      fetchAccessControls();
    } catch (error) {
      console.error('Error revoking access:', error);
    }
  };

  if (loading || !user || user.role !== 'admin') {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Settings</h1>
      
      {/* User Management Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  View Mode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{u.username}</div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value)}
                      className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      disabled={u.username === 'jeremyuys'}
                    >
                      <option value="participant">Participant</option>
                      <option value="validator">Validator</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{u.view_mode || 'user'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={u.permissions?.can_switch_views || false}
                          onChange={(e) => updateUserPermission(u.id, 'can_switch_views', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Can switch views</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={u.permissions?.can_manage_users || false}
                          onChange={(e) => updateUserPermission(u.id, 'can_manage_users', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Can manage users</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={u.permissions?.can_access_all_data || false}
                          onChange={(e) => updateUserPermission(u.id, 'can_access_all_data', e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Can access all data</span>
                      </label>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setSelectedUser(u.id);
                        setShowGrantAccess(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-900"
                    >
                      Grant Access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Access Controls Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Controls</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Granted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accessControls.map((ac) => (
                <tr key={ac.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{ac.user?.username}</div>
                      <div className="text-sm text-gray-500">{ac.user?.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{ac.access_level}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      {new Date(ac.granted_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => revokeAccess(ac.id)}
                      className="text-sm text-red-600 hover:text-red-900"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant Access Modal */}
      {showGrantAccess && selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Grant Access</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Access Level</label>
                <select
                  id="access-level"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="viewer">Viewer</option>
                  <option value="analyst">Analyst</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowGrantAccess(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const accessLevel = (document.getElementById('access-level') as HTMLSelectElement).value;
                    grantAccess(selectedUser, accessLevel, {});
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Grant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
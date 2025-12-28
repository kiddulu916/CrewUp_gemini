'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/providers/toast-provider';
import {
  getPlatformSettings,
  updatePlatformSetting,
  getAdminUsers,
  grantAdminAccess,
  revokeAdminAccess,
  searchUsersForAdmin,
  getAdminActivityLog,
} from '@/features/admin/actions/settings-actions';

type PlatformSetting = {
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

type AdminUser = {
  user_id: string;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
};

type UserSearchResult = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  is_admin: boolean;
};

type ActivityLog = {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: any;
  created_at: string;
  admin: { name: string; email: string } | null;
};

export default function SettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'admins' | 'activity'>('settings');

  // Settings editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Admin management state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<(UserSearchResult | AdminUser) | null>(null);
  const [grantReason, setGrantReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsResult, adminsResult, activityResult] = await Promise.all([
        getPlatformSettings(),
        getAdminUsers(),
        getAdminActivityLog(50),
      ]);

      if (settingsResult.success) {
        setSettings(settingsResult.data || []);
      } else {
        toast.error(settingsResult.error || 'Failed to load settings');
      }

      if (adminsResult.success) {
        setAdminUsers(adminsResult.data || []);
      } else {
        toast.error(adminsResult.error || 'Failed to load admin users');
      }

      if (activityResult.success) {
        setActivityLog(activityResult.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load settings data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSetting = (key: string, currentValue: any) => {
    setEditingKey(key);
    setEditValue(typeof currentValue === 'boolean' ? currentValue.toString() : String(currentValue));
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleSaveSetting = async (setting: PlatformSetting) => {
    if (editingKey !== setting.key) return;

    setSaveLoading(true);
    try {
      // Parse the value based on the current type
      let parsedValue: any = editValue;

      if (setting.value === true || setting.value === false) {
        parsedValue = editValue === 'true';
      } else if (typeof setting.value === 'number') {
        parsedValue = Number(editValue);
      }

      const result = await updatePlatformSetting(
        setting.key,
        parsedValue,
        setting.description || undefined
      );

      if (result.success) {
        toast.success('Setting updated successfully');
        setEditingKey(null);
        setEditValue('');
        loadData();
      } else {
        toast.error(result.error || 'Failed to update setting');
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('Failed to update setting');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await searchUsersForAdmin(query);
      if (result.success) {
        setSearchResults(result.data || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleGrantAdmin = async () => {
    if (!selectedUser) return;

    if (!grantReason.trim()) {
      toast.error('Please provide a reason for granting admin access');
      return;
    }

    setAdminActionLoading(true);
    try {
      const result = await grantAdminAccess(selectedUser.user_id, grantReason);

      if (result.success) {
        toast.success('Admin access granted successfully');
        setShowGrantDialog(false);
        setSelectedUser(null);
        setGrantReason('');
        setSearchQuery('');
        setSearchResults([]);
        loadData();
      } else {
        toast.error(result.error || 'Failed to grant admin access');
      }
    } catch (error) {
      console.error('Error granting admin:', error);
      toast.error('Failed to grant admin access');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleRevokeAdmin = async (admin: AdminUser) => {
    if (!revokeReason.trim()) {
      toast.error('Please provide a reason for revoking admin access');
      return;
    }

    setAdminActionLoading(true);
    try {
      const result = await revokeAdminAccess(admin.user_id, revokeReason);

      if (result.success) {
        toast.success('Admin access revoked successfully');
        setShowRevokeDialog(false);
        setSelectedUser(null);
        setRevokeReason('');
        loadData();
      } else {
        toast.error(result.error || 'Failed to revoke admin access');
      }
    } catch (error) {
      console.error('Error revoking admin:', error);
      toast.error('Failed to revoke admin access');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const formatSettingValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Enabled' : 'Disabled';
    }
    return String(value);
  };

  const getSettingBadgeVariant = (value: any): 'success' | 'danger' | 'default' => {
    if (typeof value === 'boolean') {
      return value ? 'success' : 'danger';
    }
    return 'default';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure platform-wide settings and manage admin users
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Platform Settings
          </button>
          <button
            onClick={() => setActiveTab('admins')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'admins'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Admin Users ({adminUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Activity Log
          </button>
        </div>
      </div>

      {/* Platform Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {settings.length === 0 ? (
                <EmptyState
                  icon="⚙️"
                  title="No settings found"
                  description="Platform settings will appear here"
                />
              ) : (
                <div className="space-y-4">
                  {settings.map((setting) => (
                    <div
                      key={setting.key}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900">
                              {setting.key.split('_').map(word =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </h3>
                            {editingKey !== setting.key && (
                              <Badge variant={getSettingBadgeVariant(setting.value)}>
                                {formatSettingValue(setting.value)}
                              </Badge>
                            )}
                          </div>
                          {setting.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {setting.description}
                            </p>
                          )}
                          {editingKey === setting.key ? (
                            <div className="mt-3 space-y-3">
                              {typeof setting.value === 'boolean' ? (
                                <select
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="true">Enabled</option>
                                  <option value="false">Disabled</option>
                                </select>
                              ) : (
                                <Input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-full md:w-64"
                                />
                              )}
                              <div className="flex gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSaveSetting(setting)}
                                  disabled={saveLoading}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  disabled={saveLoading}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500 mt-2">
                              Last updated: {new Date(setting.updated_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {editingKey !== setting.key && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSetting(setting.key, setting.value)}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin Users Tab */}
      {activeTab === 'admins' && (
        <div className="space-y-6">
          {/* Add Admin Section */}
          <Card>
            <CardHeader>
              <CardTitle>Grant Admin Access</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Search for user
                  </label>
                  <Input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.user_id}
                        onClick={() => {
                          setSelectedUser(user);
                          setShowGrantDialog(true);
                          setSearchResults([]);
                          setSearchQuery('');
                        }}
                        className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
                      >
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <Badge variant="default" className="mt-1">
                          {user.role}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {/* Grant Admin Dialog */}
                {showGrantDialog && selectedUser && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold mb-2">
                      Grant Admin Access to {selectedUser.name}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Reason
                        </label>
                        <Input
                          type="text"
                          value={grantReason}
                          onChange={(e) => setGrantReason(e.target.value)}
                          placeholder="Enter reason for granting admin access..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          onClick={handleGrantAdmin}
                          disabled={adminActionLoading}
                        >
                          Grant Access
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowGrantDialog(false);
                            setSelectedUser(null);
                            setGrantReason('');
                          }}
                          disabled={adminActionLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Admins */}
          <Card>
            <CardHeader>
              <CardTitle>Current Admin Users</CardTitle>
            </CardHeader>
            <CardContent>
              {adminUsers.length === 0 ? (
                <EmptyState
                  icon="👥"
                  title="No admin users"
                  description="Grant admin access to users to get started"
                />
              ) : (
                <div className="space-y-3">
                  {adminUsers.map((admin) => (
                    <div
                      key={admin.user_id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{admin.name}</p>
                            <Badge variant="danger">Admin</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {admin.email}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Admin since: {new Date(admin.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(admin);
                            setShowRevokeDialog(true);
                          }}
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Revoke Admin Dialog */}
              {showRevokeDialog && selectedUser && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold mb-2 text-red-900">
                    Revoke Admin Access from {selectedUser.name}
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Reason
                      </label>
                      <Input
                        type="text"
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        placeholder="Enter reason for revoking admin access..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        onClick={() => {
                          const adminUser = adminUsers.find(a => a.user_id === selectedUser?.user_id);
                          if (adminUser) handleRevokeAdmin(adminUser);
                        }}
                        disabled={adminActionLoading}
                      >
                        Revoke Access
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowRevokeDialog(false);
                          setSelectedUser(null);
                          setRevokeReason('');
                        }}
                        disabled={adminActionLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Admin Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLog.length === 0 ? (
              <EmptyState
                icon="📋"
                title="No activity logged"
                description="Admin actions will appear here"
              />
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {activityLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">
                            {log.action.split('_').map(word =>
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </Badge>
                          {log.target_type && (
                            <span className="text-sm text-gray-600">
                              {log.target_type}
                            </span>
                          )}
                        </div>
                        {log.admin && (
                          <p className="text-sm text-gray-700 mt-1">
                            By: {log.admin.name} ({log.admin.email})
                          </p>
                        )}
                        {log.details && (
                          <div className="text-sm text-gray-600 mt-1">
                            {log.details.reason && (
                              <p>Reason: {log.details.reason}</p>
                            )}
                            {log.details.key && (
                              <p>Setting: {log.details.key} = {String(log.details.value)}</p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/providers/toast-provider';
import {
  suspendUser,
  banUser,
  unbanUser,
  grantProSubscription,
  revokeProSubscription,
  getUserModerationHistory,
  getUserModerationStatus,
} from '@/features/admin/actions/user-actions';

type Profile = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  subscription_status: string;
  trade: string;
  sub_trade: string | null;
  location: string;
  created_at: string;
  phone: string | null;
  is_admin: boolean;
  can_post_jobs: boolean;
};

type ModerationAction = {
  id: string;
  action_type: string;
  reason: string;
  duration_days: number | null;
  expires_at: string | null;
  created_at: string;
  actioned_by_profile: { name: string } | null;
};

export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [moderationHistory, setModerationHistory] = useState<ModerationAction[]>([]);
  const [moderationStatus, setModerationStatus] = useState<{
    isBanned: boolean;
    isSuspended: boolean;
    suspensionExpiresAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);

  // Moderation action form states
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showGrantProDialog, setShowGrantProDialog] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState(7);
  const [banReason, setBanReason] = useState('');
  const [proReason, setProReason] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, subscriptionFilter]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserDetails(selectedUser.user_id);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const [historyResult, statusResult] = await Promise.all([
        getUserModerationHistory(userId),
        getUserModerationStatus(userId),
      ]);

      if (historyResult.success) {
        setModerationHistory(historyResult.data || []);
      }

      setModerationStatus(statusResult);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Subscription filter
    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(
        (user) => user.subscription_status === subscriptionFilter
      );
    }

    setFilteredUsers(filtered);
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;

    if (!suspendReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }

    setActionLoading(true);
    try {
      const result = await suspendUser(
        selectedUser.user_id,
        suspendReason,
        suspendDuration
      );

      if (result.success) {
        toast.success(`User suspended for ${suspendDuration} days`);
        setShowSuspendDialog(false);
        setSuspendReason('');
        setSuspendDuration(7);
        fetchUserDetails(selectedUser.user_id);
      } else {
        toast.error(result.error || 'Failed to suspend user');
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    if (!banReason.trim()) {
      toast.error('Please provide a reason for ban');
      return;
    }

    setActionLoading(true);
    try {
      const result = await banUser(selectedUser.user_id, banReason);

      if (result.success) {
        toast.success('User permanently banned');
        setShowBanDialog(false);
        setBanReason('');
        fetchUserDetails(selectedUser.user_id);
      } else {
        toast.error(result.error || 'Failed to ban user');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;

    if (!confirm('Are you sure you want to unban this user?')) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await unbanUser(selectedUser.user_id);

      if (result.success) {
        toast.success('User unbanned');
        fetchUserDetails(selectedUser.user_id);
      } else {
        toast.error(result.error || 'Failed to unban user');
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGrantPro = async () => {
    if (!selectedUser) return;

    if (!proReason.trim()) {
      toast.error('Please provide a reason for granting Pro');
      return;
    }

    setActionLoading(true);
    try {
      const result = await grantProSubscription(selectedUser.user_id, proReason);

      if (result.success) {
        toast.success('Pro subscription granted');
        setShowGrantProDialog(false);
        setProReason('');
        fetchUsers();
        fetchUserDetails(selectedUser.user_id);
      } else {
        toast.error(result.error || 'Failed to grant Pro subscription');
      }
    } catch (error) {
      console.error('Error granting Pro:', error);
      toast.error('Failed to grant Pro subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokePro = async () => {
    if (!selectedUser) return;

    const reason = prompt('Please provide a reason for revoking Pro subscription:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const result = await revokeProSubscription(selectedUser.user_id, reason);

      if (result.success) {
        toast.success('Pro subscription revoked');
        fetchUsers();
        fetchUserDetails(selectedUser.user_id);
      } else {
        toast.error(result.error || 'Failed to revoke Pro subscription');
      }
    } catch (error) {
      console.error('Error revoking Pro:', error);
      toast.error('Failed to revoke Pro subscription');
    } finally {
      setActionLoading(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">
          Search, view, and moderate user accounts
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="worker">Workers</option>
              <option value="employer">Employers</option>
            </select>
            <select
              value={subscriptionFilter}
              onChange={(e) => setSubscriptionFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent"
            >
              <option value="all">All Subscriptions</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <EmptyState
                  icon="👥"
                  title="No users found"
                  description="Try adjusting your search or filters"
                />
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedUser?.user_id === user.user_id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {user.name}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {user.email}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge
                              variant={
                                user.role === 'employer' ? 'warning' : 'default'
                              }
                            >
                              {user.role}
                            </Badge>
                            {user.subscription_status === 'pro' && (
                              <Badge variant="success">Pro</Badge>
                            )}
                            {user.is_admin && (
                              <Badge variant="danger">Admin</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Detail Panel */}
        <div className="lg:col-span-2">
          {!selectedUser ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon="👤"
                  title="No user selected"
                  description="Select a user from the list to view details"
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* User Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedUser.name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedUser.email}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {moderationStatus?.isBanned && (
                        <Badge variant="danger">BANNED</Badge>
                      )}
                      {moderationStatus?.isSuspended && (
                        <Badge variant="warning">SUSPENDED</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Role</p>
                      <p className="font-semibold capitalize">
                        {selectedUser.role}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Subscription</p>
                      <p className="font-semibold capitalize">
                        {selectedUser.subscription_status}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Trade</p>
                      <p className="font-semibold">{selectedUser.trade}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-semibold">{selectedUser.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold">
                        {selectedUser.phone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Joined</p>
                      <p className="font-semibold">
                        {new Date(selectedUser.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Can Post Jobs</p>
                      <p className="font-semibold">
                        {selectedUser.can_post_jobs ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Admin</p>
                      <p className="font-semibold">
                        {selectedUser.is_admin ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Moderation Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Moderation Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {!moderationStatus?.isBanned && (
                      <React.Fragment key="moderation-actions">
                        <Button
                          variant="secondary"
                          onClick={() => setShowSuspendDialog(true)}
                          disabled={actionLoading || moderationStatus?.isSuspended}
                        >
                          Suspend User
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => setShowBanDialog(true)}
                          disabled={actionLoading}
                        >
                          Ban User
                        </Button>
                      </React.Fragment>
                    )}
                    {moderationStatus?.isBanned && (
                      <Button
                        key="unban-action"
                        variant="primary"
                        onClick={handleUnbanUser}
                        disabled={actionLoading}
                        className="col-span-2"
                      >
                        Unban User
                      </Button>
                    )}
                    {selectedUser.subscription_status === 'free' ? (
                      <Button
                        key="grant-pro-action"
                        variant="primary"
                        onClick={() => setShowGrantProDialog(true)}
                        disabled={actionLoading}
                        className="col-span-2"
                      >
                        Grant Pro Subscription
                      </Button>
                    ) : (
                      <Button
                        key="revoke-pro-action"
                        variant="secondary"
                        onClick={handleRevokePro}
                        disabled={actionLoading}
                        className="col-span-2"
                      >
                        Revoke Pro Subscription
                      </Button>
                    )}
                  </div>

                  {/* Suspend Dialog */}
                  {showSuspendDialog && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-semibold mb-2">Suspend User</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Duration (days)
                          </label>
                          <Input
                            type="number"
                            value={suspendDuration}
                            onChange={(e) =>
                              setSuspendDuration(parseInt(e.target.value))
                            }
                            min={1}
                            max={365}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Reason
                          </label>
                          <Input
                            type="text"
                            value={suspendReason}
                            onChange={(e) => setSuspendReason(e.target.value)}
                            placeholder="Enter reason for suspension..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            onClick={handleSuspendUser}
                            disabled={actionLoading}
                          >
                            Confirm Suspension
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowSuspendDialog(false);
                              setSuspendReason('');
                            }}
                            disabled={actionLoading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ban Dialog */}
                  {showBanDialog && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <h4 className="font-semibold mb-2 text-red-900">
                        Permanently Ban User
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Reason
                          </label>
                          <Input
                            type="text"
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="Enter reason for ban..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="danger"
                            onClick={handleBanUser}
                            disabled={actionLoading}
                          >
                            Confirm Ban
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowBanDialog(false);
                              setBanReason('');
                            }}
                            disabled={actionLoading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Grant Pro Dialog */}
                  {showGrantProDialog && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold mb-2">
                        Grant Pro Subscription
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Reason
                          </label>
                          <Input
                            type="text"
                            value={proReason}
                            onChange={(e) => setProReason(e.target.value)}
                            placeholder="Enter reason for granting Pro..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            onClick={handleGrantPro}
                            disabled={actionLoading}
                          >
                            Confirm Grant
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowGrantProDialog(false);
                              setProReason('');
                            }}
                            disabled={actionLoading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Moderation History */}
              <Card>
                <CardHeader>
                  <CardTitle>Moderation History</CardTitle>
                </CardHeader>
                <CardContent>
                  {moderationHistory.length === 0 ? (
                    <EmptyState
                      icon="📋"
                      title="No moderation history"
                      description="This user has not been moderated"
                    />
                  ) : (
                    <div className="space-y-3">
                      {moderationHistory.map((action) => (
                        <div
                          key={action.id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    action.action_type === 'ban'
                                      ? 'danger'
                                      : action.action_type === 'suspension'
                                      ? 'warning'
                                      : 'success'
                                  }
                                >
                                  {action.action_type}
                                </Badge>
                                <p className="text-sm text-gray-600">
                                  {new Date(action.created_at).toLocaleString()}
                                </p>
                              </div>
                              <p className="text-sm mt-1">{action.reason}</p>
                              {action.duration_days && (
                                <p className="text-sm text-gray-600 mt-1">
                                  Duration: {action.duration_days} days
                                </p>
                              )}
                              {action.expires_at && (
                                <p className="text-sm text-gray-600">
                                  Expires:{' '}
                                  {new Date(action.expires_at).toLocaleString()}
                                </p>
                              )}
                              {action.actioned_by_profile && (
                                <p className="text-sm text-gray-600">
                                  By: {action.actioned_by_profile.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

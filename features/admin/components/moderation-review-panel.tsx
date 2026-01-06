'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Textarea,
  Badge,
  Input,
} from '@/components/ui';
import {
  removeContent,
  warnUser,
  suspendUserFromReport,
  banUserFromReport,
  dismissReport,
  getReportedContent,
} from '../actions/moderation-actions';
import { useRouter } from 'next/navigation';
import { getFullName } from '@/lib/utils';

type ContentReport = {
  id: string;
  reporter_id: string;
  reported_content_type: string;
  reported_content_id: string;
  reported_user_id: string;
  reason: string;
  description: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  action_taken: string | null;
  admin_notes: string | null;
  created_at: string;
  reporter: {
    first_name: string;
    last_name: string;
    email: string;
  };
  reported_user: {
    first_name: string;
    last_name: string;
    email: string;
    user_id: string;
  };
  reviewed_by_profile?: {
    first_name: string;
    last_name: string;
  };
};

type Props = {
  report: ContentReport;
  onClose: () => void;
};

export function ModerationReviewPanel({ report, onClose }: Props) {
  const router = useRouter();
  const [reportedContent, setReportedContent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState(report.admin_notes || '');
  const [showActionForm, setShowActionForm] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [suspensionDays, setSuspensionDays] = useState(7);

  useEffect(() => {
    async function fetchContent() {
      setIsLoading(true);
      const result = await getReportedContent(
        report.reported_content_type,
        report.reported_content_id
      );
      if (result.success) {
        setReportedContent(result.data);
      }
      setIsLoading(false);
    }
    fetchContent();
  }, [report.reported_content_type, report.reported_content_id]);

  const handleRemoveContent = async () => {
    if (!adminNotes.trim()) {
      alert('Please provide admin notes');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to remove this ${report.reported_content_type}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const result = await removeContent(
        report.id,
        report.reported_content_type,
        report.reported_content_id,
        adminNotes
      );
      if (result.success) {
        alert('Content removed successfully');
        router.refresh();
        onClose();
      } else {
        alert('Failed to remove content: ' + result.error);
      }
    } catch (error) {
      console.error('Error removing content:', error);
      alert('An error occurred while removing content');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleWarnUser = async () => {
    if (!actionReason.trim()) {
      alert('Please provide a warning reason');
      return;
    }
    if (!adminNotes.trim()) {
      alert('Please provide admin notes');
      return;
    }

    if (!confirm('Are you sure you want to warn this user?')) {
      return;
    }

    setIsActionLoading(true);
    try {
      const result = await warnUser(
        report.id,
        report.reported_user.user_id,
        actionReason,
        adminNotes
      );
      if (result.success) {
        alert('User warned successfully');
        router.refresh();
        onClose();
      } else {
        alert('Failed to warn user: ' + result.error);
      }
    } catch (error) {
      console.error('Error warning user:', error);
      alert('An error occurred while warning user');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!actionReason.trim()) {
      alert('Please provide a suspension reason');
      return;
    }
    if (!adminNotes.trim()) {
      alert('Please provide admin notes');
      return;
    }
    if (suspensionDays <= 0) {
      alert('Duration must be greater than 0');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to suspend this user for ${suspensionDays} days?`
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const result = await suspendUserFromReport(
        report.id,
        report.reported_user.user_id,
        actionReason,
        suspensionDays,
        adminNotes
      );
      if (result.success) {
        alert('User suspended successfully');
        router.refresh();
        onClose();
      } else {
        alert('Failed to suspend user: ' + result.error);
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('An error occurred while suspending user');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!actionReason.trim()) {
      alert('Please provide a ban reason');
      return;
    }
    if (!adminNotes.trim()) {
      alert('Please provide admin notes');
      return;
    }

    if (
      !confirm(
        'Are you sure you want to PERMANENTLY BAN this user? This is a severe action.'
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const result = await banUserFromReport(
        report.id,
        report.reported_user.user_id,
        actionReason,
        adminNotes
      );
      if (result.success) {
        alert('User banned successfully');
        router.refresh();
        onClose();
      } else {
        alert('Failed to ban user: ' + result.error);
      }
    } catch (error) {
      console.error('Error banning user:', error);
      alert('An error occurred while banning user');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!adminNotes.trim()) {
      alert('Please provide admin notes explaining why this report is dismissed');
      return;
    }

    if (!confirm('Are you sure you want to dismiss this report?')) {
      return;
    }

    setIsActionLoading(true);
    try {
      const result = await dismissReport(report.id, adminNotes);
      if (result.success) {
        alert('Report dismissed');
        router.refresh();
        onClose();
      } else {
        alert('Failed to dismiss report: ' + result.error);
      }
    } catch (error) {
      console.error('Error dismissing report:', error);
      alert('An error occurred while dismissing report');
    } finally {
      setIsActionLoading(false);
    }
  };

  const isPending = report.status === 'pending';

  const renderReportedContent = () => {
    if (isLoading) {
      return <div className="py-4 text-center text-gray-500">Loading content...</div>;
    }

    if (!reportedContent) {
      return (
        <div className="py-4 text-center text-red-600">
          Content not found (may have been deleted)
        </div>
      );
    }

    switch (report.reported_content_type) {
      case 'job':
        return (
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Job Title:</span>
              <p className="text-gray-900">{reportedContent.title}</p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Description:</span>
              <p className="text-gray-900 whitespace-pre-wrap">
                {reportedContent.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Trade:</span>
                <p className="text-gray-900">{reportedContent.trade}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Location:</span>
                <p className="text-gray-900">{reportedContent.location}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Pay Rate:</span>
                {reportedContent.subtrade_pay_rates && Object.keys(reportedContent.subtrade_pay_rates).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(reportedContent.subtrade_pay_rates).map(([subtrade, rate]) => (
                      <div key={subtrade} className="text-sm text-gray-900">
                        <span className="font-semibold">{subtrade}:</span> {String(rate)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-900">{reportedContent.pay_rate}</p>
                )}
              </div>
              <div>
                <span className="font-medium text-gray-700">Posted:</span>
                <p className="text-gray-900">
                  {new Date(reportedContent.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            {reportedContent.employer && (
              <div>
                <span className="font-medium text-gray-700">Employer:</span>
                <p className="text-gray-900">
                  {getFullName(reportedContent.employer)} ({reportedContent.employer.email})
                </p>
              </div>
            )}
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">Name:</span>
                <p className="text-gray-900">{getFullName(reportedContent)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <p className="text-gray-900">{reportedContent.email}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Role:</span>
                <p className="text-gray-900">{reportedContent.role}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Trade:</span>
                <p className="text-gray-900">{reportedContent.trade}</p>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Bio:</span>
              <p className="text-gray-900 whitespace-pre-wrap">
                {reportedContent.bio}
              </p>
            </div>
            <div>
              <span className="font-medium text-gray-700">Location:</span>
              <p className="text-gray-900">{reportedContent.location}</p>
            </div>
          </div>
        );

      case 'message':
        return (
          <div className="space-y-3">
            <div>
              <span className="font-medium text-gray-700">Message Content:</span>
              <div className="mt-2 p-4 bg-gray-50 rounded">
                <p className="text-gray-900 whitespace-pre-wrap">
                  {reportedContent.content}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-700">From:</span>
                <p className="text-gray-900">
                  {reportedContent.sender ? getFullName(reportedContent.sender) : 'Unknown'} ({reportedContent.sender?.email})
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">To:</span>
                <p className="text-gray-900">
                  {reportedContent.recipient ? getFullName(reportedContent.recipient) : 'Unknown'} (
                  {reportedContent.recipient?.email})
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Sent:</span>
                <p className="text-gray-900">
                  {new Date(reportedContent.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="text-gray-500">Unknown content type</div>;
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Content Report Review</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="warning">{report.reason}</Badge>
              <Badge variant="info">
                {report.reported_content_type.charAt(0).toUpperCase() +
                  report.reported_content_type.slice(1)}
              </Badge>
              <Badge
                variant={
                  report.status === 'pending'
                    ? 'warning'
                    : report.status === 'actioned'
                    ? 'success'
                    : 'default'
                }
              >
                {report.status}
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Report Details */}
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Report Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Reporter:</span>
                <p className="text-gray-900">
                  {getFullName(report.reporter)}
                  <br />
                  <span className="text-xs text-gray-600">
                    {report.reporter.email}
                  </span>
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Reported User:</span>
                <p className="text-gray-900">
                  {getFullName(report.reported_user)}
                  <br />
                  <span className="text-xs text-gray-600">
                    {report.reported_user.email}
                  </span>
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Reported:</span>
                <p className="text-gray-900">
                  {new Date(report.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Reason:</span>
                <p className="text-gray-900">{report.reason}</p>
              </div>
            </div>
            {report.description && (
              <div className="mt-3">
                <span className="font-medium text-gray-700">Description:</span>
                <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded">
                  {report.description}
                </p>
              </div>
            )}
          </div>

          {/* Reported Content */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Reported Content</h3>
            <div className="p-4 bg-gray-50 rounded">{renderReportedContent()}</div>
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">
              Admin Notes *
            </label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Enter notes about your decision..."
              rows={3}
              disabled={!isPending}
            />
          </div>

          {/* Action Forms */}
          {isPending && (
            <div className="space-y-4">
              {/* Warn User Form */}
              {showActionForm === 'warn' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded space-y-3">
                  <h4 className="font-semibold text-gray-900">Warn User</h4>
                  <Input
                    type="text"
                    placeholder="Warning reason (e.g., First violation of community guidelines)"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleWarnUser}
                      disabled={isActionLoading}
                      variant="secondary"
                    >
                      {isActionLoading ? 'Processing...' : 'Confirm Warning'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowActionForm(null);
                        setActionReason('');
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Suspend User Form */}
              {showActionForm === 'suspend' && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded space-y-3">
                  <h4 className="font-semibold text-gray-900">Suspend User</h4>
                  <Input
                    type="text"
                    placeholder="Suspension reason"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (days)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={suspensionDays}
                      onChange={(e) => setSuspensionDays(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSuspendUser}
                      disabled={isActionLoading}
                      variant="secondary"
                    >
                      {isActionLoading
                        ? 'Processing...'
                        : `Suspend for ${suspensionDays} days`}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowActionForm(null);
                        setActionReason('');
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Ban User Form */}
              {showActionForm === 'ban' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded space-y-3">
                  <h4 className="font-semibold text-gray-900">
                    Permanently Ban User
                  </h4>
                  <p className="text-sm text-red-700">
                    This is a permanent action and should only be used for severe
                    violations.
                  </p>
                  <Input
                    type="text"
                    placeholder="Ban reason (required)"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBanUser}
                      disabled={isActionLoading}
                      variant="danger"
                    >
                      {isActionLoading ? 'Processing...' : 'Confirm Permanent Ban'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowActionForm(null);
                        setActionReason('');
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {isPending && !showActionForm && (
            <div className="pt-4 border-t space-y-3">
              <h3 className="font-semibold text-gray-900">Moderation Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {report.reported_content_type !== 'profile' && (
                  <Button
                    onClick={handleRemoveContent}
                    disabled={isActionLoading}
                    variant="danger"
                  >
                    Remove Content
                  </Button>
                )}
                <Button
                  onClick={() => setShowActionForm('warn')}
                  disabled={isActionLoading}
                  variant="secondary"
                >
                  Warn User
                </Button>
                <Button
                  onClick={() => setShowActionForm('suspend')}
                  disabled={isActionLoading}
                  variant="secondary"
                >
                  Suspend User
                </Button>
                <Button
                  onClick={() => setShowActionForm('ban')}
                  disabled={isActionLoading}
                  variant="danger"
                >
                  Ban User
                </Button>
                <Button
                  onClick={handleDismiss}
                  disabled={isActionLoading}
                  variant="outline"
                  className="col-span-2"
                >
                  Dismiss Report
                </Button>
              </div>
            </div>
          )}

          {/* Already Actioned */}
          {!isPending && report.action_taken && (
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-semibold text-gray-900 mb-2">
                Action Already Taken
              </h3>
              <p className="text-gray-700">
                <span className="font-medium">Action:</span>{' '}
                {report.action_taken.replace(/_/g, ' ')}
              </p>
              {report.reviewed_by_profile && (
                <p className="text-gray-700 mt-1">
                  <span className="font-medium">Reviewed by:</span>{' '}
                  {getFullName(report.reviewed_by_profile)} on{' '}
                  {new Date(report.reviewed_at!).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Notification Service - Pure business logic for notifications.
 *
 * This module contains testable pure functions for notification validation
 * and data transformation. No Server Action dependencies.
 */

// ============================================================================
// Types
// ============================================================================

export type NotificationType = 'proximity_alert' | 'application_status' | 'new_message' | 'profile_view';

export type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
  field?: string;
};

export type NotificationGroup = {
  date: string;
  notifications: Notification[];
};

// ============================================================================
// Constants
// ============================================================================

export const NOTIFICATION_TYPES: NotificationType[] = [
  'proximity_alert',
  'application_status',
  'new_message',
  'profile_view',
];

export const MAX_TITLE_LENGTH = 200;
export const MAX_MESSAGE_LENGTH = 1000;

// Notification type display names
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  proximity_alert: 'Job Alert',
  application_status: 'Application Update',
  new_message: 'New Message',
  profile_view: 'Profile View',
};

// Notification type icons (for UI reference)
export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  proximity_alert: 'MapPin',
  application_status: 'Briefcase',
  new_message: 'MessageSquare',
  profile_view: 'Eye',
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates notification input.
 * @param input - Notification input data
 * @returns ValidationResult
 */
export function validateNotificationInput(input: NotificationInput): ValidationResult {
  // User ID validation
  if (!input.userId || typeof input.userId !== 'string') {
    return { valid: false, error: 'User ID is required', field: 'userId' };
  }

  if (input.userId.trim().length === 0) {
    return { valid: false, error: 'User ID cannot be empty', field: 'userId' };
  }

  // Type validation
  const typeResult = validateNotificationType(input.type);
  if (!typeResult.valid) return typeResult;

  // Title validation
  const titleResult = validateNotificationTitle(input.title);
  if (!titleResult.valid) return titleResult;

  // Message validation
  const messageResult = validateNotificationMessage(input.message);
  if (!messageResult.valid) return messageResult;

  return { valid: true };
}

/**
 * Validates notification type.
 * @param type - The notification type
 * @returns ValidationResult
 */
export function validateNotificationType(type: string | undefined): ValidationResult {
  if (!type) {
    return { valid: false, error: 'Notification type is required', field: 'type' };
  }

  if (!NOTIFICATION_TYPES.includes(type as NotificationType)) {
    return {
      valid: false,
      error: `Invalid notification type: ${type}. Must be one of: ${NOTIFICATION_TYPES.join(', ')}`,
      field: 'type',
    };
  }

  return { valid: true };
}

/**
 * Validates notification title.
 * @param title - The notification title
 * @returns ValidationResult
 */
export function validateNotificationTitle(title: string | undefined): ValidationResult {
  if (!title || typeof title !== 'string') {
    return { valid: false, error: 'Title is required', field: 'title' };
  }

  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Title cannot be empty', field: 'title' };
  }

  if (trimmed.length > MAX_TITLE_LENGTH) {
    return {
      valid: false,
      error: `Title must be less than ${MAX_TITLE_LENGTH} characters`,
      field: 'title',
    };
  }

  return { valid: true };
}

/**
 * Validates notification message.
 * @param message - The notification message
 * @returns ValidationResult
 */
export function validateNotificationMessage(message: string | undefined): ValidationResult {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required', field: 'message' };
  }

  const trimmed = message.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty', field: 'message' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message must be less than ${MAX_MESSAGE_LENGTH} characters`,
      field: 'message',
    };
  }

  return { valid: true };
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Builds a notification record for database insertion.
 * @param input - Notification input
 * @returns Notification record
 */
export function buildNotificationRecord(input: NotificationInput): {
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
} {
  return {
    user_id: input.userId,
    type: input.type,
    title: input.title.trim(),
    message: input.message.trim(),
    data: input.data || null,
  };
}

/**
 * Groups notifications by date.
 * @param notifications - Array of notifications
 * @returns Array of grouped notifications
 */
export function groupNotificationsByDate(notifications: Notification[]): NotificationGroup[] {
  const groups = new Map<string, Notification[]>();

  for (const notification of notifications) {
    const date = new Date(notification.created_at);
    const dateKey = formatDateKey(date);

    const existing = groups.get(dateKey) || [];
    existing.push(notification);
    groups.set(dateKey, existing);
  }

  // Convert to array and sort by date (most recent first)
  const result: NotificationGroup[] = [];
  for (const [date, notifs] of groups.entries()) {
    result.push({ date, notifications: notifs });
  }

  return result.sort((a, b) => {
    // Parse dates for comparison
    const dateA = parseDateKey(a.date);
    const dateB = parseDateKey(b.date);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Formats a date into a readable date key.
 * @param date - The date to format
 * @returns Formatted date string (e.g., "Today", "Yesterday", "January 15, 2025")
 */
export function formatDateKey(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (inputDate.getTime() === today.getTime()) {
    return 'Today';
  }

  if (inputDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Parses a date key back to a Date object.
 * @param dateKey - The date key string
 * @returns Date object
 */
export function parseDateKey(dateKey: string): Date {
  const now = new Date();

  if (dateKey === 'Today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (dateKey === 'Yesterday') {
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  return new Date(dateKey);
}

// ============================================================================
// Notification Utilities
// ============================================================================

/**
 * Checks if a notification is unread.
 * @param notification - The notification to check
 * @returns true if unread
 */
export function isNotificationUnread(notification: Notification): boolean {
  return notification.read_at === null;
}

/**
 * Counts unread notifications.
 * @param notifications - Array of notifications
 * @returns Number of unread notifications
 */
export function countUnreadNotifications(notifications: Notification[]): number {
  return notifications.filter(isNotificationUnread).length;
}

/**
 * Filters notifications by type.
 * @param notifications - Array of notifications
 * @param type - Type to filter by
 * @returns Filtered notifications
 */
export function filterNotificationsByType(
  notifications: Notification[],
  type: NotificationType
): Notification[] {
  return notifications.filter((n) => n.type === type);
}

/**
 * Gets the display label for a notification type.
 * @param type - Notification type
 * @returns Display label
 */
export function getNotificationTypeLabel(type: NotificationType): string {
  return NOTIFICATION_TYPE_LABELS[type] || type;
}

/**
 * Gets the icon name for a notification type.
 * @param type - Notification type
 * @returns Icon name
 */
export function getNotificationTypeIcon(type: NotificationType): string {
  return NOTIFICATION_TYPE_ICONS[type] || 'Bell';
}

/**
 * Formats a notification message for display based on type.
 * @param type - Notification type
 * @param data - Notification data payload
 * @returns Formatted message
 */
export function formatNotificationDisplayMessage(
  type: NotificationType,
  data?: Record<string, unknown> | null
): string {
  if (!data) return '';

  switch (type) {
    case 'proximity_alert': {
      const jobTitle = data.job_title as string;
      const distance = data.distance as number;
      if (jobTitle && distance !== undefined) {
        return `New ${jobTitle} job posted ${distance.toFixed(1)}km away`;
      }
      return jobTitle ? `New ${jobTitle} job posted nearby` : 'New job posted nearby';
    }

    case 'application_status': {
      const status = data.status as string;
      const jobTitle = data.job_title as string;
      if (status && jobTitle) {
        return `Your application for "${jobTitle}" has been ${status}`;
      }
      return status ? `Application status: ${status}` : 'Application status updated';
    }

    case 'new_message': {
      const senderName = data.sender_name as string;
      return senderName ? `New message from ${senderName}` : 'You have a new message';
    }

    case 'profile_view': {
      const viewerName = data.viewer_name as string;
      return viewerName ? `${viewerName} viewed your profile` : 'Someone viewed your profile';
    }

    default:
      return '';
  }
}

/**
 * Sorts notifications by creation date (most recent first).
 * @param notifications - Array of notifications
 * @returns Sorted notifications
 */
export function sortNotificationsByDate(notifications: Notification[]): Notification[] {
  return [...notifications].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateB - dateA;
  });
}

/**
 * Gets the relative time string for a notification.
 * @param timestamp - ISO timestamp string
 * @returns Relative time string (e.g., "2 min ago", "1h ago")
 */
export function formatNotificationTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Creates notification data for a proximity alert.
 * @param jobId - Job ID
 * @param jobTitle - Job title
 * @param distance - Distance in km
 * @param trade - Job trade
 * @returns Notification data object
 */
export function createProximityAlertData(
  jobId: string,
  jobTitle: string,
  distance: number,
  trade?: string
): Record<string, unknown> {
  return {
    job_id: jobId,
    job_title: jobTitle,
    distance,
    trade: trade || null,
  };
}

/**
 * Creates notification data for an application status update.
 * @param applicationId - Application ID
 * @param jobId - Job ID
 * @param jobTitle - Job title
 * @param status - New status
 * @returns Notification data object
 */
export function createApplicationStatusData(
  applicationId: string,
  jobId: string,
  jobTitle: string,
  status: string
): Record<string, unknown> {
  return {
    application_id: applicationId,
    job_id: jobId,
    job_title: jobTitle,
    status,
  };
}

/**
 * Creates notification data for a new message.
 * @param conversationId - Conversation ID
 * @param senderId - Sender's user ID
 * @param senderName - Sender's name
 * @returns Notification data object
 */
export function createNewMessageData(
  conversationId: string,
  senderId: string,
  senderName: string
): Record<string, unknown> {
  return {
    conversation_id: conversationId,
    sender_id: senderId,
    sender_name: senderName,
  };
}

/**
 * Creates notification data for a profile view.
 * @param viewerId - Viewer's user ID
 * @param viewerName - Viewer's name (optional for anonymous)
 * @returns Notification data object
 */
export function createProfileViewData(
  viewerId: string,
  viewerName?: string
): Record<string, unknown> {
  return {
    viewer_id: viewerId,
    viewer_name: viewerName || null,
  };
}

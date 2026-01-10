import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateNotificationInput,
  validateNotificationType,
  validateNotificationTitle,
  validateNotificationMessage,
  buildNotificationRecord,
  groupNotificationsByDate,
  formatDateKey,
  parseDateKey,
  isNotificationUnread,
  countUnreadNotifications,
  filterNotificationsByType,
  getNotificationTypeLabel,
  getNotificationTypeIcon,
  formatNotificationDisplayMessage,
  sortNotificationsByDate,
  formatNotificationTimestamp,
  createProximityAlertData,
  createApplicationStatusData,
  createNewMessageData,
  createProfileViewData,
  MAX_TITLE_LENGTH,
  MAX_MESSAGE_LENGTH,
  NOTIFICATION_TYPES,
  type NotificationInput,
  type Notification,
} from './notification-service';

// ============================================================================
// Test Data Helpers
// ============================================================================

function createTestNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-123',
    user_id: 'user-456',
    type: 'proximity_alert',
    title: 'New Job Alert',
    message: 'A new electrician job was posted near you',
    data: null,
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// validateNotificationInput Tests
// ============================================================================

describe('validateNotificationInput', () => {
  it('should return valid for valid input', () => {
    const input: NotificationInput = {
      userId: 'user-123',
      type: 'proximity_alert',
      title: 'New Job Alert',
      message: 'A new job was posted near you',
    };
    const result = validateNotificationInput(input);
    expect(result.valid).toBe(true);
  });

  it('should return valid for input with data', () => {
    const input: NotificationInput = {
      userId: 'user-123',
      type: 'application_status',
      title: 'Application Update',
      message: 'Your application status changed',
      data: { job_id: 'job-456', status: 'viewed' },
    };
    const result = validateNotificationInput(input);
    expect(result.valid).toBe(true);
  });

  it('should reject missing userId', () => {
    const input = {
      type: 'proximity_alert',
      title: 'Test',
      message: 'Test message',
    } as NotificationInput;
    const result = validateNotificationInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('userId');
  });

  it('should reject empty userId', () => {
    const input: NotificationInput = {
      userId: '   ',
      type: 'proximity_alert',
      title: 'Test',
      message: 'Test message',
    };
    const result = validateNotificationInput(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should reject invalid type', () => {
    const input: NotificationInput = {
      userId: 'user-123',
      type: 'invalid_type' as any,
      title: 'Test',
      message: 'Test message',
    };
    const result = validateNotificationInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('type');
  });

  it('should reject empty title', () => {
    const input: NotificationInput = {
      userId: 'user-123',
      type: 'proximity_alert',
      title: '',
      message: 'Test message',
    };
    const result = validateNotificationInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('title');
  });

  it('should reject empty message', () => {
    const input: NotificationInput = {
      userId: 'user-123',
      type: 'proximity_alert',
      title: 'Test Title',
      message: '',
    };
    const result = validateNotificationInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('message');
  });
});

// ============================================================================
// validateNotificationType Tests
// ============================================================================

describe('validateNotificationType', () => {
  it('should accept all valid notification types', () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(validateNotificationType(type).valid).toBe(true);
    }
  });

  it('should reject undefined type', () => {
    const result = validateNotificationType(undefined);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should reject invalid type', () => {
    const result = validateNotificationType('invalid');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid notification type');
  });
});

// ============================================================================
// validateNotificationTitle Tests
// ============================================================================

describe('validateNotificationTitle', () => {
  it('should accept valid title', () => {
    expect(validateNotificationTitle('New Job Alert').valid).toBe(true);
  });

  it('should reject undefined title', () => {
    const result = validateNotificationTitle(undefined);
    expect(result.valid).toBe(false);
  });

  it('should reject empty title', () => {
    const result = validateNotificationTitle('');
    expect(result.valid).toBe(false);
  });

  it('should reject whitespace-only title', () => {
    const result = validateNotificationTitle('   ');
    expect(result.valid).toBe(false);
  });

  it('should reject title that is too long', () => {
    const result = validateNotificationTitle('A'.repeat(MAX_TITLE_LENGTH + 1));
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_TITLE_LENGTH}`);
  });

  it('should accept title at max length', () => {
    const result = validateNotificationTitle('A'.repeat(MAX_TITLE_LENGTH));
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// validateNotificationMessage Tests
// ============================================================================

describe('validateNotificationMessage', () => {
  it('should accept valid message', () => {
    expect(validateNotificationMessage('A new job was posted near you').valid).toBe(true);
  });

  it('should reject undefined message', () => {
    const result = validateNotificationMessage(undefined);
    expect(result.valid).toBe(false);
  });

  it('should reject empty message', () => {
    const result = validateNotificationMessage('');
    expect(result.valid).toBe(false);
  });

  it('should reject message that is too long', () => {
    const result = validateNotificationMessage('A'.repeat(MAX_MESSAGE_LENGTH + 1));
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_MESSAGE_LENGTH}`);
  });

  it('should accept message at max length', () => {
    const result = validateNotificationMessage('A'.repeat(MAX_MESSAGE_LENGTH));
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// buildNotificationRecord Tests
// ============================================================================

describe('buildNotificationRecord', () => {
  it('should build complete record', () => {
    const input: NotificationInput = {
      userId: 'user-123',
      type: 'proximity_alert',
      title: '  New Job Alert  ',
      message: '  A new job was posted  ',
      data: { job_id: 'job-456' },
    };
    const record = buildNotificationRecord(input);

    expect(record.user_id).toBe('user-123');
    expect(record.type).toBe('proximity_alert');
    expect(record.title).toBe('New Job Alert');
    expect(record.message).toBe('A new job was posted');
    expect(record.data).toEqual({ job_id: 'job-456' });
  });

  it('should handle missing data', () => {
    const input: NotificationInput = {
      userId: 'user-123',
      type: 'new_message',
      title: 'New Message',
      message: 'You have a new message',
    };
    const record = buildNotificationRecord(input);
    expect(record.data).toBeNull();
  });
});

// ============================================================================
// groupNotificationsByDate Tests
// ============================================================================

describe('groupNotificationsByDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should group notifications by date', () => {
    const notifications: Notification[] = [
      createTestNotification({ id: '1', created_at: '2025-01-10T10:00:00Z' }),
      createTestNotification({ id: '2', created_at: '2025-01-10T11:00:00Z' }),
      createTestNotification({ id: '3', created_at: '2025-01-09T10:00:00Z' }),
    ];

    const groups = groupNotificationsByDate(notifications);

    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe('Today');
    expect(groups[0].notifications).toHaveLength(2);
    expect(groups[1].date).toBe('Yesterday');
    expect(groups[1].notifications).toHaveLength(1);
  });

  it('should return empty array for empty input', () => {
    const groups = groupNotificationsByDate([]);
    expect(groups).toHaveLength(0);
  });

  it('should handle older dates', () => {
    const notifications: Notification[] = [
      createTestNotification({ id: '1', created_at: '2025-01-05T10:00:00Z' }),
    ];

    const groups = groupNotificationsByDate(notifications);

    expect(groups).toHaveLength(1);
    expect(groups[0].date).toBe('January 5, 2025');
  });
});

// ============================================================================
// formatDateKey Tests
// ============================================================================

describe('formatDateKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "Today" for today', () => {
    const result = formatDateKey(new Date('2025-01-10T08:00:00Z'));
    expect(result).toBe('Today');
  });

  it('should return "Yesterday" for yesterday', () => {
    const result = formatDateKey(new Date('2025-01-09T08:00:00Z'));
    expect(result).toBe('Yesterday');
  });

  it('should return formatted date for older dates', () => {
    const result = formatDateKey(new Date('2025-01-05T08:00:00Z'));
    expect(result).toBe('January 5, 2025');
  });
});

// ============================================================================
// parseDateKey Tests
// ============================================================================

describe('parseDateKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should parse "Today"', () => {
    const result = parseDateKey('Today');
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(10);
  });

  it('should parse "Yesterday"', () => {
    const result = parseDateKey('Yesterday');
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(9);
  });

  it('should parse formatted date string', () => {
    const result = parseDateKey('January 5, 2025');
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(5);
  });
});

// ============================================================================
// Notification Utility Tests
// ============================================================================

describe('isNotificationUnread', () => {
  it('should return true for unread notification', () => {
    const notification = createTestNotification({ read_at: null });
    expect(isNotificationUnread(notification)).toBe(true);
  });

  it('should return false for read notification', () => {
    const notification = createTestNotification({ read_at: '2025-01-10T12:00:00Z' });
    expect(isNotificationUnread(notification)).toBe(false);
  });
});

describe('countUnreadNotifications', () => {
  it('should count unread notifications', () => {
    const notifications: Notification[] = [
      createTestNotification({ id: '1', read_at: null }),
      createTestNotification({ id: '2', read_at: '2025-01-10T12:00:00Z' }),
      createTestNotification({ id: '3', read_at: null }),
    ];
    expect(countUnreadNotifications(notifications)).toBe(2);
  });

  it('should return 0 for empty array', () => {
    expect(countUnreadNotifications([])).toBe(0);
  });

  it('should return 0 when all are read', () => {
    const notifications: Notification[] = [
      createTestNotification({ id: '1', read_at: '2025-01-10T12:00:00Z' }),
      createTestNotification({ id: '2', read_at: '2025-01-10T13:00:00Z' }),
    ];
    expect(countUnreadNotifications(notifications)).toBe(0);
  });
});

describe('filterNotificationsByType', () => {
  it('should filter by type', () => {
    const notifications: Notification[] = [
      createTestNotification({ id: '1', type: 'proximity_alert' }),
      createTestNotification({ id: '2', type: 'new_message' }),
      createTestNotification({ id: '3', type: 'proximity_alert' }),
    ];
    const filtered = filterNotificationsByType(notifications, 'proximity_alert');
    expect(filtered).toHaveLength(2);
    expect(filtered.every((n) => n.type === 'proximity_alert')).toBe(true);
  });

  it('should return empty array when no matches', () => {
    const notifications: Notification[] = [
      createTestNotification({ type: 'proximity_alert' }),
    ];
    const filtered = filterNotificationsByType(notifications, 'new_message');
    expect(filtered).toHaveLength(0);
  });
});

describe('getNotificationTypeLabel', () => {
  it('should return correct labels for all types', () => {
    expect(getNotificationTypeLabel('proximity_alert')).toBe('Job Alert');
    expect(getNotificationTypeLabel('application_status')).toBe('Application Update');
    expect(getNotificationTypeLabel('new_message')).toBe('New Message');
    expect(getNotificationTypeLabel('profile_view')).toBe('Profile View');
  });
});

describe('getNotificationTypeIcon', () => {
  it('should return correct icons for all types', () => {
    expect(getNotificationTypeIcon('proximity_alert')).toBe('MapPin');
    expect(getNotificationTypeIcon('application_status')).toBe('Briefcase');
    expect(getNotificationTypeIcon('new_message')).toBe('MessageSquare');
    expect(getNotificationTypeIcon('profile_view')).toBe('Eye');
  });
});

// ============================================================================
// formatNotificationDisplayMessage Tests
// ============================================================================

describe('formatNotificationDisplayMessage', () => {
  it('should format proximity alert with distance', () => {
    const result = formatNotificationDisplayMessage('proximity_alert', {
      job_title: 'Electrician',
      distance: 2.5,
    });
    expect(result).toContain('Electrician');
    expect(result).toContain('2.5km');
  });

  it('should format proximity alert without distance', () => {
    const result = formatNotificationDisplayMessage('proximity_alert', {
      job_title: 'Plumber',
    });
    expect(result).toContain('Plumber');
    expect(result).toContain('nearby');
  });

  it('should format application status', () => {
    const result = formatNotificationDisplayMessage('application_status', {
      status: 'viewed',
      job_title: 'Senior Developer',
    });
    expect(result).toContain('Senior Developer');
    expect(result).toContain('viewed');
  });

  it('should format new message', () => {
    const result = formatNotificationDisplayMessage('new_message', {
      sender_name: 'John Smith',
    });
    expect(result).toContain('John Smith');
  });

  it('should format profile view', () => {
    const result = formatNotificationDisplayMessage('profile_view', {
      viewer_name: 'ABC Company',
    });
    expect(result).toContain('ABC Company');
  });

  it('should return empty string for null data', () => {
    expect(formatNotificationDisplayMessage('proximity_alert', null)).toBe('');
  });
});

// ============================================================================
// sortNotificationsByDate Tests
// ============================================================================

describe('sortNotificationsByDate', () => {
  it('should sort notifications by date descending', () => {
    const notifications: Notification[] = [
      createTestNotification({ id: '1', created_at: '2025-01-08T10:00:00Z' }),
      createTestNotification({ id: '2', created_at: '2025-01-10T10:00:00Z' }),
      createTestNotification({ id: '3', created_at: '2025-01-09T10:00:00Z' }),
    ];
    const sorted = sortNotificationsByDate(notifications);
    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('1');
  });

  it('should not mutate original array', () => {
    const notifications: Notification[] = [
      createTestNotification({ id: '1', created_at: '2025-01-08T10:00:00Z' }),
      createTestNotification({ id: '2', created_at: '2025-01-10T10:00:00Z' }),
    ];
    const sorted = sortNotificationsByDate(notifications);
    expect(notifications[0].id).toBe('1');
    expect(sorted[0].id).toBe('2');
  });
});

// ============================================================================
// formatNotificationTimestamp Tests
// ============================================================================

describe('formatNotificationTimestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-10T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "Just now" for recent timestamps', () => {
    const result = formatNotificationTimestamp('2025-01-10T11:59:30Z');
    expect(result).toBe('Just now');
  });

  it('should return minutes for timestamps less than an hour ago', () => {
    const result = formatNotificationTimestamp('2025-01-10T11:45:00Z');
    expect(result).toBe('15 min ago');
  });

  it('should return hours for timestamps less than a day ago', () => {
    const result = formatNotificationTimestamp('2025-01-10T09:00:00Z');
    expect(result).toBe('3h ago');
  });

  it('should return "Yesterday" for yesterday', () => {
    const result = formatNotificationTimestamp('2025-01-09T12:00:00Z');
    expect(result).toBe('Yesterday');
  });

  it('should return days for timestamps less than a week ago', () => {
    const result = formatNotificationTimestamp('2025-01-07T12:00:00Z');
    expect(result).toBe('3d ago');
  });

  it('should return formatted date for older timestamps', () => {
    const result = formatNotificationTimestamp('2025-01-01T12:00:00Z');
    expect(result).toBe('Jan 1');
  });
});

// ============================================================================
// Data Creation Helper Tests
// ============================================================================

describe('createProximityAlertData', () => {
  it('should create complete proximity alert data', () => {
    const data = createProximityAlertData('job-123', 'Electrician', 2.5, 'Electrical');
    expect(data.job_id).toBe('job-123');
    expect(data.job_title).toBe('Electrician');
    expect(data.distance).toBe(2.5);
    expect(data.trade).toBe('Electrical');
  });

  it('should handle missing trade', () => {
    const data = createProximityAlertData('job-123', 'Electrician', 2.5);
    expect(data.trade).toBeNull();
  });
});

describe('createApplicationStatusData', () => {
  it('should create application status data', () => {
    const data = createApplicationStatusData('app-123', 'job-456', 'Senior Dev', 'viewed');
    expect(data.application_id).toBe('app-123');
    expect(data.job_id).toBe('job-456');
    expect(data.job_title).toBe('Senior Dev');
    expect(data.status).toBe('viewed');
  });
});

describe('createNewMessageData', () => {
  it('should create new message data', () => {
    const data = createNewMessageData('conv-123', 'user-456', 'John Smith');
    expect(data.conversation_id).toBe('conv-123');
    expect(data.sender_id).toBe('user-456');
    expect(data.sender_name).toBe('John Smith');
  });
});

describe('createProfileViewData', () => {
  it('should create profile view data with name', () => {
    const data = createProfileViewData('user-123', 'ABC Company');
    expect(data.viewer_id).toBe('user-123');
    expect(data.viewer_name).toBe('ABC Company');
  });

  it('should create profile view data without name', () => {
    const data = createProfileViewData('user-123');
    expect(data.viewer_id).toBe('user-123');
    expect(data.viewer_name).toBeNull();
  });
});

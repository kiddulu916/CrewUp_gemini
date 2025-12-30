'use server';

/**
 * Sentry API Integration
 *
 * Fetches error data from Sentry REST API for monitoring dashboard.
 * Handles cases where Sentry is not configured yet.
 */

// Sentry API types
export type SentryIssue = {
  id: string;
  title: string;
  culprit: string;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
  level: 'error' | 'warning' | 'info' | 'fatal';
  status: 'resolved' | 'unresolved' | 'ignored';
};

export type SentryStats = {
  received: number;
  rejected: number;
  blacklisted: number;
};

export type ErrorRateData = {
  date: string;
  errors: number;
};

export type SystemHealthStatus = {
  status: 'healthy' | 'degraded' | 'critical';
  errorRate: number;
  activeIssues: number;
  resolvedToday: number;
  sentryConfigured: boolean;
  message: string;
};

/**
 * Check if Sentry is properly configured
 */
function isSentryConfigured(): boolean {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  return !!dsn && !dsn.includes('example') && !dsn.includes('o0.ingest.sentry.io/0');
}

/**
 * Get Sentry organization and project from DSN
 */
function getSentryConfig() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const authToken = process.env.SENTRY_AUTH_TOKEN;

  if (!dsn || !authToken) {
    return null;
  }

  // Use organization slug from next.config.ts (not parsed from DSN)
  // DSN contains org ID, but API needs org slug
  const organization = 'corey-tb'; // From next.config.ts
  const project = 'krewup'; // From next.config.ts

  return {
    organization,
    project,
    authToken,
  };
}

/**
 * Fetch recent issues from Sentry API
 */
export async function getRecentIssues(limit: number = 10): Promise<SentryIssue[]> {
  if (!isSentryConfigured()) {
    console.warn('Sentry not configured, returning mock data');
    return [];
  }

  const config = getSentryConfig();
  if (!config) {
    return [];
  }

  try {
    const response = await fetch(
      `https://sentry.io/api/0/projects/${config.organization}/${config.project}/issues/?statsPeriod=14d&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${config.authToken}`,
        },
        // @ts-ignore - Next.js extended fetch API
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch Sentry issues:', response.statusText);
      return [];
    }

    const data = await response.json();

    return data.map((issue: any) => ({
      id: issue.id,
      title: issue.title,
      culprit: issue.culprit || 'Unknown',
      count: issue.count,
      userCount: issue.userCount || 0,
      firstSeen: issue.firstSeen,
      lastSeen: issue.lastSeen,
      permalink: issue.permalink,
      level: issue.level || 'error',
      status: issue.status || 'unresolved',
    }));
  } catch (error) {
    console.error('Error fetching Sentry issues:', error);
    return [];
  }
}

/**
 * Fetch error rate data for chart (last 14 days)
 */
export async function getErrorRateData(): Promise<ErrorRateData[]> {
  if (!isSentryConfigured()) {
    // Return mock data for development
    const mockData: ErrorRateData[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      mockData.push({
        date: date.toISOString().split('T')[0],
        errors: Math.floor(Math.random() * 20),
      });
    }
    return mockData;
  }

  const config = getSentryConfig();
  if (!config) {
    return [];
  }

  try {
    const response = await fetch(
      `https://sentry.io/api/0/projects/${config.organization}/${config.project}/stats/?stat=received&resolution=1d&since=${Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60}`,
      {
        headers: {
          Authorization: `Bearer ${config.authToken}`,
        },
        // @ts-ignore - Next.js extended fetch API
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch Sentry stats:', response.statusText);
      return [];
    }

    const data = await response.json();

    return data.map((stat: [number, number]) => ({
      date: new Date(stat[0] * 1000).toISOString().split('T')[0],
      errors: stat[1],
    }));
  } catch (error) {
    console.error('Error fetching Sentry stats:', error);
    return [];
  }
}

/**
 * Get overall system health status
 */
export async function getSystemHealth(): Promise<SystemHealthStatus> {
  const sentryConfigured = isSentryConfigured();

  if (!sentryConfigured) {
    return {
      status: 'healthy',
      errorRate: 0,
      activeIssues: 0,
      resolvedToday: 0,
      sentryConfigured: false,
      message: 'Sentry not configured. Add SENTRY_AUTH_TOKEN to enable monitoring.',
    };
  }

  try {
    const issues = await getRecentIssues(100);
    const unresolvedIssues = issues.filter(i => i.status === 'unresolved');
    const errorRateData = await getErrorRateData();

    // Calculate error rate (errors per day over last 7 days)
    const recentErrors = errorRateData.slice(-7);
    const totalErrors = recentErrors.reduce((sum, day) => sum + day.errors, 0);
    const avgErrorRate = Math.round(totalErrors / 7);

    // Count resolved today
    const today = new Date().toISOString().split('T')[0];
    const resolvedToday = issues.filter(i =>
      i.status === 'resolved' &&
      i.lastSeen.startsWith(today)
    ).length;

    // Determine health status
    let status: 'healthy' | 'degraded' | 'critical';
    let message: string;

    if (avgErrorRate > 100 || unresolvedIssues.length > 50) {
      status = 'critical';
      message = 'High error rate detected. Immediate attention required.';
    } else if (avgErrorRate > 50 || unresolvedIssues.length > 20) {
      status = 'degraded';
      message = 'Elevated error levels. Monitor closely.';
    } else {
      status = 'healthy';
      message = 'All systems operational.';
    }

    return {
      status,
      errorRate: avgErrorRate,
      activeIssues: unresolvedIssues.length,
      resolvedToday,
      sentryConfigured: true,
      message,
    };
  } catch (error) {
    console.error('Error calculating system health:', error);
    return {
      status: 'degraded',
      errorRate: 0,
      activeIssues: 0,
      resolvedToday: 0,
      sentryConfigured: true,
      message: 'Failed to fetch monitoring data. Check Sentry API connection.',
    };
  }
}

/**
 * Get project stats from Sentry
 */
export async function getSentryStats(): Promise<SentryStats | null> {
  if (!isSentryConfigured()) {
    return null;
  }

  const config = getSentryConfig();
  if (!config) {
    return null;
  }

  try {
    const response = await fetch(
      `https://sentry.io/api/0/projects/${config.organization}/${config.project}/`,
      {
        headers: {
          Authorization: `Bearer ${config.authToken}`,
        },
        // @ts-ignore - Next.js extended fetch API
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch Sentry project stats:', response.statusText);
      return null;
    }

    const data = await response.json();

    return {
      received: data.stats?.['24h']?.[0]?.[1] || 0,
      rejected: data.stats?.['24h']?.[1]?.[1] || 0,
      blacklisted: data.stats?.['24h']?.[2]?.[1] || 0,
    };
  } catch (error) {
    console.error('Error fetching Sentry project stats:', error);
    return null;
  }
}

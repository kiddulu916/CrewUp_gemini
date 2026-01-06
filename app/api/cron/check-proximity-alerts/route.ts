// app/api/cron/check-proximity-alerts/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase admin client for cron job
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Cron job to check for new jobs matching proximity alerts
 * Runs every 10 minutes
 * Protected by Vercel Cron Secret
 * Note: This route is not functional in static export builds (mobile).
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('Unauthorized cron job access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Get new jobs from last 10 minutes
    const { data: newJobs, error: jobsError } = await supabaseAdmin
      .from('jobs')
      .select(`
        id, 
        title, 
        trades, 
        location, 
        coords, 
        employer:users!employer_id(first_name, last_name)
      `)
      .gte('created_at', tenMinutesAgo)
      .eq('status', 'active');

    if (jobsError) {
      console.error('Error fetching new jobs:', jobsError);
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    if (!newJobs || newJobs.length === 0) {
      console.log('No new jobs found');
      return NextResponse.json({
        success: true,
        message: 'No new jobs to process',
        count: 0,
      });
    }

    console.log(`Found ${newJobs.length} new jobs`);

    // Get all active proximity alerts
    const { data: alerts, error: alertsError } = await supabaseAdmin
      .from('proximity_alerts')
      .select(`
        *,
        user:users!user_id(id, geo_coords, first_name, last_name)
      `)
      .eq('is_active', true);

    if (alertsError) {
      console.error('Error fetching alerts:', alertsError);
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      );
    }

    if (!alerts || alerts.length === 0) {
      console.log('No active alerts found');
      return NextResponse.json({
        success: true,
        message: 'No active alerts to process',
        count: 0,
      });
    }

    console.log(`Found ${alerts.length} active alerts`);

    let notificationsCreated = 0;

    // Check each job against each alert
    for (const job of newJobs) {
      if (!job.coords) continue; // Skip jobs without coordinates

      for (const alert of alerts) {
        if (!alert.user?.geo_coords) continue; // Skip users without coordinates

        // Check if any job trade matches alert trades
        const hasMatchingTrade = job.trades.some((t: string) => alert.trades.includes(t));
        if (!hasMatchingTrade) continue;

        // Calculate distance using PostGIS
        const { data: distanceResult } = await supabaseAdmin.rpc(
          'st_distance',
          {
            geog1: job.coords,
            geog2: alert.user.geo_coords,
          }
        );

        const distanceKm = distanceResult ? distanceResult / 1000 : Infinity;

        // If within radius, create notification
        if (distanceKm <= alert.radius_km) {
          const employer = job.employer as any;
          const employerName = employer ? `${employer.first_name} ${employer.last_name}`.trim() : 'Unknown';

          const { error: notifError } = await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: alert.user_id,
              type: 'new_job',
              title: 'New Job Nearby',
              message: `${job.title} posted ${Math.round(distanceKm * 10) / 10} km away by ${employerName}`,
              data: {
                job_id: job.id,
                job_title: job.title,
                trades: job.trades,
                location: job.location,
                distance_km: Math.round(distanceKm * 10) / 10,
              },
            });

          if (!notifError) {
            notificationsCreated++;
            console.log(`Created notification for user ${alert.user_id}, job ${job.id}`);
          } else {
            console.error('Error creating notification:', notifError);
          }
        }
      }
    }

    console.log(`Created ${notificationsCreated} notifications`);

    return NextResponse.json({
      success: true,
      message: `Processed ${newJobs.length} jobs, created ${notificationsCreated} notifications`,
      jobsProcessed: newJobs.length,
      notificationsCreated,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

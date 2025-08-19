import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bountyId, format = 'csv' } = await request.json();

    // Verify ownership of bounty
    const { data: bounty, error: bountyError } = await supabase
      .from('bounties')
      .select('*')
      .eq('id', bountyId)
      .eq('enterprise_id', user.id)
      .single();

    if (bountyError || !bounty) {
      return NextResponse.json({ error: 'Bounty not found' }, { status: 404 });
    }

    // Fetch all submissions for this bounty
    const { data: submissions, error: submissionsError } = await supabase
      .from('bounty_submissions')
      .select(`
        *,
        spotter:profiles(
          username,
          email,
          expertise,
          preferred_platforms
        )
      `)
      .eq('bounty_id', bountyId)
      .order('submitted_at', { ascending: false });

    if (submissionsError) {
      throw submissionsError;
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Submission ID',
        'Headline',
        'Description',
        'Link',
        'Status',
        'Spotter Username',
        'Spotter Email',
        'Expertise',
        'Platform',
        'Submitted At',
        'Validated At',
        'Earned Amount'
      ];

      const csvRows = (submissions || []).map(submission => [
        submission.id,
        `"${submission.headline.replace(/"/g, '""')}"`,
        `"${(submission.description || '').replace(/"/g, '""')}"`,
        submission.link,
        submission.status,
        submission.spotter?.username || 'Unknown',
        submission.spotter?.email || '',
        (submission.spotter?.expertise || []).join('; '),
        submission.platform || '',
        new Date(submission.submitted_at).toISOString(),
        submission.validated_at ? new Date(submission.validated_at).toISOString() : '',
        submission.earned_amount || 0
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="bounty-${bountyId}-${Date.now()}.csv"`,
        },
      });
    } else if (format === 'json') {
      // Return JSON format
      const jsonData = {
        bounty: {
          id: bounty.id,
          title: bounty.title,
          description: bounty.description,
          total_spots: bounty.total_spots,
          filled_spots: bounty.filled_spots,
          price_per_spot: bounty.price_per_spot,
          status: bounty.status,
          created_at: bounty.created_at,
          expires_at: bounty.expires_at,
        },
        submissions: (submissions || []).map(s => ({
          id: s.id,
          headline: s.headline,
          description: s.description,
          link: s.link,
          status: s.status,
          platform: s.platform,
          submitted_at: s.submitted_at,
          validated_at: s.validated_at,
          earned_amount: s.earned_amount,
          spotter: {
            username: s.spotter?.username,
            email: s.spotter?.email,
            expertise: s.spotter?.expertise,
          }
        })),
        stats: {
          total_submissions: submissions?.length || 0,
          approved: submissions?.filter(s => s.status === 'approved').length || 0,
          pending: submissions?.filter(s => s.status === 'pending').length || 0,
          rejected: submissions?.filter(s => s.status === 'rejected').length || 0,
          total_cost: submissions
            ?.filter(s => s.status === 'approved')
            .reduce((sum, s) => sum + (s.earned_amount || 0), 0) || 0,
        }
      };

      return NextResponse.json(jsonData);
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export bounty data' },
      { status: 500 }
    );
  }
}

// Webhook delivery endpoint
export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bountyId, submissionId, webhookUrl } = await request.json();

    // Verify ownership of bounty
    const { data: bounty, error: bountyError } = await supabase
      .from('bounties')
      .select('*')
      .eq('id', bountyId)
      .eq('enterprise_id', user.id)
      .single();

    if (bountyError || !bounty) {
      return NextResponse.json({ error: 'Bounty not found' }, { status: 404 });
    }

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('bounty_submissions')
      .select(`
        *,
        spotter:profiles(
          username,
          expertise
        )
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Prepare webhook payload
    const webhookPayload = {
      event: 'bounty.submission.new',
      timestamp: new Date().toISOString(),
      bounty: {
        id: bounty.id,
        title: bounty.title,
        enterprise_id: bounty.enterprise_id,
      },
      submission: {
        id: submission.id,
        headline: submission.headline,
        description: submission.description,
        link: submission.link,
        status: submission.status,
        platform: submission.platform,
        submitted_at: submission.submitted_at,
        spotter: {
          id: submission.spotter_id,
          username: submission.spotter?.username,
          expertise: submission.spotter?.expertise,
        }
      }
    };

    // Send webhook
    const targetUrl = webhookUrl || bounty.webhook_url;
    if (targetUrl) {
      try {
        const webhookResponse = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WaveSight-Event': 'bounty.submission.new',
            'X-WaveSight-Signature': generateWebhookSignature(webhookPayload),
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          console.error('Webhook delivery failed:', webhookResponse.status);
        }
      } catch (webhookError) {
        console.error('Webhook delivery error:', webhookError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to send webhook' },
      { status: 500 }
    );
  }
}

// Helper function to generate webhook signature (implement HMAC for production)
function generateWebhookSignature(payload: any): string {
  // In production, use HMAC-SHA256 with a secret key
  const crypto = require('crypto');
  const secret = process.env.WEBHOOK_SECRET || 'default-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}
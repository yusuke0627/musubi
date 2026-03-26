import { NextRequest, NextResponse } from 'next/server';
import { generateOptimizationAlerts, dismissAlert, restoreAlert } from '@/services/alerts';
import { auth } from '@/auth';

// GET: アラート一覧を取得
export async function GET(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const advertiserId = searchParams.get('advertiser_id');

  if (!advertiserId) {
    return NextResponse.json(
      { error: 'advertiser_id is required' },
      { status: 400 }
    );
  }

  const id = parseInt(advertiserId, 10);
  
  // 権限チェック
  const user = session.user as any;
  if (user.role !== 'admin' && (user.role !== 'advertiser' || user.linked_id !== id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const alerts = await generateOptimizationAlerts(id);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Failed to generate alerts:', error);
    return NextResponse.json(
      { error: 'Failed to generate alerts' },
      { status: 500 }
    );
  }
}

// POST: アラートをDismissする
export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { advertiser_id, alert_id, action } = body;

    if (!advertiser_id || !alert_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const id = parseInt(advertiser_id, 10);
    
    // 権限チェック
    const user = session.user as any;
    if (user.role !== 'admin' && (user.role !== 'advertiser' || user.linked_id !== id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'dismiss') {
      await dismissAlert(id, alert_id);
    } else if (action === 'restore') {
      await restoreAlert(id, alert_id);
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}

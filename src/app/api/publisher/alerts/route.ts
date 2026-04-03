import { NextRequest, NextResponse } from 'next/server';
import { generatePublisherAlerts, dismissPublisherAlert, restorePublisherAlert } from '@/services/alerts';
import { auth } from '@/auth';

// GET: パブリッシャーのアラート一覧を取得
export async function GET(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const publisherId = searchParams.get('publisher_id');

  if (!publisherId) {
    return NextResponse.json(
      { error: 'publisher_id is required' },
      { status: 400 }
    );
  }

  const id = parseInt(publisherId, 10);
  
  // 権限チェック
  const user = session.user as any;
  if (user.role !== 'admin' && (user.role !== 'publisher' || user.linked_id !== id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const alerts = await generatePublisherAlerts(id);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Failed to generate publisher alerts:', error);
    return NextResponse.json(
      { error: 'Failed to generate alerts' },
      { status: 500 }
    );
  }
}

// POST: アラートをDismiss/Restoreする
export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { publisher_id, alert_id, action } = body;

    if (!publisher_id || !alert_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const id = parseInt(publisher_id, 10);
    
    // 権限チェック
    const user = session.user as any;
    if (user.role !== 'admin' && (user.role !== 'publisher' || user.linked_id !== id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'dismiss') {
      await dismissPublisherAlert(id, alert_id);
    } else if (action === 'restore') {
      await restorePublisherAlert(id, alert_id);
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update publisher alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}

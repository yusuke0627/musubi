import prisma from '../lib/db';
import { OptimizationAlert, AlertType, AlertSeverity } from '../types/alert';

/**
 * 広告主の最適化アラートを生成する
 * Dismiss済みのアラートは除外される
 */
export async function generateOptimizationAlerts(advertiserId: number): Promise<{
  activeAlerts: OptimizationAlert[];
  dismissedAlerts: OptimizationAlert[];
}> {
  const allAlerts: OptimizationAlert[] = [];

  // キャンペーンとその関連データを取得
  const campaigns = await prisma.campaign.findMany({
    where: { advertiser_id: advertiserId },
    include: {
      adGroups: {
        include: {
          ads: true,
        },
      },
    },
  });

  // Dismiss済みアラートを取得
  const dismissedAlerts = await prisma.dismissedAlert.findMany({
    where: { advertiser_id: advertiserId },
  });
  const dismissedSet = new Set(
    dismissedAlerts.map(d => `${d.alert_type}-${d.entity_id}`)
  );

  // 各キャンペーンをチェック
  for (const campaign of campaigns) {
    // 🔴 Critical: 広告未設定のキャンペーン
    const totalAds = campaign.adGroups.reduce(
      (sum, ag) => sum + ag.ads.length, 0
    );
    
    if (campaign.status === 'ACTIVE' && totalAds === 0) {
      const alertId = `${AlertType.NO_ADS_IN_CAMPAIGN}-${campaign.id}`;
      allAlerts.push({
        id: alertId,
        severity: 'critical' as AlertSeverity,
        title: '配信可能な広告がありません',
        description: `キャンペーン「${campaign.name}」が有効ですが、紐づく広告が未設定です。`,
        action: {
          label: '広告を追加する',
          type: 'link',
          href: `/advertiser/${advertiserId}?highlight=create-ad&campaign_id=${campaign.id}`,
        },
        isDismissed: dismissedSet.has(alertId),
      });
    }

    // 🔴 Critical: 親が停止中で配信されない設定矛盾
    for (const adGroup of campaign.adGroups) {
      if (campaign.status === 'ACTIVE' && adGroup.status !== 'ACTIVE') {
        const alertId = `${AlertType.PARENT_PAUSED}-${adGroup.id}`;
        allAlerts.push({
          id: alertId,
          severity: 'critical' as AlertSeverity,
          title: '広告グループが停止中です',
          description: `キャンペーン「${campaign.name}」は有効ですが、広告グループ「${adGroup.name}」が停止中のため配信されません。`,
          action: {
            label: '広告グループを確認',
            type: 'link',
            href: `/advertiser/${advertiserId}?highlight=adgroups&edit=adgroup-${adGroup.id}`,
          },
          isDismissed: dismissedSet.has(alertId),
        });
      }
    }

    // 🟡 Warning: 予算未設定・少なすぎる予算
    if (campaign.budget === 0 && campaign.daily_budget === 0) {
      const alertId = `${AlertType.NO_BUDGET}-${campaign.id}`;
      allAlerts.push({
        id: alertId,
        severity: 'warning' as AlertSeverity,
        title: '予算が未設定です',
        description: `キャンペーン「${campaign.name}」に予算が設定されていません。`,
        action: {
          label: '予算を設定する',
          type: 'link',
          href: `/advertiser/${advertiserId}?highlight=campaigns&edit=campaign-${campaign.id}`,
        },
        isDismissed: dismissedSet.has(alertId),
      });
    }

    // 🟡 Warning: 予算消化による停止（機会損失）
    const isTotalBudgetExhausted = campaign.budget > 0 && campaign.spent >= campaign.budget;
    const isDailyBudgetExhausted = campaign.daily_budget > 0 && campaign.today_spent >= campaign.daily_budget;

    if (isTotalBudgetExhausted || isDailyBudgetExhausted) {
      const alertId = `${AlertType.BUDGET_EXHAUSTED}-${campaign.id}`;
      const budgetType = isTotalBudgetExhausted ? '総予算' : '日次予算';
      allAlerts.push({
        id: alertId,
        severity: 'warning' as AlertSeverity,
        title: '予算を使い切りました',
        description: `キャンペーン「${campaign.name}」の${budgetType}を使い切りました。配信が停止されています。`,
        action: {
          label: '予算を増やす',
          type: 'link',
          href: `/advertiser/${advertiserId}?highlight=campaigns&edit=campaign-${campaign.id}`,
        },
        isDismissed: dismissedSet.has(alertId),
      });
    }
  }

  // activeとdismissedに振り分け
  const activeAlerts = allAlerts.filter(a => !a.isDismissed);
  const dismissedAlertList = allAlerts.filter(a => a.isDismissed);

  // severityでソート（critical > warning > suggestion）
  const severityOrder = { critical: 0, warning: 1, suggestion: 2 };
  activeAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  dismissedAlertList.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return { activeAlerts, dismissedAlerts: dismissedAlertList };
}

/**
 * アラートをDismiss（無視）する
 */
export async function dismissAlert(
  advertiserId: number,
  alertId: string
): Promise<void> {
  const [alertType, entityId] = alertId.split(/-(.+)/); // 最初の-で分割
  
  if (!alertType || !entityId) {
    throw new Error('Invalid alert ID format');
  }

  await prisma.dismissedAlert.create({
    data: {
      advertiser_id: advertiserId,
      alert_type: alertType,
      entity_id: entityId,
    },
  });
}

/**
 * Dismiss済みアラートを復活させる
 */
export async function restoreAlert(
  advertiserId: number,
  alertId: string
): Promise<void> {
  const [alertType, entityId] = alertId.split(/-(.+)/);
  
  if (!alertType || !entityId) {
    throw new Error('Invalid alert ID format');
  }

  await prisma.dismissedAlert.deleteMany({
    where: {
      advertiser_id: advertiserId,
      alert_type: alertType,
      entity_id: entityId,
    },
  });
}

/**
 * パブリッシャーの支払い関連アラートを生成する
 * Dismiss済みのアラートは除外される
 */
export async function generatePublisherAlerts(publisherId: number): Promise<{
  activeAlerts: OptimizationAlert[];
  dismissedAlerts: OptimizationAlert[];
}> {
  const allAlerts: OptimizationAlert[] = [];

  // パブリッシャー情報を取得
  const publisher = await prisma.publisher.findUnique({
    where: { id: publisherId },
  });

  if (!publisher) {
    return { activeAlerts: [], dismissedAlerts: [] };
  }

  // Dismiss済みアラートを取得
  const dismissedAlerts = await prisma.dismissedAlert.findMany({
    where: { publisher_id: publisherId },
  });
  const dismissedSet = new Set(
    dismissedAlerts.map(d => `${d.alert_type}-${d.entity_id}`)
  );

  // 💰 Suggestion: 支払い可能金額に達した
  if (publisher.balance >= publisher.min_payout_threshold) {
    const alertId = `${AlertType.PAYOUT_THRESHOLD_REACHED}-${publisher.id}`;
    allAlerts.push({
      id: alertId,
      severity: 'suggestion' as AlertSeverity,
      title: '支払い可能金額に達しました',
      description: `現在の残高 ¥${publisher.balance.toLocaleString()} が最低支払い金額 ¥${publisher.min_payout_threshold.toLocaleString()} に達しました。`,
      action: {
        label: '支払いをリクエスト',
        type: 'link',
        href: `/publisher/${publisherId}#payout-section`,
      },
      isDismissed: dismissedSet.has(alertId),
    });
  }

  // activeとdismissedに振り分け
  const activeAlerts = allAlerts.filter(a => !a.isDismissed);
  const dismissedAlertList = allAlerts.filter(a => a.isDismissed);

  // severityでソート（critical > warning > suggestion）
  const severityOrder = { critical: 0, warning: 1, suggestion: 2 };
  activeAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  dismissedAlertList.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return { activeAlerts, dismissedAlerts: dismissedAlertList };
}

/**
 * パブリッシャーのアラートをDismiss（無視）する
 */
export async function dismissPublisherAlert(
  publisherId: number,
  alertId: string
): Promise<void> {
  const [alertType, entityId] = alertId.split(/-(.+)/); // 最初の-で分割
  
  if (!alertType || !entityId) {
    throw new Error('Invalid alert ID format');
  }

  await prisma.dismissedAlert.create({
    data: {
      publisher_id: publisherId,
      alert_type: alertType,
      entity_id: entityId,
    },
  });
}

/**
 * パブリッシャーのDismiss済みアラートを復活させる
 */
export async function restorePublisherAlert(
  publisherId: number,
  alertId: string
): Promise<void> {
  const [alertType, entityId] = alertId.split(/-(.+)/);
  
  if (!alertType || !entityId) {
    throw new Error('Invalid alert ID format');
  }

  await prisma.dismissedAlert.deleteMany({
    where: {
      publisher_id: publisherId,
      alert_type: alertType,
      entity_id: entityId,
    },
  });
}

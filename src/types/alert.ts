export type AlertSeverity = 'critical' | 'warning' | 'suggestion';

export interface OptimizationAlert {
  id: string;           // アラートの一意なID (例: 'no-ad-camp-123')
  severity: AlertSeverity;
  title: string;
  description: string;
  action: {
    label: string;
    type: 'link' | 'api';
    href?: string;
    apiEndpoint?: string;
    apiPayload?: any;
  };
  isDismissed: boolean;
}

// アラートタイプの定数
export const AlertType = {
  NO_ADS_IN_CAMPAIGN: 'NO_ADS_IN_CAMPAIGN',
  PARENT_PAUSED: 'PARENT_PAUSED',
  NO_BUDGET: 'NO_BUDGET',
  BUDGET_EXHAUSTED: 'BUDGET_EXHAUSTED',
  PAYOUT_THRESHOLD_REACHED: 'PAYOUT_THRESHOLD_REACHED',
} as const;

export type AlertType = typeof AlertType[keyof typeof AlertType];

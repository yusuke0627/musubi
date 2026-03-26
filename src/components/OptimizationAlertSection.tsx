'use client';

import { useState, useCallback } from 'react';
import { OptimizationAlert, AlertSeverity } from '@/types/alert';

interface OptimizationAlertSectionProps {
  advertiserId: number;
  initialAlerts: {
    activeAlerts: OptimizationAlert[];
    dismissedAlerts: OptimizationAlert[];
  };
}

const severityConfig: Record<AlertSeverity, { icon: string; bgColor: string; borderColor: string; iconBg: string }> = {
  critical: {
    icon: '🔴',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconBg: 'bg-red-100',
  },
  warning: {
    icon: '🟡',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconBg: 'bg-yellow-100',
  },
  suggestion: {
    icon: '🔵',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
  },
};

export default function OptimizationAlertSection({
  advertiserId,
  initialAlerts,
}: OptimizationAlertSectionProps) {
  const [activeAlerts, setActiveAlerts] = useState(initialAlerts.activeAlerts);
  const [dismissedAlerts, setDismissedAlerts] = useState(initialAlerts.dismissedAlerts);
  const [showDismissed, setShowDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleDismiss = useCallback(async (alertId: string) => {
    setIsLoading(alertId);
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          alert_id: alertId,
          action: 'dismiss',
        }),
      });

      if (response.ok) {
        const alert = activeAlerts.find(a => a.id === alertId);
        if (alert) {
          setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
          setDismissedAlerts(prev => [...prev, { ...alert, isDismissed: true }]);
        }
      }
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    } finally {
      setIsLoading(null);
    }
  }, [activeAlerts, advertiserId]);

  const handleRestore = useCallback(async (alertId: string) => {
    setIsLoading(alertId);
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiser_id: advertiserId,
          alert_id: alertId,
          action: 'restore',
        }),
      });

      if (response.ok) {
        const alert = dismissedAlerts.find(a => a.id === alertId);
        if (alert) {
          setDismissedAlerts(prev => prev.filter(a => a.id !== alertId));
          setActiveAlerts(prev => [...prev, { ...alert, isDismissed: false }]);
        }
      }
    } catch (error) {
      console.error('Failed to restore alert:', error);
    } finally {
      setIsLoading(null);
    }
  }, [dismissedAlerts, advertiserId]);

  const renderAlert = (alert: OptimizationAlert, isDismissed: boolean) => {
    const config = severityConfig[alert.severity];
    
    return (
      <div
        key={alert.id}
        className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4 mb-3 transition-all`}
      >
        <div className="flex items-start gap-3">
          <div className={`${config.iconBg} w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0`}>
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-gray-900 text-sm">
                {alert.title}
              </h4>
              {!isDismissed && (
                <button
                  onClick={() => handleDismiss(alert.id)}
                  disabled={isLoading === alert.id}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mr-1 -mt-1 flex-shrink-0"
                  title="非表示にする"
                >
                  {isLoading === alert.id ? (
                    <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {alert.description}
            </p>
            <div className="flex items-center gap-3 mt-3">
              {alert.action.type === 'link' && alert.action.href && (
                <a
                  href={alert.action.href}
                  className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                  {alert.action.label}
                </a>
              )}
              {isDismissed && (
                <button
                  onClick={() => handleRestore(alert.id)}
                  disabled={isLoading === alert.id}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  再表示する
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (activeAlerts.length === 0 && dismissedAlerts.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div>
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
            最適化アラート ({activeAlerts.length}件)
          </h3>
          {activeAlerts.map(alert => renderAlert(alert, false))}
        </div>
      )}

      {/* Toggle Dismissed */}
      {dismissedAlerts.length > 0 && (
        <div>
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 py-2"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showDismissed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            非表示アラートを表示 ({dismissedAlerts.length}件)
          </button>
          
          {showDismissed && (
            <div className="mt-2 opacity-60">
              {dismissedAlerts.map(alert => renderAlert(alert, true))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

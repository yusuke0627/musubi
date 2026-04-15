/**
 * オークション統計の非同期キュー
 * パフォーマンスを確保するため、統計記録を非同期で処理
 */

import prisma from './db';

// キューアイテムの型
interface QueueItem {
  adGroupId: number;
  type: 'auction' | 'win';
  date: Date;
}

// メモリ内キュー
const queue: QueueItem[] = [];
let isProcessing = false;

/**
 * 統計をキューに追加（非同期、即座に返る）
 */
export function enqueueAuctionStats(adGroupId: number, type: 'auction' | 'win'): void {
  // 日付は時刻を無視（日次集計）
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  
  queue.push({ adGroupId, type, date });
  
  // バッチ処理をトリガー
  processQueueBatch();
}

/**
 * キューをバッチ処理
 * 重複実行防止のため、単一の処理のみ実行
 */
async function processQueueBatch(): Promise<void> {
  if (isProcessing || queue.length === 0) return;
  
  isProcessing = true;
  
  try {
    // キューから最大100件を取得
    const batch = queue.splice(0, 100);
    
    // AdGroupごとに集計
    const stats = new Map<string, { auction: number; win: number; date: Date }>();
    
    for (const item of batch) {
      const key = `${item.adGroupId}-${item.date.toISOString().split('T')[0]}`;
      const existing = stats.get(key);
      
      if (existing) {
        if (item.type === 'auction') existing.auction++;
        else existing.win++;
      } else {
        stats.set(key, {
          auction: item.type === 'auction' ? 1 : 0,
          win: item.type === 'win' ? 1 : 0,
          date: item.date,
        });
      }
    }
    
    // DBにバッチUPSERT
    const upserts = Array.from(stats.entries()).map(async ([key, value]) => {
      const [adGroupId] = key.split('-');
      
      await prisma.$executeRaw`
        INSERT INTO ad_group_auction_stats (ad_group_id, date, auction_count, win_count)
        VALUES (${parseInt(adGroupId)}, ${value.date}, ${value.auction}, ${value.win})
        ON CONFLICT(ad_group_id, date) DO UPDATE SET
          auction_count = ad_group_auction_stats.auction_count + ${value.auction},
          win_count = ad_group_auction_stats.win_count + ${value.win}
      `;
    });
    
    await Promise.all(upserts);
    
  } catch (error) {
    console.error('[AuctionStatsQueue] Failed to process batch:', error);
  } finally {
    isProcessing = false;
    
    // キューにまだ残っている場合は継続処理
    if (queue.length > 0) {
      setImmediate(processQueueBatch);
    }
  }
}

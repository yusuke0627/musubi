import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { isBotUserAgent, isRateLimited, isDuplicate } from './ivt';
import { initSchema } from '../lib/db';

describe('IVT Service (Invalid Traffic Detection)', () => {
  describe('isBotUserAgent', () => {
    it('should detect common bot user agents', () => {
      expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
      expect(isBotUserAgent('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
      expect(isBotUserAgent('curl/7.68.0')).toBe(true);
      expect(isBotUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/92.0.4515.107 Safari/537.36')).toBe(true);
      expect(isBotUserAgent('PostmanRuntime/7.28.4')).toBe(true);
    });

    it('should pass normal user agents', () => {
      expect(isBotUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')).toBe(false);
      expect(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1')).toBe(false);
      expect(isBotUserAgent(null)).toBe(false);
      expect(isBotUserAgent(undefined)).toBe(false);
      expect(isBotUserAgent('')).toBe(false);
    });
  });

  describe('Database checks', () => {
    let db: Database.Database;

    beforeEach(() => {
      db = new Database(':memory:');
      initSchema(db);
      
      // Setup some basic dependent data
      db.prepare("INSERT INTO advertisers (id, name) VALUES (1, 'Adv')").run();
      db.prepare("INSERT INTO campaigns (id, advertiser_id, name) VALUES (1, 1, 'Camp')").run();
      db.prepare("INSERT INTO ad_groups (id, campaign_id, name) VALUES (1, 1, 'Group')").run();
      db.prepare("INSERT INTO ads (id, ad_group_id, title, target_url) VALUES (1, 1, 'Ad 1', 'http://example.com')").run();
      db.prepare("INSERT INTO publishers (id, name, domain) VALUES (1, 'Pub', 'example.com')").run();
    });

    describe('isDuplicate', () => {
      it('should detect a duplicate click within 10 seconds', () => {
        // Insert an initial valid click
        db.prepare(`
          INSERT INTO clicks (id, ad_id, publisher_id, ip_address, is_valid, created_at)
          VALUES (1, 1, 1, '192.168.1.1', 1, '2026-03-12 10:00:00')
        `).run();

        // Check a new click occurring 5 seconds later
        const isDup = isDuplicate(db, 1, '192.168.1.1', 2, '2026-03-12 10:00:05');
        expect(isDup).toBe(true);
      });

      it('should not detect duplicate if more than 10 seconds have passed', () => {
        db.prepare(`
          INSERT INTO clicks (id, ad_id, publisher_id, ip_address, is_valid, created_at)
          VALUES (1, 1, 1, '192.168.1.1', 1, '2026-03-12 10:00:00')
        `).run();

        // Check a new click occurring 11 seconds later
        const isDup = isDuplicate(db, 1, '192.168.1.1', 2, '2026-03-12 10:00:11');
        expect(isDup).toBe(false);
      });

      it('should not detect duplicate for different ad', () => {
        db.prepare(`
          INSERT INTO clicks (id, ad_id, publisher_id, ip_address, is_valid, created_at)
          VALUES (1, 1, 1, '192.168.1.1', 1, '2026-03-12 10:00:00')
        `).run();

        // Check a new click for a different ad_id
        const isDup = isDuplicate(db, 2, '192.168.1.1', 2, '2026-03-12 10:00:05');
        expect(isDup).toBe(false);
      });
    });

    describe('isRateLimited', () => {
      it('should flag as rate limited if IP has >= 50 clicks in the last hour', () => {
        const insertClick = db.prepare(`
          INSERT INTO clicks (ad_id, publisher_id, ip_address, is_valid, created_at)
          VALUES (1, 1, '10.0.0.1', 1, ?)
        `);

        // Insert 50 clicks spanning the last hour
        for (let i = 0; i < 50; i++) {
          // Spread clicks evenly across 60 minutes
          const min = Math.floor((i / 50) * 60);
          const time = `2026-03-12 10:${min.toString().padStart(2, '0')}:00`;
          insertClick.run(time);
        }

        // Get the latest ID assigned (which will be 50)
        // Check for click ID 51 at the end of the hour
        const isLimited = isRateLimited(db, '10.0.0.1', 51, '2026-03-12 10:59:59');
        expect(isLimited).toBe(true);
      });

      it('should not flag if IP has < 50 clicks in the last hour', () => {
        const insertClick = db.prepare(`
          INSERT INTO clicks (ad_id, publisher_id, ip_address, is_valid, created_at)
          VALUES (1, 1, '10.0.0.1', 1, ?)
        `);

        // Insert 49 clicks
        for (let i = 0; i < 49; i++) {
          insertClick.run('2026-03-12 10:30:00');
        }

        const isLimited = isRateLimited(db, '10.0.0.1', 50, '2026-03-12 10:59:59');
        expect(isLimited).toBe(false);
      });
      
      it('should not count clicks older than 1 hour', () => {
        const insertClick = db.prepare(`
          INSERT INTO clicks (ad_id, publisher_id, ip_address, is_valid, created_at)
          VALUES (1, 1, '10.0.0.1', 1, ?)
        `);

        // Insert 50 clicks from yesterday (well past 1 hour)
        for (let i = 0; i < 50; i++) {
          insertClick.run('2026-03-11 10:00:00');
        }

        const isLimited = isRateLimited(db, '10.0.0.1', 51, '2026-03-12 10:00:00');
        expect(isLimited).toBe(false);
      });
    });
  });
});

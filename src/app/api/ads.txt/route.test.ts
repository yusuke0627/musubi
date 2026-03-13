import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import db, { initSchema } from '@/lib/db';
import { GET } from './route';

describe('GET /api/ads.txt', () => {
  beforeEach(() => {
    // Clear and initialize DB
    db.exec('DROP TABLE IF EXISTS publishers');
    initSchema(db);

    // Insert mock publisher
    db.prepare("INSERT INTO publishers (id, name, domain) VALUES (1, 'Test Publisher', 'test.com')").run();
  });

  it('should return 400 if publisher_id is missing', async () => {
    const req = new NextRequest('http://localhost/api/ads.txt');
    const res = await GET(req);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('publisher_id is required');
  });

  it('should return 404 if publisher is not found', async () => {
    const req = new NextRequest('http://localhost/api/ads.txt?publisher_id=999');
    const res = await GET(req);
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('Publisher not found');
  });

  it('should return valid ads.txt content for an existing publisher', async () => {
    const req = new NextRequest('http://localhost/api/ads.txt?publisher_id=1');
    const res = await GET(req);
    
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/plain');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600');

    const content = await res.text();
    expect(content).toContain('# ads.txt for Publisher 1');
    expect(content).toContain('adnetwork.local, 1, DIRECT, f08c47fec0942fa0');
  });
});

import { describe, it, expect } from 'vitest';
import { 
  getPrefectureFromIP, 
  parseAcceptLanguage, 
  normalizeLanguageCode,
  type Prefecture 
} from './ipGeo';

describe('getPrefectureFromIP', () => {
  it('should return Tokyo for AWS Tokyo region IP', () => {
    expect(getPrefectureFromIP('54.64.1.1')).toBe('東京都');
    expect(getPrefectureFromIP('54.178.10.10')).toBe('東京都');
    expect(getPrefectureFromIP('35.72.1.1')).toBe('東京都');
  });

  it('should return Osaka for AWS Osaka region IP', () => {
    expect(getPrefectureFromIP('13.208.1.1')).toBe('大阪府');
  });

  it('should return undefined for private IP addresses', () => {
    expect(getPrefectureFromIP('192.168.1.1')).toBeUndefined();
    expect(getPrefectureFromIP('10.0.0.1')).toBeUndefined();
    expect(getPrefectureFromIP('172.16.0.1')).toBeUndefined();
    expect(getPrefectureFromIP('127.0.0.1')).toBeUndefined();
  });

  it('should return undefined for unknown IP addresses', () => {
    expect(getPrefectureFromIP('1.2.3.4')).toBeUndefined();
    expect(getPrefectureFromIP('8.8.8.8')).toBeUndefined();
  });

  it('should return undefined for invalid IP addresses', () => {
    expect(getPrefectureFromIP('invalid')).toBeUndefined();
    expect(getPrefectureFromIP('')).toBeUndefined();
    expect(getPrefectureFromIP('999.999.999.999')).toBeUndefined();
  });

  it('should handle IPs in various ranges', () => {
    // Test various Tokyo IPs
    expect(getPrefectureFromIP('13.112.1.1')).toBe('東京都');
    expect(getPrefectureFromIP('18.176.1.1')).toBe('東京都');
    expect(getPrefectureFromIP('52.68.1.1')).toBe('東京都');
    expect(getPrefectureFromIP('176.34.1.1')).toBe('東京都');
  });
});

describe('parseAcceptLanguage', () => {
  it('should parse single language', () => {
    const result = parseAcceptLanguage('ja');
    expect(result).toEqual(['ja']);
  });

  it('should parse language with region', () => {
    const result = parseAcceptLanguage('ja-JP');
    expect(result).toEqual(['ja-jp']);
  });

  it('should parse multiple languages with quality values', () => {
    const result = parseAcceptLanguage('ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7');
    expect(result).toEqual(['ja-jp', 'ja', 'en-us', 'en']);
  });

  it('should sort languages by quality value (highest first)', () => {
    const result = parseAcceptLanguage('en;q=0.5,ja;q=0.9,fr;q=1.0');
    expect(result).toEqual(['fr', 'ja', 'en']);
  });

  it('should handle languages without quality values (default to 1.0)', () => {
    const result = parseAcceptLanguage('ja,en-US,en');
    expect(result).toEqual(['ja', 'en-us', 'en']);
  });

  it('should handle empty input', () => {
    expect(parseAcceptLanguage('')).toEqual([]);
    expect(parseAcceptLanguage(null)).toEqual([]);
  });

  it('should handle whitespace', () => {
    const result = parseAcceptLanguage(' ja-JP , en-US ; q=0.8 ');
    expect(result).toEqual(['ja-jp', 'en-us']);
  });

  it('should handle complex Accept-Language header', () => {
    const result = parseAcceptLanguage('ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.5');
    expect(result).toEqual(['ja-jp', 'ja', 'en-us', 'en', 'de']);
  });
});

describe('normalizeLanguageCode', () => {
  it('should extract primary language code', () => {
    expect(normalizeLanguageCode('ja-JP')).toBe('ja');
    expect(normalizeLanguageCode('en-US')).toBe('en');
    expect(normalizeLanguageCode('en-GB')).toBe('en');
    expect(normalizeLanguageCode('zh-CN')).toBe('zh');
  });

  it('should lowercase the result', () => {
    expect(normalizeLanguageCode('JA-JP')).toBe('ja');
    expect(normalizeLanguageCode('EN-us')).toBe('en');
  });

  it('should handle simple language codes', () => {
    expect(normalizeLanguageCode('ja')).toBe('ja');
    expect(normalizeLanguageCode('en')).toBe('en');
  });

  it('should handle codes with multiple subtags', () => {
    expect(normalizeLanguageCode('zh-Hans-CN')).toBe('zh');
  });
});

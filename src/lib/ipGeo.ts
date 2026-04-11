/**
 * IPアドレスから都道府県を判定する簡易実装
 * 主要ISPのIP範囲をカバー（簡易版）
 */

export type Prefecture =
  | "北海道"
  | "青森県"
  | "岩手県"
  | "宮城県"
  | "秋田県"
  | "山形県"
  | "福島県"
  | "茨城県"
  | "栃木県"
  | "群馬県"
  | "埼玉県"
  | "千葉県"
  | "東京都"
  | "神奈川県"
  | "新潟県"
  | "富山県"
  | "石川県"
  | "福井県"
  | "山梨県"
  | "長野県"
  | "岐阜県"
  | "静岡県"
  | "愛知県"
  | "三重県"
  | "滋賀県"
  | "京都府"
  | "大阪府"
  | "兵庫県"
  | "奈良県"
  | "和歌山県"
  | "鳥取県"
  | "島根県"
  | "岡山県"
  | "広島県"
  | "山口県"
  | "徳島県"
  | "香川県"
  | "愛媛県"
  | "高知県"
  | "福岡県"
  | "佐賀県"
  | "長崎県"
  | "熊本県"
  | "大分県"
  | "宮崎県"
  | "鹿児島県"
  | "沖縄県";

interface IPRange {
  start: number;
  end: number;
  prefecture: Prefecture;
}

/**
 * IPアドレスを数値に変換
 * e.g., "192.168.1.1" -> 3232235777
 */
function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return 0;
  }
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * プライベートIPアドレスかどうかを判定
 */
function isPrivateIP(ip: string): boolean {
  const num = ipToNumber(ip);
  // 10.0.0.0/8
  if ((num & 0xff000000) === 0x0a000000) return true;
  // 172.16.0.0/12
  if ((num & 0xfff00000) === 0xac100000) return true;
  // 192.168.0.0/16
  if ((num & 0xffff0000) === 0xc0a80000) return true;
  // 127.0.0.0/8 (loopback)
  if ((num & 0xff000000) === 0x7f000000) return true;
  return false;
}

/**
 * 簡易的なIP範囲マッピング（主要データセンター/ISPの例）
 * 実際にはもっと詳細なデータベースが必要だが、デモ用に簡易実装
 */
const IP_RANGES: IPRange[] = [
  // 東京（主要データセンター等）
  { start: ipToNumber("13.112.0.0"), end: ipToNumber("13.115.255.255"), prefecture: "東京都" },
  { start: ipToNumber("18.176.0.0"), end: ipToNumber("18.183.255.255"), prefecture: "東京都" },
  { start: ipToNumber("35.72.0.0"), end: ipToNumber("35.79.255.255"), prefecture: "東京都" },
  { start: ipToNumber("52.68.0.0"), end: ipToNumber("52.68.255.255"), prefecture: "東京都" },
  { start: ipToNumber("54.64.0.0"), end: ipToNumber("54.95.255.255"), prefecture: "東京都" },
  { start: ipToNumber("54.150.0.0"), end: ipToNumber("54.150.255.255"), prefecture: "東京都" },
  { start: ipToNumber("54.168.0.0"), end: ipToNumber("54.168.255.255"), prefecture: "東京都" },
  { start: ipToNumber("54.178.0.0"), end: ipToNumber("54.178.255.255"), prefecture: "東京都" },
  { start: ipToNumber("54.199.0.0"), end: ipToNumber("54.199.255.255"), prefecture: "東京都" },
  { start: ipToNumber("54.238.0.0"), end: ipToNumber("54.238.255.255"), prefecture: "東京都" },
  { start: ipToNumber("54.248.0.0"), end: ipToNumber("54.251.255.255"), prefecture: "東京都" },
  { start: ipToNumber("57.180.0.0"), end: ipToNumber("57.183.255.255"), prefecture: "東京都" },
  { start: ipToNumber("99.77.128.0"), end: ipToNumber("99.77.255.255"), prefecture: "東京都" },
  { start: ipToNumber("175.41.192.0"), end: ipToNumber("175.41.255.255"), prefecture: "東京都" },
  { start: ipToNumber("176.34.0.0"), end: ipToNumber("176.34.255.255"), prefecture: "東京都" },

  // 大阪
  { start: ipToNumber("13.208.0.0"), end: ipToNumber("13.208.255.255"), prefecture: "大阪府" },
  { start: ipToNumber("35.72.0.0"), end: ipToNumber("35.75.255.255"), prefecture: "大阪府" },
  { start: ipToNumber("43.206.0.0"), end: ipToNumber("43.207.255.255"), prefecture: "大阪府" },
  { start: ipToNumber("54.95.0.0"), end: ipToNumber("54.95.255.255"), prefecture: "大阪府" },
  { start: ipToNumber("54.150.0.0"), end: ipToNumber("54.150.255.255"), prefecture: "大阪府" },
  { start: ipToNumber("54.168.0.0"), end: ipToNumber("54.168.255.255"), prefecture: "大阪府" },
  { start: ipToNumber("54.238.0.0"), end: ipToNumber("54.238.255.255"), prefecture: "大阪府" },
  { start: ipToNumber("99.150.0.0"), end: ipToNumber("99.150.255.255"), prefecture: "大阪府" },

  // その他簡易的な割り当て（デモ用）
  // NTT東日本（関東圏）
  { start: ipToNumber("111.128.0.0"), end: ipToNumber("111.191.255.255"), prefecture: "東京都" },
  // NTT東日本（北海道・東北）
  { start: ipToNumber("111.192.0.0"), end: ipToNumber("111.255.255.255"), prefecture: "北海道" },
  // NTT西日本（関西圏）
  { start: ipToNumber("118.0.0.0"), end: ipToNumber("118.63.255.255"), prefecture: "大阪府" },
  // NTT西日本（中部・北陸）
  { start: ipToNumber("118.64.0.0"), end: ipToNumber("118.127.255.255"), prefecture: "愛知県" },
  // NTT西日本（中国・四国）
  { start: ipToNumber("118.128.0.0"), end: ipToNumber("118.191.255.255"), prefecture: "広島県" },
  // NTT西日本（九州・沖縄）
  { start: ipToNumber("118.192.0.0"), end: ipToNumber("118.255.255.255"), prefecture: "福岡県" },
];

/**
 * IPアドレスから都道府県を判定
 * 簡易実装：範囲マッチング
 * @param ip IPアドレス（IPv4）
 * @returns 都道府県名、判定できない場合は undefined
 */
export function getPrefectureFromIP(ip: string): Prefecture | undefined {
  // プライベートIPは判定不能
  if (isPrivateIP(ip)) {
    return undefined;
  }

  const ipNum = ipToNumber(ip);
  if (ipNum === 0) {
    return undefined;
  }

  // 範囲マッチング
  for (const range of IP_RANGES) {
    if (ipNum >= range.start && ipNum <= range.end) {
      return range.prefecture;
    }
  }

  // デフォルト：判定不能
  return undefined;
}

/**
 * ブラウザのAccept-Languageヘッダーから言語コードを抽出
 * @param acceptLanguage Accept-Languageヘッダー値
 * @returns 言語コード配列（優先度順）
 */
export function parseAcceptLanguage(acceptLanguage: string | null): string[] {
  if (!acceptLanguage) {
    return [];
  }

  // e.g., "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7"
  // -> [{ lang: "ja-JP", q: 1.0 }, { lang: "ja", q: 0.9 }, ...]
  const languages = acceptLanguage
    .split(",")
    .map((part) => {
      const [lang, qStr] = part.trim().split(";");
      const q = qStr ? parseFloat(qStr.replace("q=", "")) : 1.0;
      return { lang: lang.trim(), q };
    })
    .sort((a, b) => b.q - a.q)
    .map((item) => item.lang.toLowerCase());

  return languages;
}

/**
 * 言語コードの正規化
 * e.g., "ja-JP" -> "ja", "en-US" -> "en"
 */
export function normalizeLanguageCode(lang: string): string {
  return lang.split("-")[0].toLowerCase();
}

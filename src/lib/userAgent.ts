
export type TargetOS = 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Other';
export type TargetDevice = 'Mobile' | 'Desktop';

interface UserAgentContext {
  os: TargetOS;
  device: TargetDevice;
}

/**
 * リクエストヘッダーの User-Agent 文字列から OS と Device を判定する
 */
export function parseUserAgentContext(uaString: string | null): UserAgentContext {
  const ua = uaString || '';

  // 1. OSの判定 (Declarativeなマッピング)
  const getOS = (ua: string): TargetOS => {
    if (/Android/i.test(ua)) return 'Android';
    if (/Windows NT/i.test(ua)) return 'Windows';
    // Mac/iOSの判定を慎重に
    if (/iPad|iPhone|iPod/i.test(ua)) return 'iOS';
    if (/Macintosh|Mac OS X/i.test(ua)) {
      // iPadがMacintoshを名乗ることがあるので、Mobileが含まれていないかチェック
      if (/Mobile/i.test(ua)) return 'iOS';
      return 'macOS';
    }
    return 'Other';
  };


  // 2. デバイスの判定
  // ※ iOSとAndroid、または "Mobile" という文字列があればスマホとみなす
  const getDevice = (os: TargetOS, ua: string): TargetDevice => {
    if (os === 'iOS' || os === 'Android' || /Mobile/i.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  };

  const os = getOS(ua);
  return {
    os,
    device: getDevice(os, ua),
  };
}

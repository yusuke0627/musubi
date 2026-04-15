import { z } from 'zod';

/**
 * Publisher公開登録フォームのバリデーションスキーマ
 */
export const publisherRegistrationSchema = z.object({
  // 基本情報
  name: z.string().min(1, '媒体名は必須です'),
  category: z.string().optional(),
  
  // 連絡先
  email: z.string().email('有効なメールアドレスを入力してください'),
  phone: z.string().min(1, '電話番号は必須です'),
  address: z.string().min(1, '住所は必須です'),
  contact_name: z.string().min(1, '担当者名は必須です'),
  
  // 法人情報
  entity_type: z.enum(['individual', 'corporation']),
  
  // 振込先
  bank_name: z.string().min(1, '銀行名は必須です'),
  bank_branch: z.string().min(1, '支店名は必須です'),
  account_type: z.enum(['savings', 'checking']),
  account_number: z.string().min(1, '口座番号は必須です'),
  account_name: z.string().min(1, '口座名義は必須です'),
  
  // ログイン情報
  password: z.string().min(8, 'パスワードは8文字以上必要です'),
  confirm_password: z.string().min(1, 'パスワード確認は必須です'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'パスワードが一致しません',
  path: ['confirm_password'],
});

export type PublisherRegistrationInput = z.infer<typeof publisherRegistrationSchema>;

'use server';

import prisma from '@/lib/db';
import { publisherRegistrationSchema, PublisherRegistrationInput } from '@/lib/schemas/publisher';
import bcrypt from 'bcryptjs';
import { signIn } from '@/auth';

export interface RegistrationResult {
  success: boolean;
  error?: string;
  publisherId?: number;
}

/**
 * Publisher公開登録
 * - Publisher作成
 * - User作成（パスワードハッシュ化）
 * - 自動ログイン
 */
export async function registerPublisher(
  input: PublisherRegistrationInput
): Promise<RegistrationResult> {
  try {
    // バリデーション
    const validated = publisherRegistrationSchema.parse(input);

    // メール重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });
    if (existingUser) {
      return { success: false, error: 'このメールアドレスは既に登録されています' };
    }

    // Publisher作成
    const publisher = await prisma.publisher.create({
      data: {
        name: validated.name,
        category: validated.category || null,
        email: validated.email,
        phone: validated.phone,
        address: validated.address,
        contact_name: validated.contact_name,
        entity_type: validated.entity_type,
        bank_name: validated.bank_name,
        bank_branch: validated.bank_branch,
        account_type: validated.account_type,
        account_number: validated.account_number,
        account_name: validated.account_name,
        // デフォルト値
        rev_share: 0.7,
        min_payout_threshold: 5000,
        balance: 0,
        total_earnings: 0,
      },
    });

    // パスワードハッシュ化
    const hashedPassword = await bcrypt.hash(validated.password, 10);

    // User作成
    await prisma.user.create({
      data: {
        email: validated.email,
        password_hash: hashedPassword,
        role: 'publisher',
        linked_id: publisher.id,
      },
    });

    // 自動ログイン
    await signIn('credentials', {
      email: validated.email,
      password: validated.password,
      redirect: false,
    });

    return { success: true, publisherId: publisher.id };
  } catch (error) {
    console.error('[RegisterPublisher]', error);
    
    if (error instanceof Error && error.name === 'ZodError') {
      return { success: false, error: '入力内容を確認してください' };
    }
    
    return { success: false, error: '登録に失敗しました。時間をおいて再度お試しください。' };
  }
}

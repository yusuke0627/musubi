import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import sharp from "sharp";

// 許可する画像形式
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 1200; // 最大幅

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // multipart/form-data を解析
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const advertiserId = formData.get("advertiser_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!advertiserId) {
      return NextResponse.json({ error: "Advertiser ID is required" }, { status: 400 });
    }

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    // MIMEタイプチェック
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, GIF, WebP" },
        { status: 400 }
      );
    }

    // 拡張子チェック
    const originalName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => 
      originalName.endsWith(ext)
    );
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: "Invalid file extension" },
        { status: 400 }
      );
    }

    // ファイル名生成（タイムスタンプ + ランダム文字列）
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const extension = originalName.split('.').pop() || 'jpg';
    const filename = `${timestamp}_${random}.${extension}`;

    // 保存先ディレクトリ
    const uploadDir = join(process.cwd(), "public", "uploads", "ads", advertiserId);
    
    // ディレクトリが存在しない場合は作成
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // ファイルパス
    const filePath = join(uploadDir, filename);

    // ファイルをバッファに変換
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sharpで画像を処理（リサイズ & 圧縮）
    let processedBuffer: Buffer;
    
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // 幅がMAX_WIDTHを超える場合はリサイズ
      if (metadata.width && metadata.width > MAX_WIDTH) {
        processedBuffer = await image
          .resize(MAX_WIDTH, undefined, { 
            fit: "inside",
            withoutEnlargement: true 
          })
          .jpeg({ quality: 85 })
          .toBuffer();
      } else {
        // 圧縮のみ適用
        processedBuffer = await image
          .jpeg({ quality: 85 })
          .toBuffer();
      }
    } catch (sharpError) {
      // Sharp処理に失敗した場合は元のファイルを保存
      console.warn("Sharp processing failed, saving original:", sharpError);
      processedBuffer = buffer;
    }

    // ファイルを保存
    await writeFile(filePath, processedBuffer);

    // 公開パスを返す
    const publicPath = `/uploads/ads/${advertiserId}/${filename}`;

    return NextResponse.json({ 
      success: true,
      path: publicPath,
      filename: filename,
      size: processedBuffer.length
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// ファイルサイズ制限を設定
export const config = {
  api: {
    bodyParser: false,
  },
};

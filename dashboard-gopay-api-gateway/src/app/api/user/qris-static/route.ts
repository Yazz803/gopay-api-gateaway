import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-session';
import { getDb, schema, isDatabaseConfigured } from '@/lib/db';
import { eq } from 'drizzle-orm';
import {
  decodeQrCodeFromBuffer,
  parseQrisMerchantInfo,
  isValidQrisString,
} from '@/lib/qr-decoder';
import { encryptWithDek } from '@/lib/crypto/vault';
import { recordActivityLogToDb } from '@/lib/merchant-session-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!authUser.qrisStatic) {
      return NextResponse.json({
        success: true,
        hasQrisStatic: false,
        message: 'QRIS Statis belum diunggah.',
      });
    }

    const info = parseQrisMerchantInfo(authUser.qrisStatic);

    return NextResponse.json({
      success: true,
      hasQrisStatic: true,
      data: {
        raw: authUser.qrisStatic,
        merchantName: info.merchantName,
        city: info.city,
        postalCode: info.postalCode,
        acquirer: info.acquirer,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data QRIS statis', error: msg },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { success: false, message: 'Database PostgreSQL belum siap.' },
        { status: 500 }
      );
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'Koneksi database tidak tersedia.' },
        { status: 500 }
      );
    }

    let qrisString: string | null = null;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, message: 'File foto QRIS statis wajib diunggah.' },
          { status: 400 }
        );
      }

      // Check file size (max 8MB)
      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, message: 'Ukuran file foto terlalu besar (maksimal 8MB).' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Decode QR Code directly from image in memory
      qrisString = decodeQrCodeFromBuffer(buffer);

      if (!qrisString) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Tidak ditemukan kode QRIS yang valid pada foto. Pastikan gambar jelas, tidak buram, dan memuat kode QRIS.',
          },
          { status: 422 }
        );
      }
    } else {
      const body = await req.json().catch(() => ({}));
      qrisString = body.qrisString || body.qris_static || null;
    }

    if (!qrisString || !isValidQrisString(qrisString)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Format data QRIS tidak valid. Pastikan foto atau teks QRIS mengikuti standar resmi QRIS / EMVCo.',
        },
        { status: 400 }
      );
    }

    const cleanQris = qrisString.trim();
    const info = parseQrisMerchantInfo(cleanQris);

    let encryptedQris: string | null = null;
    if (authUser.unlockedDek) {
      try {
        encryptedQris = encryptWithDek(cleanQris, authUser.unlockedDek);
      } catch {
        // ignore
      }
    }

    // Save only decoded string to database
    await db
      .update(schema.usersTable)
      .set({
        qrisStatic: cleanQris,
        encryptedQrisStatic: encryptedQris,
        updatedAt: new Date(),
      })
      .where(eq(schema.usersTable.id, authUser.id));

    // Record activity log
    await recordActivityLogToDb(authUser.id, {
      logType: 'QRIS_STATIC_CONFIGURED',
      message: `QRIS Statis toko berhasil dikonfigurasi: ${info.merchantName || 'Merchant'} (${info.city || 'ID'})`,
      details: {
        merchantName: info.merchantName,
        city: info.city,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Foto QRIS Statis berhasil didecode dan disimpan ke database!',
      data: {
        raw: cleanQris,
        merchantName: info.merchantName,
        city: info.city,
        postalCode: info.postalCode,
        acquirer: info.acquirer,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Upload Static QRIS Error]:', msg);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses foto QRIS statis.', error: msg },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ success: false, message: 'Database error' }, { status: 500 });
    }

    await db
      .update(schema.usersTable)
      .set({
        qrisStatic: null,
        encryptedQrisStatic: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.usersTable.id, authUser.id));

    await recordActivityLogToDb(authUser.id, {
      logType: 'QRIS_STATIC_REMOVED',
      message: 'QRIS Statis toko telah dihapus oleh pengguna.',
    });

    return NextResponse.json({
      success: true,
      message: 'Data QRIS Statis toko berhasil dihapus.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus QRIS statis.', error: msg },
      { status: 500 }
    );
  }
}

/**
 * ADMIN — POST /api/admin/upload (multipart/form-data: file, folder?)
 * StorageProvider (local en dev → S3/Cloudinary en v2). Devuelve la URL pública.
 */
import type { NextRequest } from 'next/server'
import { ok, runApi, HttpError } from '@/lib/api-helpers'
import { requireUser } from '@/infrastructure/auth-guard'
import { StorageError, storage } from '@/infrastructure/storage'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  return runApi(async () => {
    const user = await requireUser(req, ['OWNER', 'STAFF'])
    if (!user.tenantId) throw new HttpError(400, 'NO_TENANT', 'Usuario sin tenant.')

    const form = await req.formData().catch(() => null)
    if (!form) throw new HttpError(400, 'BAD_FORM', 'Se esperaba multipart/form-data con "file".')

    const file = form.get('file')
    if (!(file instanceof File)) throw new HttpError(400, 'NO_FILE', 'Campo "file" requerido.')
    const folderRaw = form.get('folder')
    const folder = typeof folderRaw === 'string' ? folderRaw : undefined

    try {
      const stored = await storage.save({ tenantId: user.tenantId, file, folder })
      return ok(stored, undefined, 201)
    } catch (err) {
      if (err instanceof StorageError) throw new HttpError(400, 'STORAGE_ERROR', err.message)
      throw err
    }
  })
}

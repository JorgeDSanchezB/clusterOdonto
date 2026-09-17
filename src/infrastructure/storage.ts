/**
 * INFRAESTRUCTURA — Storage de archivos con interfaz intercambiable.
 * DEV: LocalStorageProvider escribe en /public/uploads/[tenant]/.
 * v2: S3StorageProvider / CloudinaryProvider implementando la misma interfaz.
 */
import { randomUUID } from 'crypto'
import { mkdir, writeFile, unlink } from 'fs/promises'
import path from 'path'
import { UPLOAD_ALLOWED_MIME, UPLOAD_MAX_BYTES } from '@/lib/constants'

export interface StoredFile {
  url: string // URL pública relativa, ej: /uploads/<tenant>/<file>.jpg
  bytes: number
  contentType: string
}

export interface StorageProvider {
  readonly name: string
  save(input: { tenantId: string; file: File; folder?: string }): Promise<StoredFile>
  remove(url: string): Promise<void>
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StorageError'
  }
}

/** Almacenamiento local en dev: /public/uploads/[tenant]/… */
export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local'

  private resolvePublicDir(tenantId: string, folder?: string): string {
    // Solo se permite un segmento extra simple (sin rutas arbitrarias).
    const safeFolder = folder && /^[a-z0-9-]{1,24}$/.test(folder) ? folder : ''
    return path.join(process.cwd(), 'public', 'uploads', tenantId, safeFolder)
  }

  async save({ tenantId, file, folder }: { tenantId: string; file: File; folder?: string }): Promise<StoredFile> {
    if (!UPLOAD_ALLOWED_MIME.includes(file.type)) {
      throw new StorageError(`Tipo no permitido: ${file.type}. Usa PNG, JPG, WEBP o SVG.`)
    }
    if (file.size <= 0 || file.size > UPLOAD_MAX_BYTES) {
      throw new StorageError('La imagen supera el límite de 4 MB.')
    }
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const filename = `${randomUUID()}.${ext || 'jpg'}`
    const dir = this.resolvePublicDir(tenantId, folder)
    await mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, filename), buffer)
    const publicPath = path.posix.join(
      '/uploads',
      tenantId,
      folder && /^[a-z0-9-]{1,24}$/.test(folder) ? folder : '',
      filename,
    )
    return { url: publicPath, bytes: buffer.byteLength, contentType: file.type }
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith('/uploads/')) return // no tocamos nada fuera de uploads
    const abs = path.join(process.cwd(), 'public', url)
    try {
      await unlink(abs)
    } catch {
      // tolerante: borrar un archivo inexistente no debe romper nada
    }
  }
}

/** Proveedor activo (v2: conmutarlo por S3 sin tocar casos de uso). */
export const storage: StorageProvider = new LocalStorageProvider()

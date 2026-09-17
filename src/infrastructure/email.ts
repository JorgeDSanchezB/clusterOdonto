/**
 * INFRAESTRUCTURA — Email con interfaz intercambiable.
 * DEV: ConsoleEmailProvider (log + preview para el panel).
 * PRODUCCIÓN: SmtpEmailProvider (requiere variables de entorno SMTP).
 */
export interface EmailMessage {
  to: string
  subject: string
  body: string
  replyTo?: string
  meta?: Record<string, unknown>
}

export interface EmailSendResult {
  provider: string
  sentAt: string
  /** Preview que la UI puede mostrar (modo auditoría del dueño). */
  preview: { to: string; subject: string; body: string }
}

export interface EmailProvider {
  readonly name: string
  send(msg: EmailMessage): Promise<EmailSendResult>
}

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console'

  async send(msg: EmailMessage): Promise<EmailSendResult> {
    console.log(
      `\n📧 [ConsoleEmailProvider] ───────────────────────────────\n` +
        `Para:      ${msg.to}\n` +
        `Asunto:    ${msg.subject}\n` +
        `${msg.replyTo ? `Responder: ${msg.replyTo}\n` : ''}` +
        `─────────────────────────────────────────────────────────\n` +
        `${msg.body}\n` +
        `─────────────────────────────────────────────────────────\n`,
    )
    return {
      provider: this.name,
      sentAt: new Date().toISOString(),
      preview: { to: msg.to, subject: msg.subject, body: msg.body },
    }
  }
}

/** Stub listo para producción: activa con SMTP_* en .env (v2: nodemailer). */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp'

  async send(msg: EmailMessage): Promise<EmailSendResult> {
    if (!process.env.SMTP_HOST) {
      throw new Error('SmtpEmailProvider requiere SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS en .env')
    }
    // v2: integrar nodemailer aquí. El contrato ya está definido.
    throw new Error('Envío SMTP no configurado en este entorno (usa ConsoleEmailProvider en dev).')
  }
}

/** Proveedor activo: console en dev, smtp si hay configuración. */
export const emailProvider: EmailProvider =
  process.env.EMAIL_PROVIDER === 'smtp' ? new SmtpEmailProvider() : new ConsoleEmailProvider()

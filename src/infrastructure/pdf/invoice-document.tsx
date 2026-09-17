/**
 * INFRAESTRUCTURA — Documento de factura con @react-pdf/renderer.
 * Profesional: logo, RUC, datos del paciente, detalle, IVA configurable y
 * numeración secuencial. NO es comprobante electrónico ante el SRI.
 * Se usa tanto en servidor (renderToBuffer) como en cliente (BlobProvider
 * para preview en el panel).
 */
import React from 'react'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { InvoiceEntity, TenantEntity } from '@/domain/entities'

export interface InvoiceDocumentProps {
  invoice: InvoiceEntity
  tenant: Pick<TenantEntity, 'name' | 'ruc' | 'address' | 'city' | 'phone' | 'email' | 'logoUrl'>
  /** Color primario del tema del tenant (hex) */
  primaryColor: string
}

const usd = (n: number) => `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`

function buildStyles(primary: string) {
  return StyleSheet.create({
    page: {
      size: 'A4',
      padding: 40,
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#1e293b',
      backgroundColor: '#ffffff',
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
    brandCol: { flexDirection: 'row', alignItems: 'center', maxWidth: 330 },
    logo: { width: 46, height: 46, marginRight: 10, objectFit: 'contain' },
    logoPlaceholder: {
      width: 46,
      height: 46,
      marginRight: 10,
      borderRadius: 23,
      backgroundColor: primary,
      color: '#ffffff',
      fontSize: 20,
      textAlign: 'center',
      paddingTop: 9,
    },
    brandName: { fontSize: 15, fontWeight: 'bold', color: primary },
    brandMeta: { fontSize: 8.5, color: '#64748b', marginTop: 3 },
    docCol: { alignItems: 'flex-end' },
    docTitle: { fontSize: 20, fontWeight: 'bold', color: primary, letterSpacing: 1 },
    docNumber: { fontSize: 11, marginTop: 4, color: '#334155' },
    docIssue: { fontSize: 8.5, color: '#64748b', marginTop: 2 },
    divider: { height: 2, backgroundColor: primary, marginVertical: 12 },
    sectionLabel: { fontSize: 8, textTransform: 'uppercase', letterSpacing: 1.2, color: '#94a3b8', marginBottom: 4 },
    billBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: '#f8fafc',
      borderLeftWidth: 3,
      borderLeftColor: primary,
      padding: 12,
      borderRadius: 4,
      marginBottom: 16,
    },
    billCol: { flex: 1 },
    billValue: { fontSize: 10.5, fontWeight: 'bold', color: '#0f172a' },
    billSub: { fontSize: 9, color: '#475569' },
    tableHeader: { flexDirection: 'row', backgroundColor: primary, color: '#ffffff', paddingVertical: 7, paddingHorizontal: 8, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
    th: { fontSize: 8.5, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 'bold' },
    thDesc: { flex: 4 },
    thQty: { width: 44, textAlign: 'center' },
    thPrice: { width: 90, textAlign: 'right' },
    thTotal: { width: 90, textAlign: 'right' },
    row: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
    rowDesc: { flex: 4, fontSize: 10 },
    rowQty: { width: 44, textAlign: 'center', fontSize: 10 },
    rowPrice: { width: 90, textAlign: 'right', fontSize: 10 },
    rowTotal: { width: 90, textAlign: 'right', fontSize: 10, fontWeight: 'bold' },
    totalsBox: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 },
    totalsCol: { width: 240 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 8 },
    totalLabel: { fontSize: 10, color: '#475569' },
    totalValue: { fontSize: 10, color: '#0f172a' },
    grandRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 8,
      backgroundColor: primary,
      color: '#ffffff',
      borderRadius: 4,
      marginTop: 6,
    },
    grandLabel: { fontSize: 11, fontWeight: 'bold' },
    grandValue: { fontSize: 12, fontWeight: 'bold' },
    footerNote: {
      position: 'absolute',
      bottom: 34,
      left: 40,
      right: 40,
      fontSize: 7.5,
      color: '#94a3b8',
      textAlign: 'center',
      lineHeight: 1.6,
    },
  })
}

export function InvoiceDocument({ invoice, tenant, primaryColor }: InvoiceDocumentProps) {
  const primary = /^#[0-9a-fA-F]{6}$/.test(primaryColor) ? primaryColor : '#0f766e'
  const s = buildStyles(primary)
  const issued = new Date(invoice.createdAt)

  return (
    <Document title={`Factura ${invoice.number}`} author={tenant.name}>
      <Page style={s.page}>
        {/* Encabezado */}
        <View style={s.headerRow} fixed>
          <View style={s.brandCol}>
            {tenant.logoUrl ? (
              <Image style={s.logo} src={tenant.logoUrl} alt={`Logo ${tenant.name}`} />
            ) : (
              <View style={s.logoPlaceholder}>🦷</View>
            )}
            <View>
              <Text style={s.brandName}>{tenant.name}</Text>
              <Text style={s.brandMeta}>
                RUC: {tenant.ruc || '—'}
                {tenant.address ? ` · ${tenant.address}${tenant.city ? `, ${tenant.city}` : ''}` : ''}
              </Text>
              <Text style={s.brandMeta}>
                {[tenant.phone, tenant.email].filter(Boolean).join(' · ') || 'Odontología integral'}
              </Text>
            </View>
          </View>
          <View style={s.docCol}>
            <Text style={s.docTitle}>FACTURA</Text>
            <Text style={s.docNumber}>{invoice.number}</Text>
            <Text style={s.docIssue}>Emitida: {issued.toLocaleDateString('es-EC')}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* Datos del paciente */}
        <View style={s.billBox}>
          <View style={s.billCol}>
            <Text style={s.sectionLabel}>Facturar a</Text>
            <Text style={s.billValue}>{invoice.customerName}</Text>
            <Text style={s.billSub}>{invoice.customerEmail || 'Paciente'}</Text>
          </View>
          <View style={s.billCol}>
            <Text style={s.sectionLabel}>Documento</Text>
            <Text style={s.billValue}>{invoice.orderId ? 'Pedido web' : 'Venta directa'}</Text>
            <Text style={s.billSub}>{invoice.orderId ? `Ref: ${invoice.orderId.slice(0, 8).toUpperCase()}` : '—'}</Text>
          </View>
        </View>

        {/* Detalle */}
        <Text style={s.sectionLabel}>Detalle de servicios</Text>
        <View>
          <View style={s.tableHeader}>
            <Text style={[s.th, s.thDesc]}>Descripción</Text>
            <Text style={[s.th, s.thQty]}>Cant.</Text>
            <Text style={[s.th, s.thPrice]}>P. Unitario</Text>
            <Text style={[s.th, s.thTotal]}>Total</Text>
          </View>
          {invoice.items.length === 0 ? (
            <View style={s.row}>
              <Text style={s.rowDesc}>—</Text>
            </View>
          ) : (
            invoice.items.map((item, i) => (
              <View key={i} style={s.row}>
                <Text style={s.rowDesc}>{item.description}</Text>
                <Text style={s.rowQty}>{item.qty}</Text>
                <Text style={s.rowPrice}>{usd(item.unitPrice)}</Text>
                <Text style={s.rowTotal}>{usd(item.total)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Totales */}
        <View style={s.totalsBox}>
          <View style={s.totalsCol}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{usd(invoice.subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>IVA ({invoice.ivaRate}%)</Text>
              <Text style={s.totalValue}>{usd(invoice.ivaAmount)}</Text>
            </View>
            <View style={s.grandRow}>
              <Text style={s.grandLabel}>TOTAL</Text>
              <Text style={s.grandValue}>{usd(invoice.total)}</Text>
            </View>
          </View>
        </View>

        {/* Nota legal */}
        <Text style={s.footerNote} fixed>
          Documento comercial interno para contabilidad y entrega al paciente. NO es un comprobante
          electrónico válido ante el SRI.{'\n'}
          {tenant.name} · {tenant.phone ?? ''} {tenant.email ? `· ${tenant.email}` : ''}
        </Text>
      </Page>
    </Document>
  )
}

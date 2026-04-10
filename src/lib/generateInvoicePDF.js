/**
 * generateInvoicePDF
 *
 * Generates a professional invoice PDF using jsPDF draw primitives only.
 * Zero DOM / window / html2canvas dependencies — safe for future React Native port.
 * To port to mobile: replace this file with an expo-print equivalent
 * that accepts the same invoiceData shape.
 *
 * @param {Object} invoiceData
 * @param {Object} invoiceData.business   - { name, logo_url, address, phone, email, store_whatsapp }
 * @param {Object} invoiceData.customer   - { name, phone, address }
 * @param {Object} invoiceData.invoice    - { invoice_number, created_at, notes, status }
 * @param {Object} invoiceData.order      - { order_number, order_source }
 * @param {Array}  invoiceData.items      - [{ product_name, variant_name, quantity, unit_price, subtotal }]
 * @param {Object} invoiceData.amounts    - { subtotal, amount_paid, balance_due }
 */

import jsPDF from 'jspdf'

// ── Colours ───────────────────────────────────────────────────────────────────
const BLUE = [37, 99, 235]   // blue-600
const DARK = [17, 24, 39]    // gray-900
const MID = [107, 114, 128] // gray-500
const LIGHT = [243, 244, 246] // gray-100
const WHITE = [255, 255, 255]
const GREEN = [22, 163, 74]   // green-600
const RED = [220, 38, 38]   // red-600

// ── Helpers ───────────────────────────────────────────────────────────────────
function setColor(doc, rgb, type = 'text') {
    if (type === 'fill') doc.setFillColor(...rgb)
    else if (type === 'draw') doc.setDrawColor(...rgb)
    else doc.setTextColor(...rgb)
}

function formatCurrency(amount) {
    return `N${Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'long', year: 'numeric'
    })
}

// Load image from URL as base64 — web only, returns null if fails
async function loadImageAsBase64(url) {
    try {
        const response = await fetch(url)
        const blob = await response.blob()
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateInvoicePDF(invoiceData) {
    const { business, customer, invoice, order, items, amounts } = invoiceData

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = 210  // page width
    const margin = 14
    const contentW = W - margin * 2

    // ── HEADER BAND ───────────────────────────────────────────────────────────
    setColor(doc, BLUE, 'fill')
    doc.rect(0, 0, W, 38, 'F')

    // Logo
    let logoLoaded = false
    if (business.logo_url) {
        const logoBase64 = await loadImageAsBase64(business.logo_url)
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'PNG', margin, 7, 22, 22)
                logoLoaded = true
            } catch { /* skip if image format unsupported */ }
        }
    }

    // Business name in header
    const nameX = logoLoaded ? margin + 26 : margin
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    setColor(doc, WHITE)
    doc.text(business.name ?? 'Business', nameX, 17)

    // Tagline / description under name
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setColor(doc, [200, 210, 255])
    if (business.address) {
        doc.text(business.address, nameX, 23)
    }

    // INVOICE label — right side of header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    setColor(doc, WHITE)
    doc.text('INVOICE', W - margin, 17, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    setColor(doc, [200, 210, 255])
    doc.text(invoice.invoice_number, W - margin, 24, { align: 'right' })

    // ── BUSINESS CONTACT BAR ──────────────────────────────────────────────────
    setColor(doc, [30, 64, 175], 'fill') // slightly darker blue
    doc.rect(0, 38, W, 10, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    setColor(doc, [199, 210, 254])

    const contactParts = []
    if (business.phone) contactParts.push(`📞 ${business.phone}`)
    if (business.email) contactParts.push(`✉ ${business.email}`)
    if (business.store_whatsapp) contactParts.push(`💬 ${business.store_whatsapp}`)
    doc.text(contactParts.join('    '), margin, 44.5)

    // ── INVOICE META + CUSTOMER ───────────────────────────────────────────────
    let y = 58

    // Left: Bill To
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    setColor(doc, MID)
    doc.text('BILL TO', margin, y)

    // Right: Invoice details
    doc.text('INVOICE DETAILS', W - margin - 55, y)

    y += 5

    // Customer block
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setColor(doc, DARK)
    doc.text(customer.name ?? 'Customer', margin, y)

    // Invoice details block (right)
    const detailsX = W - margin - 55
    const detailRows = [
        ['Invoice No:', invoice.invoice_number],
        ['Date:', formatDate(invoice.created_at)],
        ['Order No:', order.order_number ?? '—'],
        ['Status:', invoice.status === 'paid' ? 'PAID' : 'PENDING'],
    ]

    let dy = y
    doc.setFontSize(8.5)
    detailRows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'normal')
        setColor(doc, MID)
        doc.text(label, detailsX, dy)

        doc.setFont('helvetica', 'bold')
        if (label === 'Status:') {
            setColor(doc, invoice.status === 'paid' ? GREEN : BLUE)
        } else {
            setColor(doc, DARK)
        }
        doc.text(value, detailsX + 28, dy)
        dy += 6
    })

    // Customer contact details
    y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    setColor(doc, MID)
    if (customer.phone) {
        doc.text(`Phone: ${customer.phone}`, margin, y)
        y += 5
    }
    if (customer.address) {
        const addressLines = doc.splitTextToSize(customer.address, 80)
        doc.text(addressLines, margin, y)
        y += addressLines.length * 5
    }

    y = Math.max(y, dy) + 8

    // ── ITEMS TABLE ───────────────────────────────────────────────────────────
    // Table header
    setColor(doc, DARK, 'fill')
    doc.rect(margin, y, contentW, 9, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    setColor(doc, WHITE)

    const col = {
        item: margin + 2,
        qty: margin + 95,
        price: margin + 118,
        subtotal: margin + contentW - 2,
    }

    doc.text('ITEM', col.item, y + 6)
    doc.text('QTY', col.qty, y + 6)
    doc.text('UNIT PRICE', col.price, y + 6)
    doc.text('SUBTOTAL', col.subtotal, y + 6, { align: 'right' })

    y += 9

    // Table rows
    items.forEach((item, index) => {
        const rowH = 9
        const isEven = index % 2 === 0

        // Row background
        setColor(doc, isEven ? WHITE : LIGHT, 'fill')
        doc.rect(margin, y, contentW, rowH, 'F')

        // Row border
        setColor(doc, [229, 231, 235], 'draw')
        doc.setLineWidth(0.2)
        doc.rect(margin, y, contentW, rowH, 'S')

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        setColor(doc, DARK)

        // Item name
        const itemLabel = item.variant_name
            ? `${item.product_name} (${item.variant_name})`
            : item.product_name
        const itemLines = doc.splitTextToSize(itemLabel, 88)
        doc.text(itemLines, col.item, y + 5.5)

        // Qty
        setColor(doc, MID)
        doc.text(String(item.quantity), col.qty, y + 5.5)

        // Unit price
        setColor(doc, DARK)
        doc.text(formatCurrency(item.unit_price), col.price, y + 5.5)

        // Subtotal
        doc.setFont('helvetica', 'bold')
        doc.text(formatCurrency(item.subtotal), col.subtotal, y + 5.5, { align: 'right' })

        y += rowH
    })

    // Delivery fee row (if customer pays it)
    if (amounts.delivery_cost > 0) {
        const rowH = 9
        setColor(doc, [249, 250, 251], 'fill')
        doc.rect(margin, y, contentW, rowH, 'F')
        setColor(doc, [229, 231, 235], 'draw')
        doc.setLineWidth(0.2)
        doc.rect(margin, y, contentW, rowH, 'S')

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.5)
        setColor(doc, MID)
        const deliveryLabel = amounts.delivery_courier
            ? `Delivery Fee (${amounts.delivery_courier})`
            : 'Delivery Fee'
        doc.text(deliveryLabel, col.item, y + 5.5)
        doc.text('—', col.qty, y + 5.5)
        doc.text('—', col.price, y + 5.5)
        doc.setFont('helvetica', 'bold')
        setColor(doc, DARK)
        doc.text(formatCurrency(amounts.delivery_cost), col.subtotal, y + 5.5, { align: 'right' })
        y += rowH
    }

    y += 4

    // ── TOTALS BLOCK ──────────────────────────────────────────────────────────
    const totalsX = W - margin - 70
    const totalsW = 70

    // Subtotal row
    setColor(doc, LIGHT, 'fill')
    doc.rect(totalsX, y, totalsW, 8, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    setColor(doc, MID)
    doc.text('Subtotal', totalsX + 3, y + 5.5)
    setColor(doc, DARK)
    doc.text(formatCurrency(amounts.subtotal), totalsX + totalsW - 3, y + 5.5, { align: 'right' })
    y += 8

    // Delivery row in totals (if applicable)
    if (amounts.delivery_cost > 0) {
        setColor(doc, LIGHT, 'fill')
        doc.rect(totalsX, y, totalsW, 8, 'F')
        doc.setFont('helvetica', 'normal')
        setColor(doc, MID)
        doc.text('Delivery', totalsX + 3, y + 5.5)
        setColor(doc, DARK)
        doc.text(formatCurrency(amounts.delivery_cost), totalsX + totalsW - 3, y + 5.5, { align: 'right' })
        y += 8
    }

    // Amount paid row
    setColor(doc, [240, 253, 244], 'fill') // green-50
    doc.rect(totalsX, y, totalsW, 8, 'F')
    doc.setFont('helvetica', 'normal')
    setColor(doc, GREEN)
    doc.text('Amount Paid', totalsX + 3, y + 5.5)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(amounts.amount_paid), totalsX + totalsW - 3, y + 5.5, { align: 'right' })
    y += 8

    // Balance due row
    const grandTotal = Number(amounts.subtotal) + (amounts.delivery_cost ?? 0)
    const isPaid = Number(amounts.balance_due) <= 0
    setColor(doc, isPaid ? [240, 253, 244] : [254, 242, 242], 'fill')
    doc.rect(totalsX, y, totalsW, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    setColor(doc, isPaid ? GREEN : RED)
    doc.text('Balance Due', totalsX + 3, y + 6.5)
    doc.text(
        isPaid ? 'FULLY PAID' : formatCurrency(amounts.balance_due),
        totalsX + totalsW - 3,
        y + 6.5,
        { align: 'right' }
    )
    y += 14

    // ── PAID STAMP ────────────────────────────────────────────────────────────
    if (invoice.status === 'paid') {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(36)
        setColor(doc, [187, 247, 208]) // green-200 — subtle
        doc.setGState(new doc.GState({ opacity: 0.4 }))
        doc.text('PAID', W / 2, y - 20, { align: 'center', angle: 15 })
        doc.setGState(new doc.GState({ opacity: 1 }))
    }

    // ── NOTES ─────────────────────────────────────────────────────────────────
    if (invoice.notes) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        setColor(doc, MID)
        doc.text('NOTES', margin, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        setColor(doc, DARK)
        const noteLines = doc.splitTextToSize(invoice.notes, contentW)
        doc.text(noteLines, margin, y)
        y += noteLines.length * 5 + 4
    }

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const pageH = 297
    setColor(doc, LIGHT, 'fill')
    doc.rect(0, pageH - 18, W, 18, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    setColor(doc, MID)
    doc.text(
        `Thank you for your business, ${customer.name?.split(' ')[0] ?? 'valued customer'}!`,
        W / 2,
        pageH - 11,
        { align: 'center' }
    )
    doc.setFontSize(7)
    setColor(doc, [156, 163, 175])
    doc.text('Generated by Vortex · vortex.app', W / 2, pageH - 6, { align: 'center' })

    // ── SAVE ──────────────────────────────────────────────────────────────────
    const fileName = `${invoice.invoice_number}-${(customer.name ?? 'invoice').replace(/\s+/g, '-')}.pdf`
    doc.save(fileName)
}
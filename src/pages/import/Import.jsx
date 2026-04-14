import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import PageWrapper from '../../components/layout/PageWrapper'
import * as XLSX from 'xlsx'

// ── Template definitions ──────────────────────────────────────────────────────

const TEMPLATES = {
    // ── SHARED ──
    products: {
        label: 'Products',
        icon: '📦',
        modes: ['retail', 'online_vendor'],
        columns: ['product_name', 'description', 'selling_price', 'cost_price', 'stock_quantity'],
        required: ['product_name', 'selling_price'],
        example: [
            ['Ankara Midi Dress', 'Beautiful ankara fabric dress', '15000', '8000', '20'],
            ['Canvas Sneakers', 'Unisex canvas shoes', '8500', '4500', '15'],
        ],
        notes: 'selling_price and cost_price are in Naira (numbers only, no ₦ symbol). stock_quantity defaults to 0 if empty.',
    },
    customers: {
        label: 'Customers',
        icon: '👥',
        modes: ['retail', 'online_vendor'],
        columns: ['full_name', 'phone', 'email'],
        required: ['full_name'],
        example: [
            ['Adaeze Okonkwo', '08012345678', 'adaeze@email.com'],
            ['Chidi Nwosu', '07098765432', ''],
        ],
        notes: 'phone and email are optional but phone helps avoid duplicates.',
    },
    // ── VENDOR ──
    vendor_orders: {
        label: 'Past Orders',
        icon: '🛍️',
        modes: ['online_vendor'],
        columns: ['order_date', 'customer_name', 'customer_phone', 'customer_address', 'product_name', 'quantity', 'unit_price', 'amount_paid', 'payment_method', 'order_source', 'notes'],
        required: ['customer_name', 'product_name', 'quantity', 'unit_price'],
        example: [
            ['2024-01-15', 'Amaka Eze', '08011112222', '5 Broad Street Lagos', 'Ankara Dress', '2', '15000', '30000', 'bank_transfer', 'whatsapp', ''],
            ['2024-01-15', 'Amaka Eze', '08011112222', '5 Broad Street Lagos', 'Canvas Shoes', '1', '8500', '', '', 'whatsapp', 'Size 42'],
            ['2024-01-20', 'Emeka Obi', '07033334444', '', 'Canvas Shoes', '1', '8500', '8500', 'cash', 'instagram', ''],
        ],
        notes: 'Multiple rows with the same customer_name + order_date are grouped into one order. amount_paid defaults to 0. payment_method: bank_transfer, cash, card, opay, palmpay, other. order_source: whatsapp, instagram, website, referral, direct, other.',
    },
    // ── RETAIL ──
    sales: {
        label: 'Past Sales',
        icon: '🧾',
        modes: ['retail'],
        columns: ['sale_date', 'customer_name', 'product_name', 'quantity', 'unit_price', 'payment_method', 'amount_paid', 'notes'],
        required: ['sale_date', 'product_name', 'quantity', 'unit_price'],
        example: [
            ['2024-01-15', 'Walk-in customer', 'Indomie Noodles', '5', '250', 'cash', '1250', ''],
            ['2024-01-15', 'John Doe', 'Coca Cola 50cl', '10', '300', 'transfer', '3000', 'Bulk purchase'],
        ],
        notes: 'sale_date format: YYYY-MM-DD. payment_method: cash, card, transfer, credit.',
    },
    expenses: {
        label: 'Expenses',
        icon: '💸',
        modes: ['retail'],
        columns: ['expense_date', 'category', 'description', 'amount', 'payment_method'],
        required: ['expense_date', 'amount'],
        example: [
            ['2024-01-10', 'Rent', 'January shop rent', '50000', 'transfer'],
            ['2024-01-12', 'Stock Purchase', 'Noodles restock', '25000', 'cash'],
        ],
        notes: 'expense_date format: YYYY-MM-DD. category is free text. amount in Naira numbers only.',
    },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadTemplate(type) {
    const tmpl = TEMPLATES[type]
    const rows = [tmpl.columns, ...tmpl.example]
    const ws = XLSX.utils.aoa_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, type)
    XLSX.writeFile(wb, `vortex-import-${type}-template.csv`, { bookType: 'csv' })
}

function parseDate(val) {
    if (!val) return null
    const d = new Date(val)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return null
}

function normalisePaymentMethod(val, methods) {
    if (!val) return methods[0]
    const v = val.toString().toLowerCase().trim()
    return methods.find(m => m === v || m.replace('_', '') === v.replace('_', '')) ?? methods[0]
}

function validateRows(rows, tmpl) {
    return rows.map((row, i) => {
        const errors = []
        tmpl.required.forEach(col => {
            if (!row[col] || String(row[col]).trim() === '') {
                errors.push(`${col} is required`)
            }
        })
            // Numeric checks
            ;['selling_price', 'cost_price', 'stock_quantity', 'quantity', 'unit_price', 'amount_paid', 'amount'].forEach(col => {
                if (col in row && row[col] !== '' && row[col] !== undefined) {
                    if (isNaN(Number(String(row[col]).replace(/,/g, '')))) {
                        errors.push(`${col} must be a number`)
                    }
                }
            })
        return { ...row, _rowIndex: i + 2, _errors: errors }
    })
}

// ── Group vendor order rows into orders ──────────────────────────────────────

function groupOrderRows(rows) {
    const groups = {}
    rows.forEach(row => {
        const key = `${row.customer_name?.trim()}_${row.order_date || 'nodate'}`
        if (!groups[key]) {
            groups[key] = {
                customer_name: row.customer_name?.trim() ?? '',
                customer_phone: row.customer_phone?.trim() || null,
                customer_address: row.customer_address?.trim() || null,
                order_date: row.order_date || null,
                amount_paid: 0,
                payment_method: row.payment_method || null,
                order_source: row.order_source || 'direct',
                notes: row.notes || null,
                items: [],
            }
        }
        groups[key].items.push({
            product_name: row.product_name?.trim() ?? '',
            quantity: Number(String(row.quantity).replace(/,/g, '')) || 1,
            unit_price: Number(String(row.unit_price).replace(/,/g, '')) || 0,
        })
        // Take first non-zero amount_paid
        if (!groups[key].amount_paid && row.amount_paid) {
            groups[key].amount_paid = Number(String(row.amount_paid).replace(/,/g, '')) || 0
        }
    })
    return Object.values(groups)
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Import() {
    const { profile } = useAuth()
    const navigate = useNavigate()
    const fileInputRef = useRef()

    const isVendor = profile?.businesses?.mode === 'online_vendor'

    const availableTypes = Object.entries(TEMPLATES)
        .filter(([, tmpl]) => {
            if (isCombo) {
                // Combo users get both retail AND vendor import types
                return tmpl.modes.includes('retail') || tmpl.modes.includes('online_vendor')
            }
            // Regular retail or vendor users get their respective types
            return tmpl.modes.includes(isVendor ? 'online_vendor' : 'retail')
        })
        .map(([key, tmpl]) => ({ key, ...tmpl }))

    const [activeType, setActiveType] = useState(availableTypes[0]?.key ?? 'products')
    const [stage, setStage] = useState('upload') // upload | preview | result
    const [rawRows, setRawRows] = useState([])
    const [validatedRows, setValidatedRows] = useState([])
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState(null)
    const [fileError, setFileError] = useState('')

    const tmpl = TEMPLATES[activeType]
    const errorRows = validatedRows.filter(r => r._errors.length > 0)
    const validRows = validatedRows.filter(r => r._errors.length === 0)
    const hasBlockingErrors = errorRows.length > 0

    function resetToUpload() {
        setStage('upload')
        setRawRows([])
        setValidatedRows([])
        setResult(null)
        setFileError('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    function switchType(type) {
        setActiveType(type)
        resetToUpload()
    }

    function handleFile(e) {
        const file = e.target.files[0]
        if (!file) return
        setFileError('')

        const reader = new FileReader()
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'binary', raw: false })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const data = XLSX.utils.sheet_to_json(ws, { defval: '' })

                if (data.length === 0) {
                    setFileError('The file appears to be empty.')
                    return
                }

                // Normalise column names — lowercase, trim, replace spaces with underscores
                const normalised = data.map(row => {
                    const norm = {}
                    Object.entries(row).forEach(([k, v]) => {
                        norm[k.toLowerCase().trim().replace(/\s+/g, '_')] = v
                    })
                    return norm
                })

                // Check required columns exist
                const firstRow = normalised[0]
                const missingCols = tmpl.required.filter(col => !(col in firstRow))
                if (missingCols.length > 0) {
                    setFileError(`Missing required columns: ${missingCols.join(', ')}. Please use the template.`)
                    return
                }

                const validated = validateRows(normalised, tmpl)
                setRawRows(normalised)
                setValidatedRows(validated)
                setStage('preview')
            } catch (err) {
                setFileError('Could not read file. Make sure it is a valid CSV or Excel file.')
            }
        }
        reader.readAsBinaryString(file)
    }

    async function handleImport() {
        setImporting(true)
        let imported = 0
        let skipped = 0
        const skipReasons = []

        try {
            const rows = validRows

            // ── PRODUCTS ──────────────────────────────────────────────────────
            if (activeType === 'products') {
                for (const row of rows) {
                    try {
                        const { data: prod, error: prodError } = await supabase
                            .from('products')
                            .insert({
                                business_id: profile.business_id,
                                name: row.product_name.trim(),
                                description: row.description?.trim() || null,
                                unit: 'piece',
                                is_active: true,
                            })
                            .select('id').single()
                        if (prodError) throw prodError

                        // Insert default variant
                        const { data: variant } = await supabase
                            .from('product_variants')
                            .insert({
                                product_id: prod.id,
                                business_id: profile.business_id,
                                name: 'Default',
                                selling_price: Number(String(row.selling_price).replace(/,/g, '')) || 0,
                                buying_price: Number(String(row.cost_price).replace(/,/g, '')) || 0,
                            })
                            .select('id').single()

                        if (variant && profile.branch_id) {
                            await supabase.from('stock_levels').insert({
                                business_id: profile.business_id,
                                branch_id: profile.branch_id,
                                variant_id: variant.id,
                                quantity: Number(String(row.stock_quantity).replace(/,/g, '')) || 0,
                                low_stock_threshold: 5,
                            })
                        }
                        imported++
                    } catch {
                        skipped++
                        skipReasons.push(`Row ${row._rowIndex}: product insert failed`)
                    }
                }
            }

            // ── CUSTOMERS ─────────────────────────────────────────────────────
            if (activeType === 'customers') {
                for (const row of rows) {
                    try {
                        const phone = row.phone?.trim() || null

                        // Check for duplicate phone
                        if (phone) {
                            const { data: existing } = await supabase
                                .from('customers')
                                .select('id')
                                .eq('business_id', profile.business_id)
                                .eq('phone', phone)
                                .maybeSingle()
                            if (existing) {
                                skipped++
                                skipReasons.push(`Row ${row._rowIndex}: customer with phone ${phone} already exists`)
                                continue
                            }
                        }

                        await supabase.from('customers').insert({
                            business_id: profile.business_id,
                            branch_id: isVendor ? null : profile.branch_id,
                            full_name: row.full_name.trim(),
                            phone: phone,
                            email: row.email?.trim() || null,
                        })
                        imported++
                    } catch {
                        skipped++
                        skipReasons.push(`Row ${row._rowIndex}: customer insert failed`)
                    }
                }
            }

            // ── VENDOR ORDERS ─────────────────────────────────────────────────
            if (activeType === 'vendor_orders') {
                const groups = groupOrderRows(rows)

                for (const group of groups) {
                    try {
                        const totalAmount = group.items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
                        const amountPaid = Math.min(group.amount_paid, totalAmount)
                        const paymentStatus = amountPaid <= 0 ? 'unpaid' : amountPaid >= totalAmount ? 'paid' : 'part_paid'

                        // Upsert customer
                        let customerId = null
                        if (group.customer_phone) {
                            const { data: existing } = await supabase
                                .from('customers')
                                .select('id')
                                .eq('business_id', profile.business_id)
                                .eq('phone', group.customer_phone)
                                .maybeSingle()
                            if (existing) {
                                customerId = existing.id
                            } else {
                                const { data: newC } = await supabase
                                    .from('customers')
                                    .insert({ business_id: profile.business_id, branch_id: null, full_name: group.customer_name, phone: group.customer_phone })
                                    .select('id').single()
                                customerId = newC?.id
                            }
                        }

                        // Generate order number
                        const { data: seqData } = await supabase.rpc('generate_order_number', { business_uuid: profile.business_id })

                        // Insert order
                        const { data: order, error: orderErr } = await supabase
                            .from('vendor_orders')
                            .insert({
                                business_id: profile.business_id,
                                order_number: seqData,
                                customer_id: customerId,
                                customer_name: group.customer_name,
                                customer_phone: group.customer_phone,
                                customer_address: group.customer_address,
                                order_source: normalisePaymentMethod(group.order_source, ['whatsapp', 'instagram', 'website', 'referral', 'direct', 'other']),
                                notes: group.notes,
                                total_amount: totalAmount,
                                amount_paid: amountPaid,
                                payment_status: paymentStatus,
                                payment_method: group.payment_method ? normalisePaymentMethod(group.payment_method, ['bank_transfer', 'cash', 'card', 'opay', 'palmpay', 'other']) : null,
                                status: 'completed',
                                created_at: group.order_date ? new Date(group.order_date).toISOString() : new Date().toISOString(),
                            })
                            .select('id').single()
                        if (orderErr) throw orderErr

                        // Insert items
                        await supabase.from('order_items').insert(
                            group.items.map(item => ({
                                order_id: order.id,
                                product_name: item.product_name,
                                unit_price: item.unit_price,
                                quantity: item.quantity,
                            }))
                        )

                        await supabase.from('order_status_history').insert({
                            order_id: order.id, status: 'completed',
                            note: 'Imported from historical records',
                        })

                        imported++
                    } catch (err) {
                        skipped++
                        skipReasons.push(`Order for "${group.customer_name}": ${err.message}`)
                    }
                }
            }

            // ── SALES (RETAIL) ────────────────────────────────────────────────
            if (activeType === 'sales') {
                for (const row of rows) {
                    try {
                        const saleDate = parseDate(row.sale_date)
                        if (!saleDate) { skipped++; skipReasons.push(`Row ${row._rowIndex}: invalid date`); continue }

                        const total = Number(String(row.unit_price).replace(/,/g, '')) * Number(String(row.quantity).replace(/,/g, ''))

                        const { data: sale } = await supabase
                            .from('sales')
                            .insert({
                                business_id: profile.business_id,
                                branch_id: profile.branch_id,
                                sale_number: `IMP-${Date.now()}-${imported}`,
                                total,
                                payment_method: normalisePaymentMethod(row.payment_method, ['cash', 'card', 'transfer', 'credit']),
                                status: 'completed',
                                notes: row.notes?.trim() || null,
                                created_at: new Date(saleDate).toISOString(),
                            })
                            .select('id').single()

                        imported++
                    } catch {
                        skipped++
                        skipReasons.push(`Row ${row._rowIndex}: sale insert failed`)
                    }
                }
            }

            // ── EXPENSES (RETAIL) ─────────────────────────────────────────────
            if (activeType === 'expenses') {
                for (const row of rows) {
                    try {
                        const expDate = parseDate(row.expense_date)
                        if (!expDate) { skipped++; skipReasons.push(`Row ${row._rowIndex}: invalid date`); continue }

                        await supabase.from('expenses').insert({
                            business_id: profile.business_id,
                            branch_id: profile.branch_id,
                            expense_date: expDate,
                            description: row.description?.trim() || row.category?.trim() || 'Imported expense',
                            amount: Number(String(row.amount).replace(/,/g, '')) || 0,
                            payment_method: normalisePaymentMethod(row.payment_method, ['cash', 'card', 'transfer', 'other']),
                        })
                        imported++
                    } catch {
                        skipped++
                        skipReasons.push(`Row ${row._rowIndex}: expense insert failed`)
                    }
                }
            }

            setResult({ imported, skipped, skipReasons })
            setStage('result')
        } catch (err) {
            setResult({ imported, skipped, skipReasons: [...skipReasons, `Unexpected error: ${err.message}`] })
            setStage('result')
        } finally {
            setImporting(false)
        }
    }

    return (
        <PageWrapper title="Import Data">

            {/* Type tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
                {availableTypes.map(type => (
                    <button
                        key={type.key}
                        onClick={() => switchType(type.key)}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeType === type.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'}`}
                    >
                        <span>{type.icon}</span> {type.label}
                    </button>
                ))}
            </div>

            {/* ── UPLOAD STAGE ── */}
            {stage === 'upload' && (
                <div className="max-w-xl space-y-5">

                    {/* Info card */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
                        <p className="text-sm font-semibold text-blue-800">
                            {tmpl.icon} Import {tmpl.label}
                        </p>
                        <p className="text-xs text-blue-700 leading-relaxed">{tmpl.notes}</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <span className="text-xs text-blue-600 font-medium">Required columns:</span>
                            {tmpl.required.map(c => (
                                <span key={c} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">{c}</span>
                            ))}
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
                        <span className="text-lg shrink-0">⚠️</span>
                        <p className="text-xs text-amber-800 leading-relaxed">
                            Imported historical records are for record-keeping only. They will not affect current inventory stock levels or trigger any automated actions.
                        </p>
                    </div>

                    {/* Download template */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">Step 1 — Download the template</h3>
                        <p className="text-xs text-gray-500">
                            Fill in the template with your existing records. You can use Excel, Google Sheets, or any spreadsheet app.
                        </p>
                        <button
                            onClick={() => downloadTemplate(activeType)}
                            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                        >
                            ⬇️ Download {tmpl.label} Template (.csv)
                        </button>
                    </div>

                    {/* Upload */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
                        <h3 className="text-sm font-semibold text-gray-900">Step 2 — Upload your filled file</h3>
                        <p className="text-xs text-gray-500">Supports .csv and .xlsx files.</p>

                        {fileError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                <p className="text-xs text-red-600">{fileError}</p>
                            </div>
                        )}

                        <label className="block w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition">
                            <span className="text-3xl block mb-2">📂</span>
                            <p className="text-sm font-medium text-gray-700">Click to select your file</p>
                            <p className="text-xs text-gray-400 mt-1">or drag and drop here</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                onChange={handleFile}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>
            )}

            {/* ── PREVIEW STAGE ── */}
            {stage === 'preview' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900">
                                Preview — {rawRows.length} row{rawRows.length !== 1 ? 's' : ''} found
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {validRows.length} ready to import
                                {errorRows.length > 0 && ` · ${errorRows.length} with errors (will be skipped)`}
                            </p>
                        </div>
                        <button onClick={resetToUpload} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
                            ← Choose different file
                        </button>
                    </div>

                    {/* Error summary */}
                    {errorRows.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                            <p className="text-sm font-semibold text-red-700">⚠️ {errorRows.length} row{errorRows.length !== 1 ? 's' : ''} have errors and will be skipped:</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {errorRows.map(row => (
                                    <p key={row._rowIndex} className="text-xs text-red-600">
                                        Row {row._rowIndex}: {row._errors.join(', ')}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Preview table */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="text-left px-3 py-2.5 text-gray-500 font-semibold w-8">#</th>
                                        {tmpl.columns.map(col => (
                                            <th key={col} className="text-left px-3 py-2.5 text-gray-500 font-semibold whitespace-nowrap">
                                                {col}
                                                {tmpl.required.includes(col) && <span className="text-red-400 ml-0.5">*</span>}
                                            </th>
                                        ))}
                                        <th className="text-left px-3 py-2.5 text-gray-500 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {validatedRows.slice(0, 50).map(row => (
                                        <tr key={row._rowIndex} className={row._errors.length > 0 ? 'bg-red-50' : ''}>
                                            <td className="px-3 py-2 text-gray-400">{row._rowIndex}</td>
                                            {tmpl.columns.map(col => (
                                                <td key={col} className="px-3 py-2 text-gray-700 max-w-32 truncate" title={String(row[col] ?? '')}>
                                                    {String(row[col] ?? '')}
                                                </td>
                                            ))}
                                            <td className="px-3 py-2">
                                                {row._errors.length > 0 ? (
                                                    <span className="text-red-500 font-medium">✕ Skip</span>
                                                ) : (
                                                    <span className="text-green-600 font-medium">✓ Import</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {validatedRows.length > 50 && (
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
                                <p className="text-xs text-gray-400">Showing first 50 of {validatedRows.length} rows</p>
                            </div>
                        )}
                    </div>

                    {/* Import button */}
                    <div className="flex gap-3">
                        <button onClick={resetToUpload} className="border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={importing || validRows.length === 0}
                            className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {importing ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Importing...
                                </>
                            ) : (
                                `Import ${validRows.length} record${validRows.length !== 1 ? 's' : ''} →`
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ── RESULT STAGE ── */}
            {stage === 'result' && result && (
                <div className="max-w-md space-y-4">
                    <div className={`rounded-2xl p-6 text-center space-y-3 ${result.imported > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="text-4xl">{result.imported > 0 ? '🎉' : '😔'}</div>
                        <h2 className="text-lg font-bold text-gray-900">Import Complete</h2>
                        <div className="space-y-1">
                            {result.imported > 0 && (
                                <p className="text-sm text-green-700 font-semibold">
                                    ✓ {result.imported} record{result.imported !== 1 ? 's' : ''} imported successfully
                                </p>
                            )}
                            {result.skipped > 0 && (
                                <p className="text-sm text-amber-600">
                                    ⚠️ {result.skipped} record{result.skipped !== 1 ? 's' : ''} skipped
                                </p>
                            )}
                        </div>
                    </div>

                    {result.skipReasons.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Why records were skipped</p>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                                {result.skipReasons.map((r, i) => (
                                    <p key={i} className="text-xs text-gray-600">• {r}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={resetToUpload}
                            className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50 transition"
                        >
                            Import More
                        </button>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 transition"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </PageWrapper>
    )
}
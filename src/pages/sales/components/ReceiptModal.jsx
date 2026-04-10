import { useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'

export default function ReceiptModal({ sale, onClose }) {
    const { profile } = useAuth()
    const receiptRef = useRef()

    function handlePrint() {
        const content = receiptRef.current.innerHTML
        const win = window.open('', '_blank')
        win.document.write(`
      <html>
        <head>
          <title>Receipt ${sale.sale_number}</title>
          <style>
            body { font-family: monospace; font-size: 13px; padding: 20px; max-width: 300px; margin: 0 auto; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 4px 0; }
            .total { font-size: 15px; font-weight: bold; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `)
        win.document.close()
        win.print()
    }

    const date = new Date(sale.created_at).toLocaleString('en-NG', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Receipt</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                {/* Receipt preview */}
                <div className="px-6 py-4 max-h-96 overflow-y-auto">
                    <div ref={receiptRef} className="font-mono text-xs space-y-1">
                        <div className="center bold text-sm">{profile?.businesses?.name ?? 'Business'}</div>
                        <div className="center text-gray-500">{date}</div>
                        <div className="center text-gray-500">{sale.sale_number}</div>
                        {sale.customers && (
                            <div className="center text-gray-500">Customer: {sale.customers.full_name}</div>
                        )}
                        <div className="divider" />
                        {sale.sale_items?.map(item => (
                            <div key={item.id} className="row">
                                <span>{item.product_name} {item.variant_name !== 'Default' ? `(${item.variant_name})` : ''} x{item.quantity}</span>
                                <span>₦{Number(item.subtotal).toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="divider" />
                        <div className="row">
                            <span>Subtotal</span>
                            <span>₦{Number(sale.subtotal).toLocaleString()}</span>
                        </div>
                        {sale.discount > 0 && (
                            <div className="row">
                                <span>Discount</span>
                                <span>-₦{Number(sale.discount).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="row total">
                            <span>TOTAL</span>
                            <span>₦{Number(sale.total).toLocaleString()}</span>
                        </div>
                        <div className="row">
                            <span>Payment</span>
                            <span className="capitalize">{sale.payment_method}</span>
                        </div>
                        {sale.payment_method === 'cash' && sale.change_given > 0 && (
                            <div className="row">
                                <span>Change</span>
                                <span>₦{Number(sale.change_given).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="divider" />
                        <div className="center text-gray-500">Thank you for your patronage!</div>
                        <div className="center text-gray-400">Powered by Vortex</div>
                    </div>
                </div>

                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 transition"
                    >
                        🖨️ Print
                    </button>
                </div>
            </div>
        </div>
    )
}
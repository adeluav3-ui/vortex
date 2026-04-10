import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'

export default function BarcodeScanner({ onDetected, onClose }) {
    const videoRef = useRef(null)
    const readerRef = useRef(null)
    const [error, setError] = useState('')
    const [scanning, setScanning] = useState(true)
    const [lastScanned, setLastScanned] = useState('')

    useEffect(() => {
        startScanner()
        return () => stopScanner()
    }, [])

    async function startScanner() {
        try {
            const reader = new BrowserMultiFormatReader()
            readerRef.current = reader

            const devices = await BrowserMultiFormatReader.listVideoInputDevices()
            if (!devices.length) {
                setError('No camera found on this device.')
                return
            }

            // Prefer back camera on mobile
            const device = devices.find(d =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            ) ?? devices[devices.length - 1]

            await reader.decodeFromVideoDevice(
                device.deviceId,
                videoRef.current,
                (result, err) => {
                    if (result) {
                        const text = result.getText()
                        if (text && text !== lastScanned) {
                            setLastScanned(text)
                            setScanning(false)
                            onDetected(text)
                            // Resume scanning after 2 seconds
                            setTimeout(() => {
                                setScanning(true)
                                setLastScanned('')
                            }, 2000)
                        }
                    }
                    if (err && !(err instanceof NotFoundException)) {
                        console.warn('Scanner error:', err)
                    }
                }
            )
        } catch (err) {
            setError(`Camera error: ${err.message}`)
        }
    }

    function stopScanner() {
        if (readerRef.current) {
            readerRef.current.reset()
            readerRef.current = null
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center px-4">
            <div className="w-full max-w-sm bg-black rounded-2xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">📷</span>
                        <p className="text-sm font-semibold text-white">Scan Barcode</p>
                    </div>
                    <button
                        onClick={() => { stopScanner(); onClose() }}
                        className="text-gray-400 hover:text-white text-xl transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Camera view */}
                <div className="relative bg-black">
                    <video
                        ref={videoRef}
                        className="w-full aspect-square object-cover"
                        autoPlay
                        muted
                        playsInline
                    />

                    {/* Scanning overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-56 h-56">
                            {/* Corner borders */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-blue-400 rounded-tl-lg" style={{ borderWidth: '3px' }} />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-blue-400 rounded-tr-lg" style={{ borderWidth: '3px' }} />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-blue-400 rounded-bl-lg" style={{ borderWidth: '3px' }} />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-blue-400 rounded-br-lg" style={{ borderWidth: '3px' }} />

                            {/* Scanning line */}
                            {scanning && (
                                <div className="absolute left-2 right-2 h-0.5 bg-blue-400 opacity-80 animate-bounce" style={{ top: '50%' }} />
                            )}

                            {/* Success flash */}
                            {!scanning && (
                                <div className="absolute inset-0 bg-green-400 opacity-20 rounded-lg" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Status */}
                <div className="px-4 py-3 bg-gray-900 text-center">
                    {error ? (
                        <p className="text-sm text-red-400">{error}</p>
                    ) : !scanning ? (
                        <p className="text-sm text-green-400 font-medium">✓ Barcode detected!</p>
                    ) : (
                        <p className="text-sm text-gray-400">Point camera at a product barcode</p>
                    )}
                </div>

                {/* Manual entry fallback */}
                <div className="px-4 py-3 bg-gray-900 border-t border-gray-800">
                    <ManualEntry onDetected={onDetected} />
                </div>
            </div>
        </div>
    )
}

function ManualEntry({ onDetected }) {
    const [value, setValue] = useState('')

    function handleSubmit() {
        if (!value.trim()) return
        onDetected(value.trim())
        setValue('')
    }

    return (
        <div className="flex gap-2">
            <input
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Or type barcode / SKU manually"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
                onClick={handleSubmit}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
            >
                Add
            </button>
        </div>
    )
}
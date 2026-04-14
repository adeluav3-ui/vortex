// src/components/layout/HelpModal.jsx
import { useState } from 'react'

const VIDEO_LINKS = {
    retail: 'https://youtu.be/vf6kLcevGsE?si=LjpyZ0GofSlp52eN',
    online_vendor: 'https://youtu.be/y7DHbODHZ9I?si=ITIGrXsXtU1QX7SX',
    combo: 'https://youtu.be/_dQKDOZcan4?si=gJA--7qRnhIhCoQ7',
}

const MODE_NAMES = {
    retail: 'Retail Store',
    online_vendor: 'Online Vendor',
    combo: 'Combo (Store + Online)',
}

export default function HelpModal({ isOpen, onClose, businessMode }) {
    const [showVideo, setShowVideo] = useState(false)

    if (!isOpen) return null

    const videoUrl = VIDEO_LINKS[businessMode]
    const modeName = MODE_NAMES[businessMode] || 'Vortex'

    // Extract YouTube video ID for embedding
    const getYouTubeEmbedUrl = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
        const match = url.match(regExp)
        const videoId = (match && match[2].length === 11) ? match[2] : null
        return videoId ? `https://www.youtube.com/embed/${videoId}` : url
    }

    const embedUrl = getYouTubeEmbedUrl(videoUrl)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">How to use Vortex</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Guide for {modeName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!showVideo ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="text-6xl">🎬</div>
                            <h3 className="text-xl font-semibold text-gray-800">Watch Tutorial Video</h3>
                            <p className="text-sm text-gray-500 max-w-md mx-auto">
                                Learn how to manage your {modeName.toLowerCase()} business, handle orders, track inventory, and more.
                            </p>
                            <button
                                onClick={() => setShowVideo(true)}
                                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
                            >
                                <span>▶️</span> Watch Video
                            </button>
                        </div>
                    ) : (
                        <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
                            <iframe
                                src={`${embedUrl}?autoplay=1&rel=0`}
                                title={`Vortex tutorial for ${modeName}`}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
import { useState } from 'react'
import PageWrapper from '../../components/layout/PageWrapper'
import POS from './components/POS'
import SalesHistory from './components/SalesHistory'

export default function Sales() {
    const [view, setView] = useState('pos')
    const [refresh, setRefresh] = useState(0)

    function handleSaleComplete() {
        setRefresh(r => r + 1)
    }

    return (
        <PageWrapper title="Sales">
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setView('pos')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'pos' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    🧾 POS
                </button>
                <button
                    onClick={() => setView('history')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'history' ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    📋 Sales History
                </button>
            </div>

            {view === 'pos' && <POS onSaleComplete={handleSaleComplete} />}
            {view === 'history' && <SalesHistory refresh={refresh} />}
        </PageWrapper>
    )
}
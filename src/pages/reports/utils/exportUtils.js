export function exportToCSV(data, filename) {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const rows = data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

export function exportToPDF(tableId, title) {
    const table = document.getElementById(tableId)
    if (!table) return
    const win = window.open('', '_blank')
    win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: sans-serif; font-size: 12px; padding: 20px; }
          h2 { margin-bottom: 16px; color: #111; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; color: #6b7280; }
          td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
          p.meta { color: #9ca3af; font-size: 11px; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <p class="meta">Generated on ${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        ${table.outerHTML}
      </body>
    </html>
  `)
    win.document.close()
    win.print()
}
export function printDocument(innerHTML: string, title: string) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:11.5pt;line-height:1.75;color:#1F2937;background:#fff;padding:22mm 22mm 24mm;max-width:860px;margin:0 auto}
    h1{font-size:22pt;font-weight:700;color:#111827;margin-bottom:.6em;line-height:1.2}
    h2{font-size:16pt;font-weight:700;color:#111827;margin-top:2em;margin-bottom:.5em;line-height:1.3}
    h3{font-size:13pt;font-weight:700;color:#111827;margin-top:1.6em;margin-bottom:.4em}
    h4{font-size:11.5pt;font-weight:700;color:#374151;margin-top:1.2em;margin-bottom:.3em}
    p{margin-bottom:1em}
    strong{font-weight:700;color:#111827}
    em{font-style:italic}
    a{color:#334E68;text-decoration:underline}
    ul,ol{margin:.75em 0 .75em 1.6em;padding:0}
    li{margin-bottom:.3em}
    blockquote{border-left:4px solid #E2E8F0;background:#F8FAFC;margin:1.25em 0;padding:.75em 1em;border-radius:0 6px 6px 0;color:#4B5563}
    blockquote p:last-child{margin-bottom:0}
    hr{border:none;border-top:1px solid #E2E8F0;margin:1.75em 0}
    code{background:#F1F5F9;border:1px solid #E2E8F0;padding:2px 5px;border-radius:4px;font-family:'Courier New',Courier,monospace;font-size:10pt}
    pre{background:#F1F5F9;border:1px solid #E2E8F0;padding:1em 1.2em;border-radius:6px;overflow-x:auto;margin:1em 0}
    pre code{background:none;border:none;padding:0;font-size:9.5pt}
    table{border-collapse:collapse;width:100%;margin:1.25em 0;font-size:10.5pt}
    th{background:#334E68;color:#fff;padding:8px 12px;text-align:left;font-weight:600}
    td{padding:7px 12px;border:1px solid #E2E8F0}
    tr:nth-child(even) td{background:#F8FAFC}
    img{max-width:100%}
    @media print{body{padding:0}}
  </style>
</head>
<body>${innerHTML}</body>
</html>`)

  win.document.close()
  win.focus()
  // Small delay so the browser paints before opening the print dialog
  setTimeout(() => { win.print() }, 250)
}

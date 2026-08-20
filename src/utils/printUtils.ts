/**
 * Isolated Pure Print Engine for Matuki Business ERP
 * Renders the document in an isolated iframe with exact paper margins (A5 / A4 / Thermal)
 * Prevents background modal bleeding and page cut-offs.
 */

export interface PrintOptions {
  paperSize: 'A5' | 'A5_LANDSCAPE' | 'A4' | 'THERMAL';
  themeColor?: string;
  documentTitle?: string;
}

export function printIsolatedDocument(htmlContent: string, options: PrintOptions) {
  // Remove any existing print iframe
  const existingFrame = document.getElementById('matuki-print-frame');
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'matuki-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '800px';
  iframe.style.height = '1100px';
  iframe.style.border = '0';
  iframe.style.opacity = '0.01';
  iframe.style.zIndex = '-1';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const pageSizeCSS = 
    options.paperSize === 'A5' ? '@page { size: A5 portrait; margin: 6mm; }' :
    options.paperSize === 'A5_LANDSCAPE' ? '@page { size: A5 landscape; margin: 6mm; }' :
    options.paperSize === 'A4' ? '@page { size: A4 portrait; margin: 10mm; }' :
    '@page { size: 80mm auto; margin: 2mm; }';

  const fullHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${options.documentTitle || 'Print Document - Matuki Sweets'}</title>
        <style>
          ${pageSizeCSS}
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            background: #ffffff;
            color: #000000;
            font-size: ${options.paperSize === 'THERMAL' ? '12px' : '13px'};
            line-height: 1.35;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bill-box {
            width: 100%;
            max-width: ${options.paperSize === 'THERMAL' ? '300px' : options.paperSize === 'A5' ? '540px' : '720px'};
            margin: 0 auto;
            border: ${options.paperSize === 'THERMAL' ? 'none' : '1px solid #000000'};
            padding: ${options.paperSize === 'THERMAL' ? '6px' : '14px 18px'};
            border-radius: ${options.paperSize === 'THERMAL' ? '0' : '4px'};
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 4px 6px;
            vertical-align: top;
          }
          .font-mono {
            font-family: 'Courier New', Courier, monospace;
            font-weight: bold;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .border-top {
            border-top: 1px solid #000000;
          }
          .border-bottom {
            border-bottom: 1px solid #000000;
          }
          .border-double {
            border-top: 2px solid #000000;
          }
          .dotted-bottom {
            border-bottom: 1px dotted #666666;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
    </html>
  `;

  doc.open();
  doc.write(fullHTML);
  doc.close();

  // Trigger print after ensuring resources are loaded
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print failed, falling back to window.print', e);
      window.print();
    }
  }, 300);
}

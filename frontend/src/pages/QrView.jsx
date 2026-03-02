import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { useLocation } from 'react-router-dom';
import { Share2, Copy, Download } from 'lucide-react';
import Nav from '../components/Nav';

const QrView = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const value = params.get('value') || '';
  const title = params.get('title') || 'Scan QR Code';
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const handleDownload = () => {
    try {
      const svg = qrRef.current?.querySelector('svg');
      if (!svg) return;
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const qrSize = img.width; // original SVG width
        const scale = 4; // high-res
        const padding = 48 * scale * 0.5; // scaled padding
        const header = 70 * scale * 0.5; // header height for title
        const footer = 20 * scale * 0.5; // footer spacing
        const canvas = document.createElement('canvas');
        canvas.width = (qrSize + padding * 2) * scale;
        canvas.height = (qrSize + padding * 2 + header + footer) * scale;
        const ctx = canvas.getContext('2d');
        // Background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Card
        const cardX = 24 * scale;
        const cardY = 24 * scale;
        const cardW = canvas.width - 48 * scale;
        const cardH = canvas.height - 48 * scale;
        const radius = 24 * scale;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2 * scale;
        // Rounded rect path
        ctx.beginPath();
        ctx.moveTo(cardX + radius, cardY);
        ctx.arcTo(cardX + cardW, cardY, cardX + cardW, cardY + cardH, radius);
        ctx.arcTo(cardX + cardW, cardY + cardH, cardX, cardY + cardH, radius);
        ctx.arcTo(cardX, cardY + cardH, cardX, cardY, radius);
        ctx.arcTo(cardX, cardY, cardX + cardW, cardY, radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Title with icon
        const centerX = canvas.width / 2;
        ctx.fillStyle = '#111827';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${20 * scale}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
        ctx.fillText('FileShare', centerX, cardY + 32 * scale);
        ctx.font = `${16 * scale}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
        ctx.fillStyle = '#374151';
        ctx.fillText(title, centerX, cardY + 60 * scale);
        // Draw QR
        const qrX = centerX - (qrSize * scale) / 2;
        const qrY = cardY + 90 * scale;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, qrX, qrY, qrSize * scale, qrSize * scale);
        // Footer link (truncated preview)
        ctx.font = `${14 * scale}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
        ctx.fillStyle = '#6b7280';
        const preview = value.length > 64 ? value.slice(0, 64) + '…' : value;
        ctx.fillText(preview, centerX, qrY + qrSize * scale + 28 * scale);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'fileshare-qr.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, 'image/png');
      };
      img.src = url;
    } catch (e) {
      console.error('QR export failed', e);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Share2 className="h-7 w-7 text-blue-600" />
          <span className="text-2xl font-extrabold tracking-tight text-gray-900">FileShare</span>
        </div>
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-600">Scan this code with your phone to open the link.</p>
          </div>
          <div className="mt-5 flex items-center justify-center">
            <div className="rounded-xl border border-gray-200 bg-white p-4" ref={qrRef}>
              <QRCode value={value} size={320} level="M" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button onClick={handleCopy} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button onClick={handleDownload} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4" /> Download QR
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-gray-500 break-all">{value}</p>
        </div>
      </main>
    </div>
  );
};

export default QrView;

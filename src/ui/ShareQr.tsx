/** Código QR de la dirección pública del juego, dibujado como SVG con los colores del kit. */
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function ShareQr({ url, size = 180 }: { url: string; size?: number }) {
  const [svg, setSvg] = useState<string>('')
  useEffect(() => {
    let alive = true
    QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#2b2118', light: '#ffffff' } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''))
    return () => {
      alive = false
    }
  }, [url])
  if (!svg) return <div style={{ width: size, height: size }} className="rounded-2xl bg-white" aria-hidden="true" />
  return <div className="qr" style={{ width: size, height: size }} role="img" aria-label={`Código QR de ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
}

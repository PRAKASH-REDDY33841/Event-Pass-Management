const QRCode = require('qrcode');

/**
 * Generate a Base64 Data URL for a QR code
 */
async function generateQrDataUrl(data) {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a', // slate-900
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR data URL:', err);
    throw err;
  }
}

/**
 * Generate a PNG Buffer for inline email attachment
 */
async function generateQrBuffer(data) {
  try {
    return await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'M',
      type: 'png',
      margin: 2,
      width: 360,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR buffer:', err);
    throw err;
  }
}

module.exports = {
  generateQrDataUrl,
  generateQrBuffer,
};

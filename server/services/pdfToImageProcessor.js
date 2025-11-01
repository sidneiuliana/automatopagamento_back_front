const pdf2pic = require('pdf2pic');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

/**
 * Converte PDF para imagem e processa com OCR
 * @param {string} pdfPath - Caminho para o PDF
 * @returns {Promise<string>} - Texto extraído via OCR
 */
async function processPDFAsImage(pdfPath) {
  try {
    console.log(`🖼️ Convertendo PDF para imagem: ${pdfPath}`);

    // Configuração para conversão PDF -> imagem
    const convert = pdf2pic.fromPath(pdfPath, {
      density: 300,           // DPI alto para melhor qualidade
      saveFilename: "page",
      savePath: path.join(__dirname, '../temp'),
      format: "png",
      width: 2000,
      height: 2000
    });

    // Converter primeira página para imagem
    const result = await convert(1);

    console.log('Resultado da conversão:', result);

    if (!result.path) {
      throw new Error('Falha ao converter PDF para imagem');
    }

    // Ler imagem como base64
    const imageBuffer = fs.readFileSync(result.path);
    const base64 = imageBuffer.toString('base64');

    console.log(`✅ PDF convertido para imagem com sucesso`);

    // Processar imagem com OCR
    console.log(`🔍 Iniciando OCR na imagem convertida...`);
    const { data: { text } } = await Tesseract.recognize(
      `data:image/png;base64,${base64}`,
      'por',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    // Limpar imagem temporária
    fs.unlinkSync(result.path);

    console.log(`✅ OCR concluído. Texto extraído: ${text.length} caracteres`);
    return text;

  } catch (error) {
    console.error('Erro ao processar PDF como imagem:', error);
    throw new Error(`Falha ao processar PDF como imagem: ${error.message}`);
  }
}

module.exports = {
  processPDFAsImage
};

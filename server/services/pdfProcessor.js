const fs = require('fs');
const pdf = require('pdf-parse');

/**
 * Processa um PDF e extrai texto
 * @param {string} pdfPath - Caminho para o PDF
 * @returns {Promise<string>} - Texto extraído do PDF
 */
async function processPDF(pdfPath) {
  try {
    console.log(`Iniciando processamento do PDF: ${pdfPath}`);
    
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    console.log(`Texto extraído do PDF (${data.text.length} caracteres):`, data.text);
    
    // Se o texto extraído é muito pequeno, pode ser um PDF escaneado
    if (data.text.length < 50) {
      console.log(`⚠️ PDF com pouco texto extraído (${data.text.length} chars) - tentando OCR`);
      console.log(`📄 Páginas: ${data.numpages}`);
      console.log(`📋 Info do PDF:`, data.info);

      // Tentar OCR para PDFs com pouco texto
      const { processPDFAsImage } = require('./pdfToImageProcessor');
      try {
        const ocrText = await processPDFAsImage(pdfPath);
        console.log(`✅ OCR bem-sucedido. Texto OCR: ${ocrText.length} caracteres`);

        // Retornar resultado com texto OCR
        const result = {
          text: ocrText,
          pages: data.numpages,
          info: data.info,
          ocr: true
        };

        return JSON.stringify(result, null, 2);
      } catch (ocrError) {
        console.error('❌ Falha no OCR:', ocrError.message);
        console.log(`📋 PDF escaneado detectado. Usando informações do nome do arquivo e metadados.`);
      }
    }
    
    // Retorna informações adicionais se disponíveis
    const result = {
      text: data.text,
      pages: data.numpages,
      info: data.info
    };
    
    return JSON.stringify(result, null, 2);
  } catch (error) {
    console.error('Erro no processamento de PDF:', error);
    throw new Error(`Falha ao processar PDF: ${error.message}`);
  }
}

module.exports = {
  processPDF
};

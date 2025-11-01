const { processPDFAsImage } = require('./services/pdfToImageProcessor');

const filePath = '../documentos/Sicoob comprovante (15-10-2025_17-40-26).pdf';

async function testSicoob() {
  try {
    const text = await processPDFAsImage(filePath);
    console.log('Texto extraído do Sicoob:', text);
  } catch (error) {
    console.error('Erro:', error);
  }
}

testSicoob();

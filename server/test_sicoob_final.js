const { processPDF } = require('./services/pdfProcessor');

const filePath = './documentos/Sicoob comprovante (15-10-2025_17-40-26).pdf';

async function testSicoobFinal() {
  try {
    const result = await processPDF(filePath);
    console.log('Resultado final do processamento Sicoob:', result);
  } catch (error) {
    console.error('Erro:', error);
  }
}

testSicoobFinal();

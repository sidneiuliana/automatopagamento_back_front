const { parsePixData } = require('./services/pixParser');
const { processPDF } = require('./services/pdfProcessor');

const testFiles = [
  'documentos/Sicoob comprovante (15-10-2025_17-40-26).pdf', // Scanned PDF
  'documentos/Comprovante2.pdf', // Text-based PDF
  'documentos/Comprovante0910.pdf', // Another text-based PDF
  'documentos/2025-10-12_175742.pdf', // Itaú PDF
  'documentos/1760570227400.pdf' // Santander PDF
];

async function testPixParser() {
  for (const filename of testFiles) {
    try {
      console.log(`\n=== Testando arquivo: ${filename} ===`);

      // Primeiro processar o PDF
      console.log('Processando PDF...');
      const processedText = await processPDF(filename);
      console.log('Texto processado (primeiros 200 chars):', processedText.substring(0, 200) + '...');

      // Agora testar o parsePixData com o texto processado
      const result = parsePixData(processedText, filename);
      console.log('Resultado do parsePixData:', result);

    } catch (error) {
      console.error(`Erro no teste do arquivo ${filename}:`, error);
    }
  }
}

testPixParser();

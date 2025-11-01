const fs = require('fs');
const pdfParse = require('pdf-parse');

const testFiles = [
  'documentos/2025-10-12_175742.pdf',
  'documentos/1760570227400.pdf'
];

async function testAdditionalPDFs() {
  for (const filePath of testFiles) {
    try {
      console.log(`\n=== Testando PDF: ${filePath} ===`);
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      console.log('Texto extraído (primeiros 500 chars):', data.text.substring(0, 500));
      console.log('Número de páginas:', data.numpages);
    } catch (err) {
      console.error(`Erro ao processar ${filePath}:`, err);
    }
  }
}

testAdditionalPDFs();

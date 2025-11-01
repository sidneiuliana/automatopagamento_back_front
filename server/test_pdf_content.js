const fs = require('fs');
const pdfParse = require('pdf-parse');

const filePath = 'documentos/Comprovante2.pdf';

async function testPDF() {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    console.log('Texto extraído:', data.text);
    console.log('Número de páginas:', data.numpages);
  } catch (err) {
    console.error('Erro:', err);
  }
}

testPDF();

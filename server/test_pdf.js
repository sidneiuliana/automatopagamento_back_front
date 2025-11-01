const pdfParse = require('pdf-parse');
const fs = require('fs');

const filePath = '../documentos/Sicoob comprovante (15-10-2025_17-40-26).pdf';

try {
  const dataBuffer = fs.readFileSync(filePath);
  pdfParse(dataBuffer).then(data => {
    console.log('Texto extraído:', data.text);
    console.log('Número de páginas:', data.numpages);
  }).catch(err => {
    console.error('Erro:', err);
  });
} catch (err) {
  console.error('Erro ao ler o arquivo:', err);
}

const pdf2pic = require('pdf2pic');
const tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

const filePath = '../documentos/Sicoob comprovante (15-10-2025_17-40-26).pdf';

async function processPDF() {
  try {
    // Converter PDF para imagem
    const convert = pdf2pic.fromPath(filePath, {
      density: 200,           // higher dpi
      saveFilename: "page",
      savePath: "./temp",
      format: "png",
      width: 2000,
      height: 2000
    });

    const result = await convert(1); // converter página 1
    console.log('Imagem convertida:', result.path);

    // Usar Tesseract para OCR
    const { data: { text } } = await tesseract.recognize(result.path, 'por');
    console.log('Texto extraído via OCR:', text);

    // Limpar imagem temporária
    fs.unlinkSync(result.path);

  } catch (error) {
    console.error('Erro:', error);
  }
}

processPDF();

const pdf2pic = require('pdf2pic');

async function testPdf2pic() {
  try {
    const convert = pdf2pic.fromPath('./Sicoob comprovante (15-10-2025_17-40-26).pdf', {
      density: 300,
      saveFilename: "page",
      savePath: './temp',
      format: "png",
      width: 2000,
      height: 2000
    });

    const result = await convert(1);
    console.log('Resultado da conversão:', result);
  } catch (error) {
    console.error('Erro:', error);
  }
}

testPdf2pic();

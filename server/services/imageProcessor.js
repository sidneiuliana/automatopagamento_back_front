const Tesseract = require('tesseract.js');

/**
 * Processa uma imagem e extrai texto usando OCR
 * @param {string} imagePath - Caminho para a imagem
 * @returns {Promise<string>} - Texto extraído da imagem
 */
async function processImage(imagePath) {
  try {
    console.log(`Iniciando processamento OCR da imagem: ${imagePath}`);
    
    // Configuração do Tesseract para melhor reconhecimento de texto em português
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'por', // Português
      {
        // Parâmetros de configuração do Tesseract para melhorar a precisão
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZãÃáÁàÀâÂçÇéÉêÊíÍóÓôÔõÕúÚüÜ,.;:/-_()[]{}@#$%&* ',
        preserve_interword_spaces: '1',
        psm: 3, // Mudei para 3 para detecção automática de layout
        oem: 1, // Usar o motor LSTM que é mais moderno
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    
    console.log(`Texto extraído (${text.length} caracteres):`, text.substring(0, 200) + '...');
    return text;
  } catch (error) {
    console.error('Erro no processamento de imagem:', error);
    throw new Error(`Falha ao processar imagem: ${error.message}`);
  }
}

module.exports = {
  processImage
};

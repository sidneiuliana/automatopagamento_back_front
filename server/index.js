const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const chokidar = require('chokidar');
require('dotenv').config();
const databaseService = require('./services/databaseService');
const { processImage } = require('./services/imageProcessor');
const { processPDF } = require('./services/pdfProcessor');
const { parsePixData } = require('./services/pixParser');
const { savePixTransaction, getAllPixTransactions, createPixTransactionsNoProcessTable, checkIfFileExistsInNoProcessTable, updatePixTransactionNoProcess } = require('./services/databaseService');
const { writeDebugToFile } = require('./services/pixParser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../arquivos');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {

    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens (JPEG, PNG, GIF) e PDFs são permitidos!'));
    }
  }
});

// Endpoint para upload de arquivo único
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('Nenhum arquivo enviado.');
  }

  const filePath = req.file.path;
  console.log(`Arquivo recebido em: ${filePath}`);
  writeDebugToFile('upload_flow', `Arquivo ${req.file.originalname} recebido em: ${filePath}`);

  try {
    await processFile(filePath);
    res.status(200).send('Arquivo enviado e processado com sucesso!');
  } catch (error) {
    console.error('Erro ao processar arquivo após upload:', error);
    writeDebugToFile('upload_flow', `Erro ao processar arquivo ${req.file.originalname} após upload: ${error.message}`);
    res.status(500).send('Erro ao processar o arquivo.');
  }
});

// Armazenamento em memória dos dados processados
let processedData = [];

// Endpoint para upload manual de arquivos
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const results = [];
    
    for (const file of req.files) {
      try {
        let extractedText = '';
        
        if (file.mimetype.startsWith('image/')) {
          extractedText = await processImage(file.path);
        } else if (file.mimetype === 'application/pdf') {
          extractedText = await processPDF(file.path);
        }
        
        // Ensure extractedText is a plain string before passing to parsePixData
        let textToParse = extractedText;
        try {
          const parsed = JSON.parse(extractedText);
          if (parsed && typeof parsed.text === 'string') {
            textToParse = parsed.text;
          }
        } catch (e) {
          // Not a JSON string, use as is
        }

        const pixData = parsePixData(textToParse, path.basename(file.path));
        
        results.push({
          filename: file.originalname,
          type: file.mimetype,
          extractedText: textToParse, // Store the plain text
          pixData,
          processedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error(`Erro ao processar ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          type: file.mimetype,
          error: error.message,
          processedAt: new Date().toISOString()
        });
      }
    }
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para listar dados processados (do banco de dados)
app.get('/api/data', async (req, res) => {
  try {
    const pixTransactions = await databaseService.getProcessedPixTransactions();
    res.json(pixTransactions);
  } catch (error) {
    console.error('Erro ao buscar dados PIX:', error);
    res.status(500).json({ error: 'Erro ao buscar dados PIX' });
  }
});

// Endpoint para processar arquivos existentes na pasta
app.post('/process-folder', async (req, res) => {
  const folderPath = process.env.WATCH_FOLDER;
  if (!folderPath) {
    return res.status(500).json({ error: 'Pasta de monitoramento não configurada.' });
  }

  try {
    const files = await fs.promises.readdir(folderPath);
    const processPromises = files.map(async (file) => {
      const filePath = path.join(folderPath, file);
      const stats = await fs.promises.stat(filePath);
      if (stats.isFile()) {
        return processFile(filePath);
      }
      return Promise.resolve(); // Retorna uma promessa resolvida para diretórios
    });

    const results = await Promise.allSettled(processPromises); // Aguarda todas as promessas serem resolvidas
    const errors = results.filter(result => result.status === 'rejected');
    if (errors.length > 0) {
      console.error('Erros encontrados durante o processamento da pasta:', errors.map(err => err.reason));
      return res.status(500).json({ error: 'Alguns arquivos falharam ao processar.', details: errors.map(err => err.reason.message || err.reason) });
    }

    res.json({ success: true, message: 'Processamento da pasta concluído.' });
  } catch (error) {
    console.error('Erro ao processar pasta:', error);
    res.status(500).json({ error: 'Erro ao processar pasta.' });
  }
});

// Função para monitorar a pasta arquivos


// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  // Criar tabela pix_transactions_no_process ao iniciar o servidor
  console.log('DEBUG: Chamando createPixTransactionsNoProcessTable...');
  databaseService.createPixTransactionsNoProcessTable();
  console.log('DEBUG: createPixTransactionsNoProcessTable chamada.');
});

// Adicionar tratamento de exceções não capturadas
process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception:', err);
  process.exit(1);
});

async function processFile(filePath) {
  const filename = path.basename(filePath);
  console.log(`DEBUG: INICIO processFile para: ${filename}`); // NOVO LOG DE CONSOLE
  writeDebugToFile('process_file_flow', `DEBUG: INICIO processFile para: ${filename}`); // NOVO LOG DE DEBUG
  console.log(`Iniciando processamento do arquivo: ${filename}`);

  writeDebugToFile(filename, `DEBUG: Iniciando processFile para: ${filename}`);

  let extractedText = '';
  let pixData = {};

  try {
    // 1. Verificar se o arquivo já existe no banco de dados (tabela principal)
    writeDebugToFile(filename, `DEBUG: Antes de verificar existingTransaction para ${filename}.`); // NEW LOG
    const existingTransaction = await databaseService.getPixTransactionByFilename(filename);
    writeDebugToFile(filename, `DEBUG: existingTransaction para ${filename}: ${!!existingTransaction}`);

    // 2. Verificar se o arquivo já existe na tabela de não processados
    writeDebugToFile(filename, `DEBUG: Antes de verificar existingUnprocessedFile para ${filename}.`); // NEW LOG
    const existingUnprocessedFile = await checkIfFileExistsInNoProcessTable(filename);
    writeDebugToFile(filename, `DEBUG: existingUnprocessedFile para ${filename}: ${!!existingUnprocessedFile}`);

    if (existingUnprocessedFile) {
      console.log(`Arquivo ${filename} já existe na tabela de não processados. Pulando processamento.`);
      writeDebugToFile(filename, `DEBUG: Arquivo ${filename} já existe na tabela de não processados. Pulando processamento.`);
      return; // Não processar novamente se já estiver na tabela de não processados
    }

    if (existingTransaction) {
      console.log(`Arquivo ${filename} já existe no banco de dados. Re-processando com texto existente.`);
      writeDebugToFile(filename, `DEBUG: Arquivo ${filename} já existe no banco de dados. Re-processando com texto existente.`);
      extractedText = existingTransaction.extracted_text; // Usar o texto já extraído do banco
      // Não precisamos re-extrair do arquivo, apenas re-parsear
    } else {
      const fileExtension = path.extname(filePath).toLowerCase();
      console.log(`DEBUG: File extension for ${filename}: ${fileExtension}`);
      writeDebugToFile(filename, `DEBUG: File extension for ${filename}: ${fileExtension}`);

      if (fileExtension === '.pdf') {
        console.log(`DEBUG: Calling processPDF for ${filename}`);
        writeDebugToFile(filename, `DEBUG: Calling processPDF for ${filename}`);
        extractedText = await processPDF(filePath);
        console.log(`DEBUG: processPDF returned for ${filename}. Extracted text length: ${extractedText ? extractedText.length : 0}`);
        writeDebugToFile(filename, `DEBUG: processPDF returned for ${filename}. Extracted text length: ${extractedText ? extractedText.length : 0}`);
      } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExtension)) {
        console.log(`DEBUG: Calling processImage for ${filename}`);
        writeDebugToFile(filename, `DEBUG: Calling processImage for ${filename}`);
        extractedText = await processImage(filePath);
        console.log(`DEBUG: processImage returned for ${filename}. Extracted text length: ${extractedText ? extractedText.length : 0}`);
        writeDebugToFile(filename, `DEBUG: processImage returned for ${filename}. Extracted text length: ${extractedText ? extractedText.length : 0}`);
      } else {
        console.warn(`Tipo de arquivo não suportado: ${filename}`);
        writeDebugToFile(filename, `WARN: Tipo de arquivo não suportado: ${filename}`);
        return;
      }
    }

    writeDebugToFile(filename, `DEBUG: extractedText para ${filename} (após extração/recuperação): ${!!extractedText}`);

    if (extractedText) {
      writeDebugToFile(filename, `DEBUG: Entering extractedText block for ${filename}.`);
      console.log(`Texto extraído/recuperado de ${filename}:\n${extractedText.substring(0, 1000)}...`); // Log dos primeiros 1000 caracteres
      writeDebugToFile(filename, `DEBUG: Texto extraído/recuperado de ${filename}:\n${extractedText.substring(0, 1000)}...`);
      let textToParse = extractedText;
      try {
        const parsed = JSON.parse(extractedText);
        if (parsed && typeof parsed.text === 'string') {
          textToParse = parsed.text;
        }
      } catch (e) {
        // Not a JSON string, use as is
      }

      console.log(`DEBUG: Calling parsePixData for ${filename} with text length: ${textToParse.length}`);
      writeDebugToFile(filename, `DEBUG: Calling parsePixData for ${filename} with text length: ${textToParse.length}`);
      pixData = parsePixData(textToParse, filename);
      console.log(`DEBUG: pixData generated for ${filename}:`, pixData);
      writeDebugToFile(filename, `DEBUG: pixData generated for ${filename}: ${JSON.stringify(pixData)}`);
      pixData.filename = filename; // Adiciona o nome do arquivo aos dados PIX
      pixData.extractedText = textToParse; // Salva o texto extraído

      writeDebugToFile(filename, `DEBUG: Antes do bloco de decisão save/update para ${filename}.`); // NEW LOG
      writeDebugToFile(filename, `DEBUG: Reached save/update decision for ${filename}.`);
      const isFullyProcessed = Object.keys(pixData).length > 0 && pixData.data && pixData.valor && pixData.destinatario && pixData.banco && pixData.pagador && pixData.idTransacao;
      writeDebugToFile(filename, `DEBUG: isFullyProcessed condition for ${filename}: ${isFullyProcessed}`);
      writeDebugToFile(filename, `DEBUG: pixData.data: ${pixData.data}, pixData.valor: ${pixData.valor}, pixData.destinatario: ${pixData.destinatario}, pixData.banco: ${pixData.banco}, pixData.pagador: ${pixData.pagador}, pixData.idTransacao: ${pixData.idTransacao}`);
      if (isFullyProcessed) {
        writeDebugToFile(filename, `DEBUG: Condição de processamento completo atendida para ${filename}.`);
        if (existingTransaction) {
          // Atualizar a transação existente
          writeDebugToFile(filename, `DEBUG: Atualizando transação existente para ${filename}.`);
          await databaseService.updatePixTransaction(existingTransaction.id, pixData);
          console.log(`✅ Dados atualizados no banco para: ${filename}`);
          writeDebugToFile(filename, `DEBUG: Dados atualizados no banco para: ${filename}`);
        } else {
          // Salvar nova transação
          console.log(`DEBUG: Attempting to save new Pix transaction for ${filename}`);
          writeDebugToFile(filename, `DEBUG: Attempting to save new Pix transaction for ${filename}`);
          await databaseService.savePixTransaction(pixData);
          console.log(`✅ Dados salvos no banco para: ${filename}`);
          writeDebugToFile(filename, `DEBUG: Dados salvos no banco para: ${filename}`);
        }
      } else {
        writeDebugToFile(filename, `DEBUG: Condição de processamento completo NÃO atendida para ${filename}. Salvando em pix_transactions_no_process.`);
        // Salvar na tabela de não processados
        if (existingUnprocessedFile) {
          writeDebugToFile(filename, `DEBUG: Atualizando arquivo existente em pix_transactions_no_process para ${filename}.`);
          await databaseService.updatePixTransactionNoProcess(existingUnprocessedFile.id, pixData);
          console.log(`✅ Arquivo atualizado em pix_transactions_no_process para: ${filename}`);
          writeDebugToFile(filename, `DEBUG: Arquivo atualizado em pix_transactions_no_process para: ${filename}`);
        } else {
          console.log(`DEBUG: Attempting to save new Pix transaction to pix_transactions_no_process for ${filename}`);
          writeDebugToFile(filename, `DEBUG: Attempting to save new Pix transaction to pix_transactions_no_process for ${filename}`);
          await databaseService.savePixTransaction(pixData);
          console.log(`✅ Arquivo salvo em pix_transactions_no_process para: ${filename}`);
          writeDebugToFile(filename, `DEBUG: Arquivo salvo em pix_transactions_no_process para: ${filename}`);
        }
      }
    } else {
      console.warn(`⚠️ Nenhum texto extraído de: ${filename}`);
      writeDebugToFile(filename, `WARN: Nenhum texto extraído de: ${filename}`);
      // Se não extraiu texto, ainda tenta salvar com base no nome do arquivo se houver dados
      pixData = parsePixData('', filename); // Tenta extrair dados apenas do nome do arquivo
      if (Object.keys(pixData).length > 0 && pixData.data) { // Verifica se algum dado foi extraído do nome do arquivo
          pixData.filename = filename;
          pixData.extractedText = extractedText; // Pode ser vazio
          if (existingTransaction) {
            writeDebugToFile(filename, `DEBUG: Atualizando dados parciais (do nome do arquivo) para ${filename}.`);
            await databaseService.updatePixTransaction(existingTransaction.id, pixData);
            console.log(`✅ Dados parciais (do nome do arquivo) atualizados no banco para: ${filename}`);
            writeDebugToFile(filename, `DEBUG: Dados parciais (do nome do arquivo) atualizados no banco para: ${filename}`);
          } else {
            console.log(`DEBUG: Attempting to save partial Pix transaction for ${filename}`);
            writeDebugToFile(filename, `DEBUG: Attempting to save partial Pix transaction for ${filename}`);
            await databaseService.savePixTransaction(pixData);
            console.log(`✅ Dados parciais (do nome do arquivo) salvos no banco para: ${filename}`);
            writeDebugToFile(filename, `DEBUG: Dados parciais (do nome do arquivo) salvos no banco para: ${filename}`);
          }
      } else {
        console.warn(`❌ Não foi possível extrair dados suficientes do arquivo ou nome do arquivo para: ${filename}`);
        writeDebugToFile(filename, `WARN: Não foi possível extrair dados suficientes do arquivo ou nome do arquivo para: ${filename}`);
      }
    }
  } catch (error) {
    console.error(`Erro ao processar arquivo ${filename}:`, error);
    writeDebugToFile(filename, `ERROR: Erro ao processar arquivo ${filename}: ${error.message}`);
  }
}

// Endpoint para buscar dados de transações PIX não processadas
app.get('/api/unprocessed-data', async (req, res) => {
  try {
    const unprocessedPixData = await databaseService.getUnprocessedPixTransactions();
    res.json(unprocessedPixData);
  } catch (error) {
    console.error('Erro ao buscar dados de PIX não processados:', error);
    res.status(500).json({ error: 'Erro ao buscar dados de PIX não processados.' });
  }
});

// Endpoint temporário para listar apenas os nomes dos arquivos na tabela pix_transactions_no_process
app.get('/api/unprocessed-filenames', async (req, res) => {
  console.log('DEBUG: /api/unprocessed-filenames endpoint called.');
  try {
    const filenames = await databaseService.getFilenamesFromNoProcessTable();
    console.log('DEBUG: Filenames retrieved from databaseService.');
    res.json(filenames);
  } catch (error) {
    console.error('ERROR: Erro ao buscar nomes de arquivos não processados:', error);
    res.status(500).json({ error: 'Erro ao buscar nomes de arquivos não processados.' });
  }
});

// Endpoint temporário para deletar um arquivo da tabela pix_transactions_no_process
app.delete('/api/delete-unprocessed-file', async (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'Nome do arquivo não fornecido.' });
  }
  console.log(`DEBUG: Endpoint /api/delete-unprocessed-file called for filename: ${filename}`);
  try {
    const result = await databaseService.deleteFileFromNoProcessTable(filename);
    if (result.affectedRows > 0) {
      res.json({ success: true, message: `Arquivo ${filename} removido da tabela de não processados.`, affectedRows: result.affectedRows });
    } else {
      res.json({ success: false, message: `Arquivo ${filename} não encontrado na tabela de não processados.`, affectedRows: result.affectedRows });
    }
  } catch (error) {
    console.error(`ERROR: Erro ao deletar arquivo ${filename} da tabela de não processados:`, error);
    res.status(500).json({ error: 'Erro interno do servidor ao deletar arquivo.' });
  }
});

// Endpoint para verificar se um arquivo existe na tabela pix_transactions
app.get('/api/check-file-exists', async (req, res) => {
  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'Nome do arquivo não fornecido.' });
  }
  console.log(`DEBUG: Endpoint /api/check-file-exists called for filename: ${filename}`);
  try {
    const exists = await databaseService.checkIfFileExists(filename);
    res.json({ filename, exists });
  } catch (error) {
    console.error(`ERROR: Erro ao verificar existência do arquivo ${filename}:`, error);
    res.status(500).json({ error: 'Erro interno do servidor ao verificar arquivo.' });
  }
});

// Endpoint temporário para reprocessar comprovante3.pdf
app.post('/reprocess-bmg', async (req, res) => {
    const filePath = 'D:\\Sidnei\\automatopagamento_Documentos\\comprovante3.pdf';
  console.log(`DEBUG: Reprocessando comprovante3.pdf via endpoint /reprocess-bmg`);
  writeDebugToFile('reprocess_bmg_flow', `DEBUG: Reprocessando comprovante3.pdf via endpoint /reprocess-bmg`);

  try {
    await processFile(filePath);
    res.status(200).send('comprovante3.pdf reprocessado com sucesso!');
  } catch (error) {
    console.error('Erro ao reprocessar comprovante3.pdf:', error);
    writeDebugToFile('reprocess_bmg_flow', `Erro ao reprocessar comprovante3.pdf: ${error.message}`);
    res.status(500).send('Erro ao reprocessar comprovante3.pdf.');
  }
});

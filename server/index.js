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
const { savePixTransaction, getAllPixTransactions, createPixTransactionsTable, createPixTransactionsNoProcessTable, checkIfFileExistsInNoProcessTable } = require('./services/databaseService');

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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    cb(null, `${file.originalname}_${timestamp}`);
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
function watchArquivosFolder() {
  const arquivosDir = path.join(__dirname, '../arquivos');

  console.log(`Monitorando pasta: ${arquivosDir}`);

  const watcher = chokidar.watch(arquivosDir, {
    ignored: /^\./,
    persistent: true,
    ignoreInitial: true
  });

  watcher
    .on('add', async (filePath) => {
      console.log(`Novo arquivo detectado: ${filePath}`);
      await processFile(filePath); // Usa a nova função processFile
    })
    .on('error', error => console.error('Erro no watcher:', error));
}

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
  
  // Iniciar monitoramento da pasta
  watchArquivosFolder();

  // Criar tabelas ao iniciar o servidor
  databaseService.createPixTransactionsTable();
  databaseService.createPixTransactionsNoProcessTable();
});

// Adicionar tratamento de exceções não capturadas
process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception:', err);
  process.exit(1);
});

async function processFile(filePath) {
  const filename = path.basename(filePath);
  console.log(`Iniciando processamento do arquivo: ${filename}`);

  let extractedText = '';
  let pixData = {};

  try {
    // 1. Verificar se o arquivo já existe no banco de dados (tabela principal)
    const existingTransaction = await databaseService.getPixTransactionByFilename(filename);

    // 2. Verificar se o arquivo já existe na tabela de não processados
    const existingUnprocessedFile = await checkIfFileExistsInNoProcessTable(filename);

    if (existingUnprocessedFile) {
      console.log(`Arquivo ${filename} já existe na tabela de não processados. Pulando processamento.`);
      return; // Não processar novamente se já estiver na tabela de não processados
    }

    if (existingTransaction) {
      console.log(`Arquivo ${filename} já existe no banco de dados. Re-processando com texto existente.`);
      extractedText = existingTransaction.extracted_text; // Usar o texto já extraído do banco
      // Não precisamos re-extrair do arquivo, apenas re-parsear
    } else {
    // Extract original filename and extension, accounting for timestamp suffix
    const parts = filename.split('_');
    let originalFilename = filename;
    let fileExtension = path.extname(filename).toLowerCase();

    // Check if the last part is a timestamp (format: YYYY-MM-DDTHH-MM-SS-SSSZ)
    const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;
    if (parts.length > 1 && timestampPattern.test(parts[parts.length - 1])) {
      originalFilename = parts.slice(0, -1).join('_');
      fileExtension = path.extname(originalFilename).toLowerCase();
    }

    console.log(`DEBUG: Original filename: ${originalFilename}, File extension: ${fileExtension}`);

    if (fileExtension === '.pdf') {
      console.log(`DEBUG: Calling processPDF for ${filename}`);
      extractedText = await processPDF(filePath);
      console.log(`DEBUG: processPDF returned for ${filename}. Extracted text length: ${extractedText ? extractedText.length : 0}`);
    } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExtension)) {
      console.log(`DEBUG: Calling processImage for ${filename}`);
      extractedText = await processImage(filePath);
      console.log(`DEBUG: processImage returned for ${filename}. Extracted text length: ${extractedText ? extractedText.length : 0}`);
    } else {
      console.warn(`Tipo de arquivo não suportado: ${filename} (extensão detectada: ${fileExtension})`);
      return;
    }
    }

    if (extractedText) {
      console.log(`Texto extraído/recuperado de ${filename}:\n${extractedText.substring(0, 1000)}...`); // Log dos primeiros 1000 caracteres
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
      pixData = parsePixData(textToParse, filename);
      console.log(`DEBUG: pixData generated for ${filename}:`, pixData);
      pixData.filename = filename; // Adiciona o nome do arquivo aos dados PIX
      pixData.extractedText = textToParse; // Salva o texto extraído

      if (existingTransaction) {
        // Atualizar a transação existente
        await databaseService.updatePixTransaction(existingTransaction.id, pixData);
        console.log(`✅ Dados atualizados no banco para: ${filename}`);
      } else {
        // Salvar nova transação
        console.log(`DEBUG: Attempting to save new Pix transaction for ${filename}`);
        await databaseService.savePixTransaction(pixData);
        console.log(`✅ Dados salvos no banco para: ${filename}`);
      }
    } else {
      console.warn(`⚠️ Nenhum texto extraído de: ${filename}`);
      // Se não extraiu texto, ainda tenta salvar com base no nome do arquivo se houver dados
      pixData = parsePixData('', filename); // Tenta extrair dados apenas do nome do arquivo
      if (Object.keys(pixData).length > 0 && pixData.data) { // Verifica se algum dado foi extraído do nome do arquivo
          pixData.filename = filename;
          pixData.extractedText = extractedText; // Pode ser vazio
          if (existingTransaction) {
            await databaseService.updatePixTransaction(existingTransaction.id, pixData);
            console.log(`✅ Dados parciais (do nome do arquivo) atualizados no banco para: ${filename}`);
          } else {
            console.log(`DEBUG: Attempting to save partial Pix transaction for ${filename}`);
            await databaseService.savePixTransaction(pixData);
            console.log(`✅ Dados parciais (do nome do arquivo) salvos no banco para: ${filename}`);
          }
      } else {
        console.warn(`❌ Não foi possível extrair dados suficientes do arquivo ou nome do arquivo para: ${filename}`);
      }
    }
  } catch (error) {
    console.error(`Erro ao processar arquivo ${filename}:`, error);
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

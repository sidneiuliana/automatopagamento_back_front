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
const { savePixTransaction, getAllPixTransactions, createPixTransactionsNoProcessTable, checkIfFileExistsInNoProcessTable } = require('./services/databaseService');

const processingFiles = new Set();

async function processFile(filePath, originalFilename) {
  let baseFilename;
  let extractedText = '';
  let pixData = {};

  if (originalFilename) {
    baseFilename = originalFilename;
  } else {
    const filenameWithTimestamp = path.basename(filePath);
    const timestampRegex = /_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/;
    const match = filenameWithTimestamp.match(timestampRegex);

    if (match) {
      const nameWithoutTimestamp = filenameWithTimestamp.substring(0, match.index);
      const extension = path.extname(filenameWithTimestamp);
      baseFilename = `${nameWithoutTimestamp}${extension}`;
    } else {
      baseFilename = filenameWithTimestamp;
    }
  }

  console.log(`DEBUG: processFile called with filePath: ${filePath}, originalFilename: ${originalFilename}`);
  console.log(`DEBUG: Calculated baseFilename: ${baseFilename}`);
  console.log(`Iniciando processamento do arquivo: ${baseFilename}`);

  // Se o arquivo já está sendo processado, ignora
  if (processingFiles.has(baseFilename)) {
    console.log(`DEBUG: Arquivo ${baseFilename} já está em processamento. Ignorando.`);
    return { filename: baseFilename, status: 'skipped', message: 'Arquivo já está em processamento.' };
  }

  processingFiles.add(baseFilename);

  try {
    // 1. Verificar se o arquivo já existe no banco de dados (tabela principal)
    console.log(`DEBUG: Looking for existing transaction with baseFilename: ${baseFilename}`);
    const existingTransaction = await databaseService.getPixTransactionByFilename(baseFilename);
    console.log(`DEBUG: existingTransaction for ${baseFilename}: ${existingTransaction ? 'Found' : 'Not Found'}`);

    // 2. Verificar se o arquivo já existe na tabela de não processados
    const existingUnprocessedFile = await checkIfFileExistsInNoProcessTable(baseFilename);

    if (existingUnprocessedFile) {
      console.log(`Arquivo ${baseFilename} já existe na tabela de não processados. Pulando processamento.`);
      return { filename: baseFilename, status: 'skipped', message: 'Arquivo já existe na tabela de não processados.' };
    }

    if (existingTransaction) {
      console.log(`Arquivo ${baseFilename} já existe no banco de dados. Pulando re-processamento.`);
      return { filename: baseFilename, status: 'skipped', message: 'Arquivo já existe no banco de dados.' };
    } else {
      const fileExtension = path.extname(filePath).toLowerCase();
      if (fileExtension === '.pdf') {
        extractedText = await processPDF(filePath);
      } else if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExtension)) {
        extractedText = await processImage(filePath);
        console.log('RAW OCR OUTPUT:', extractedText); // Adicionando log do texto extraído
      } else {
        console.warn(`Tipo de arquivo não suportado: ${baseFilename}`);
        return { filename: baseFilename, status: 'error', message: 'Tipo de arquivo não suportado' };
      }
    }

    if (extractedText) {
      let textToParse = extractedText;
      try {
        const parsed = JSON.parse(extractedText);
        if (parsed && typeof parsed.text === 'string') {
          textToParse = parsed.text;
        }
      } catch (e) {
        // Not a JSON string, use as is
      }

      pixData = parsePixData(textToParse, baseFilename);
      pixData.filename = baseFilename;
      pixData.extractedText = textToParse;

      if (existingTransaction) {
        await databaseService.updatePixTransaction(existingTransaction.id, pixData);
        console.log(`✅ Dados atualizados no banco para: ${baseFilename}`);
        return { filename: baseFilename, status: 'success', message: 'Dados atualizados com sucesso.', pixData };
      } else {
        await databaseService.savePixTransaction(pixData);
        console.log(`✅ Dados salvos no banco para: ${baseFilename}`);
        return { filename: baseFilename, status: 'success', message: 'Dados salvos com sucesso.', pixData };
      }
    } else {
      console.warn(`⚠️ Nenhum texto extraído de: ${baseFilename}`);
      pixData = parsePixData('', baseFilename);
      if (Object.keys(pixData).length > 0 && pixData.data) {
        pixData.filename = baseFilename;
        pixData.extractedText = extractedText;
        if (existingTransaction) {
          await databaseService.updatePixTransaction(existingTransaction.id, pixData);
          console.log(`✅ Dados parciais (do nome do arquivo) atualizados no banco para: ${baseFilename}`);
          return { filename: baseFilename, status: 'success', message: 'Dados parciais atualizados com sucesso.', pixData };
        } else {
          await databaseService.savePixTransaction(pixData);
          console.log(`✅ Dados parciais (do nome do arquivo) salvos no banco para: ${baseFilename}`);
          return { filename: baseFilename, status: 'success', message: 'Dados parciais salvos com sucesso.', pixData };
        }
      } else {
        console.warn(`❌ Não foi possível extrair dados suficientes do arquivo ou nome do arquivo para: ${baseFilename}`);
        return { filename: baseFilename, status: 'error', message: 'Não foi possível extrair dados suficientes.' };
      }
    }
  } catch (error) {
    console.error(`Erro ao processar arquivo ${baseFilename}:`, error);
    return { filename: baseFilename, status: 'error', message: error.message };
  } finally {
    processingFiles.delete(baseFilename);
  }
}

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
    const parsed = path.parse(file.originalname);
    const newFilename = `${parsed.name}_${timestamp}${parsed.ext}`;
    cb(null, newFilename);
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
app.post('/api/upload', upload.array('files'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).send('Nenhum arquivo enviado.');
  }

  try {
    const results = await Promise.all(req.files.map(file => processFile(file.path, file.originalname)));

    // Limpar arquivos da pasta de upload após o processamento
    req.files.forEach(file => {
      fs.unlink(file.path, err => {
        if (err) {
          console.error(`Erro ao limpar o arquivo de upload ${file.path}:`, err);
        }
      });
    });

    const successfulUploads = results.filter(r => r.status === 'success');
    const failedUploads = results.filter(r => r.status === 'error');

    if (successfulUploads.length === 0) {
        return res.status(400).json({ 
            message: 'Nenhum arquivo foi processado com sucesso.',
            details: failedUploads
        });
    }

    res.status(200).json({ 
        message: `${successfulUploads.length} arquivo(s) processado(s) com sucesso!`,
        successfulUploads,
        failedUploads 
    });

  } catch (error) {
    console.error('Erro no upload de arquivos:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao processar arquivos.' });
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

  // Criar tabela pix_transactions_no_process ao iniciar o servidor
  databaseService.createPixTransactionsNoProcessTable();
});

// Adicionar tratamento de exceções não capturadas
process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception:', err);
  process.exit(1);
});



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

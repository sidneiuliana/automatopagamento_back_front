const databaseService = require('./services/databaseService');

async function deleteRecord() {
  const filenameToDelete = '2025-09-22_180143.pdf';
  try {
    await databaseService.deletePixTransactionByFilename(filenameToDelete);
    console.log(`Registro para ${filenameToDelete} excluído com sucesso.`);
  } catch (error) {
    console.error(`Erro ao excluir registro para ${filenameToDelete}:`, error);
  }
  process.exit();
}

deleteRecord();

const databaseService = require('./services/databaseService');

async function runDeletion() {
  try {
    console.log('Attempting to delete comprovante3.pdf from pix_transactions_no_process...');
    const result = await databaseService.deleteFileFromNoProcessTable('comprovante3.pdf');
    console.log('Deletion result:', result);
    process.exit(0);
  } catch (error) {
    console.error('Error during deletion:', error);
    process.exit(1);
  }
}

runDeletion();

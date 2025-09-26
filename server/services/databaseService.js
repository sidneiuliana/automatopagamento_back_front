const connection = require('../config/database');
const { writeDebugToFile } = require('./pixParser');

/**
 * Salva dados de transação PIX no banco de dados
 * @param {Object} pixData - Dados da transação PIX
 * @returns {Promise<Object>} - Resultado da inserção
 */
async function savePixTransaction(pixData) {
  writeDebugToFile(pixData.filename, 'DEBUG: savePixTransaction called.');
  return new Promise((resolve, reject) => {
    const {
      filename,
      valor,
      destinatario,
      chavePix,
      data,
      hora,
      banco,
      tipoChave,
      status,
      idTransacao,
      observacoes,
      extractedText,
      pagador // Adicionar o campo pagador aqui
    } = pixData;

    // Verificar se valor, destinatario ou pagador são nulos/vazios
    const isDataIncomplete = valor === null || !destinatario || !pagador;
    const tableName = isDataIncomplete ? 'pix_transactions_no_process' : 'pix_transactions';

    const sql = `
      INSERT INTO ${tableName} (
        filename, valor, destinatario, chave_pix, data_transferencia, 
        hora_transferencia, banco, tipo_chave, status, id_transacao, 
        observacoes, extracted_text, pagador
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Função para truncar strings longas
    const truncateString = (str, maxLength) => {
      if (!str) return null;
      return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
    };

    // Função para converter data brasileira para formato MySQL
    const convertDateToMySQL = (dateStr) => {
      if (!dateStr) return null;
      
      // Tenta diferentes formatos de data
      const formats = [
        /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
        /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/  // YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
      ];
      
      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const [, part1, part2, part3] = match;
          
          // Se primeiro grupo tem 4 dígitos, já está no formato correto
          if (part1.length === 4) {
            return `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`;
          }
          
          // Se não, converte de DD/MM/YYYY para YYYY-MM-DD
          return `${part3}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
        }
      }
      
      return null;
    };

    const values = [
      truncateString(filename, 500),
      valor !== null ? valor : null,
      destinatario, // TEXT não tem limite prático
      truncateString(chavePix, 500),
      convertDateToMySQL(data), // Converte data para formato MySQL
      hora,
      truncateString(banco, 200),
      truncateString(tipoChave, 100),
      truncateString(status, 100),
      truncateString(idTransacao, 500),
      observacoes, // TEXT não tem limite prático
      extractedText, // LONGTEXT não tem limite prático
      pagador // Adicionar o valor do pagador aqui
    ];

    writeDebugToFile(filename, `DEBUG: SQL Query: ${sql}`);
    writeDebugToFile(filename, `DEBUG: SQL Values: ${JSON.stringify(values)}`);

    connection.query(sql, values, (err, result) => {
      if (err) {
        writeDebugToFile(filename, `ERROR: Erro ao salvar no banco (${tableName}): ${err.message}`);
        console.error(`Erro ao salvar no banco (${tableName}):`, err);
        reject(err);
      } else {
        console.log(`✅ Transação salva na tabela ${tableName} com ID: ${result.insertId}`);
        resolve({ success: true, insertId: result.insertId, tableName: tableName });
      }
    });
  });
}

/**
 * Busca todas as transações PIX do banco
 * @returns {Promise<Array>} - Lista de transações
 */
async function getAllPixTransactions() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM pix_transactions ORDER BY processed_at DESC';
    
    connection.query(sql, (err, results) => {
      if (err) {
        console.error('Erro ao buscar transações:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

/**
 * Busca todas as transações PIX do banco da tabela pix_transactions.
 * @returns {Promise<Array>} - Lista de transações
 */
async function getProcessedPixTransactions() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM pix_transactions ORDER BY processed_at DESC';
    
    connection.query(sql, (err, results) => {
      if (err) {
        console.error('Erro ao buscar transações processadas:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

/**
 * Busca todas as transações PIX do banco da tabela pix_transactions_no_process.
 * @returns {Promise<Array>} - Lista de transações não processadas
 */
async function getUnprocessedPixTransactions() {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM pix_transactions_no_process ORDER BY processed_at DESC';
    
    connection.query(sql, (err, results) => {
      if (err) {
        console.error('Erro ao buscar transações não processadas:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

/**
 * Busca transações por período
 * @param {string} startDate - Data inicial (YYYY-MM-DD)
 * @param {string} endDate - Data final (YYYY-MM-DD)
 * @returns {Promise<Array>} - Lista de transações no período
 */
async function getPixTransactionsByDateRange(startDate, endDate) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM pix_transactions 
      WHERE data_transferencia BETWEEN ? AND ? 
      ORDER BY data_transferencia DESC
    `;
    
    connection.query(sql, [startDate, endDate], (err, results) => {
      if (err) {
        console.error('Erro ao buscar transações por período:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

/**
 * Busca transações por banco
 * @param {string} banco - Nome do banco
 * @returns {Promise<Array>} - Lista de transações do banco
 */
async function getPixTransactionsByBank(banco) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM pix_transactions WHERE banco = ? ORDER BY processed_at DESC';
    
    connection.query(sql, [banco], (err, results) => {
      if (err) {
        console.error('Erro ao buscar transações por banco:', err);
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

/**
 * Verifica se um arquivo com o nome especificado já existe no banco de dados.
 * @param {string} filename - O nome do arquivo a ser verificado.
 * @returns {Promise<boolean>} - True se o arquivo existir, false caso contrário.
 */
async function checkIfFileExists(filename) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT COUNT(*) AS count FROM pix_transactions WHERE filename = ?';
    // console.log(`DEBUG: checkIfFileExists - SQL: ${sql}, Filename: ${filename}`);
    connection.query(sql, [filename], (err, results) => {
      if (err) {
        console.error('Erro ao verificar existência do arquivo no banco:', err);
        reject(err);
      } else {
        const count = results[0].count;
        // console.log(`DEBUG: checkIfFileExists - Count for ${filename}: ${count}`);
        resolve(count > 0);
      }
    });
  });
}

/**
 * Deleta uma transação PIX do banco de dados pelo nome do arquivo.
 * @param {string} filename - O nome do arquivo da transação a ser deletada.
 * @returns {Promise<Object>} - Resultado da exclusão.
 */
async function deletePixTransactionByFilename(filename) {
  return new Promise((resolve, reject) => {
    const sql = 'DELETE FROM pix_transactions WHERE filename = ?';
    connection.query(sql, [filename], (err, result) => {
      if (err) {
        console.error('Erro ao deletar transação do banco:', err);
        reject(err);
      } else {
        console.log(`✅ Transação para o arquivo ${filename} deletada do banco. Linhas afetadas: ${result.affectedRows}`);
        resolve({ success: true, affectedRows: result.affectedRows });
      }
    });
  });
}

/**
 * Busca uma transação PIX do banco de dados pelo nome do arquivo.
 * @param {string} filename - O nome do arquivo a ser buscado.
 * @returns {Promise<Object|null>} - Os dados da transação PIX ou null se não encontrada.
 */
async function getPixTransactionByFilename(filename) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM pix_transactions WHERE filename = ?';
    connection.query(sql, [filename], (err, results) => {
      if (err) {
        console.error('Erro ao buscar transação por nome de arquivo:', err);
        reject(err);
      } else {
        resolve(results.length > 0 ? results[0] : null);
      }
    });
  });
}

/**
 * Atualiza uma transação PIX existente no banco de dados.
 * @param {number} id - O ID da transação a ser atualizada.
 * @param {Object} pixData - Os dados da transação PIX a serem atualizados.
 * @returns {Promise<Object>} - Resultado da atualização.
 */
async function updatePixTransaction(id, pixData) {
  return new Promise((resolve, reject) => {
    const {
      valor,
      destinatario,
      chavePix,
      data,
      hora,
      banco,
      tipoChave,
      status,
      idTransacao,
      observacoes,
      pagador
    } = pixData;

    const sql = `
      UPDATE pix_transactions SET
        valor = ?,
        destinatario = ?,
        chave_pix = ?,
        data_transferencia = ?,
        hora_transferencia = ?,
        banco = ?,
        tipo_chave = ?,
        status = ?,
        id_transacao = ?,
        observacoes = ?,
        pagador = ?,
        processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    // Função para truncar strings longas
    const truncateString = (str, maxLength) => {
      if (!str) return null;
      return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
    };

    // Função para converter data brasileira para formato MySQL
    const convertDateToMySQL = (dateStr) => {
      if (!dateStr) return null;
      
      // Tenta diferentes formatos de data
      const formats = [
        /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/, // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
        /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/  // YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD
      ];
      
      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          const [, part1, part2, part3] = match;
          
          // Se primeiro grupo tem 4 dígitos, já está no formato correto
          if (part1.length === 4) {
            return `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`;
          }
          
          // Se não, converte de DD/MM/YYYY para YYYY-MM-DD
          return `${part3}-${part2.padStart(2, '0')}-${part1.padStart(2, '0')}`;
        }
      }
      
      return null;
    };

    const values = [
      valor ? parseFloat(valor.replace(',', '.')) : null,
      destinatario, 
      truncateString(chavePix, 500),
      convertDateToMySQL(data), 
      hora,
      truncateString(banco, 200),
      truncateString(tipoChave, 100),
      truncateString(status, 100),
      truncateString(idTransacao, 500),
      observacoes, 
      pagador,
      id
    ];

    connection.query(sql, values, (err, result) => {
      if (err) {
        console.error('Erro ao atualizar transação no banco:', err);
        reject(err);
      } else {
        console.log(`✅ Transação com ID ${id} atualizada no banco. Linhas afetadas: ${result.affectedRows}`);
        resolve({ success: true, affectedRows: result.affectedRows });
      }
    });
  });
}

/**
 * Cria a tabela pix_transactions_no_process se ela não existir.
 */
async function createPixTransactionsNoProcessTable() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS pix_transactions_no_process (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(500) NOT NULL,
      valor DECIMAL(10, 2),
      destinatario TEXT,
      chave_pix VARCHAR(500),
      data_transferencia DATE,
      hora_transferencia TIME,
      banco VARCHAR(200),
      tipo_chave VARCHAR(100),
      status VARCHAR(100),
      id_transacao VARCHAR(500),
      observacoes TEXT,
      extracted_text LONGTEXT,
      pagador TEXT,
      processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  return new Promise((resolve, reject) => {
    connection.query(createTableSql, (err) => {
      if (err) {
        console.error('Erro ao criar/verificar a tabela pix_transactions_no_process:', err);
        return reject(err);
      }
      console.log('✅ Tabela pix_transactions_no_process criada/verificada com sucesso!');
      resolve();
    });
  });
}

/**
 * Verifica se um arquivo com o nome especificado já existe no banco de dados na tabela pix_transactions_no_process.
 * @param {string} filename - O nome do arquivo a ser verificado.
 * @returns {Promise<boolean>} - True se o arquivo existir, false caso contrário.
 */
async function checkIfFileExistsInNoProcessTable(filename) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT COUNT(*) AS count FROM pix_transactions_no_process WHERE filename = ?';
    connection.query(sql, [filename], (err, results) => {
      if (err) {
        console.error('Erro ao verificar existência do arquivo na tabela pix_transactions_no_process:', err);
        reject(err);
      } else {
        const count = results[0].count;
        resolve(count > 0);
      }
    });
  });
}

module.exports = {
  savePixTransaction,
  getAllPixTransactions,
  getPixTransactionsByDateRange,
  getPixTransactionsByBank,
  checkIfFileExists,
  deletePixTransactionByFilename,
  getPixTransactionByFilename,
  updatePixTransaction,
  createPixTransactionsNoProcessTable,
  getProcessedPixTransactions,
  getUnprocessedPixTransactions,
  checkIfFileExistsInNoProcessTable // Adicionar a nova função aqui
};

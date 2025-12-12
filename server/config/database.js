const mysql = require('mysql2');
const { writeDebugToFile } = require('../services/pixParser');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'ulianaedemarchi.mysql.uhserver.com',
  user: process.env.DB_USER || 'sidneiuliana',
  password: process.env.DB_PASSWORD || 'Sepultura@12',
  database: process.env.DB_NAME || 'ulianaedemarchi',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4'
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
    console.error('Detalhes da configuração do banco de dados:', dbConfig);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('A conexão com o banco de dados foi perdida.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('O banco de dados tem muitas conexões.');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('A conexão com o banco de dados foi recusada. Verifique as credenciais e se o servidor está online.');
    }
  } else {
    console.log('✅ Conexão bem-sucedida ao banco de dados!');
    connection.release(); // Libera a conexão imediatamente após o teste
  }
});

// Função utilitária para executar queries e logar erros
async function query(sql, params = []) {
  writeDebugToFile('database_query', `DEBUG: Query function called with SQL: ${sql.substring(0, 100)}...`);
  // Garante que params seja array (mysql2 espera array para placeholders)
  if (!Array.isArray(params)) {
    params = params ? [params] : [];
  }

  try {
    writeDebugToFile('database_query', `DEBUG: Executing query: ${sql.substring(0, 100)}... with params: ${JSON.stringify(params).substring(0, 100)}...`);
    const result = await pool.promise().query(sql, params);
    writeDebugToFile('database_query', `DEBUG: Query executed successfully. Result: ${JSON.stringify(result).substring(0, 100)}...`);
    if (Array.isArray(result)) {
      return result[0]; // rows for SELECT
    } else {
      return result; // ResultSetHeader for INSERT/UPDATE/CREATE/etc
    }
  } catch (err) {
    console.error('DB Query Error:', err);
    console.error('SQL:', sql, 'PARAMS:', params);
    writeDebugToFile('database_error', `DB Query Error: ${err.message}, SQL: ${sql}, PARAMS: ${JSON.stringify(params)}`);
    throw err;
  }
}

// Cria tabela/ajusta colunas no start
(async () => {
  try {
    console.log('Tentando inicializar DB (pool)...');
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS pix_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(500),
        valor DECIMAL(15,2),
        destinatario TEXT,
        chave_pix VARCHAR(500),
        data_transferencia DATE,
        hora_transferencia TIME,
        banco VARCHAR(200),
        tipo_chave VARCHAR(100),
        status VARCHAR(100),
        id_transacao VARCHAR(500),
        observacoes TEXT,
        pagador TEXT,
        extracted_text LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await query(createTableSQL);
    console.log('✅ Tabela pix_transactions criada/verificada com sucesso!');

    const alterTableSQL = `
      ALTER TABLE pix_transactions MODIFY COLUMN extracted_text LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;
    await query(alterTableSQL);
    console.log('✅ Coluna extracted_text verificada/alterada (se necessário).');
  } catch (err) {
    console.error('Erro ao inicializar banco de dados:', err);
  }
})();

module.exports = {
  pool,
  query
};


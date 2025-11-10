const mysql = require('mysql2/promise');
require('dotenv').config();

/*
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Sepultura@123',
  database: process.env.DB_NAME || 'ulianaedemarchi',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4'
};
*/
/*
const dbConfig = {
  host: process.env.DB_HOST || 'ulianaedemarchi.mysql.uhserver.com',
  user: process.env.DB_USER || 'sidneiuliana',
  password: process.env.DB_PASSWORD || 'Sepultura@12',
  database: process.env.DB_NAME || 'ulianaedemarchi',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4'
};
*/
const dbConfig = {
  host: process.env.DB_HOST || 'ulianaedemarchi.mysql.uhserver.com',
  user: process.env.DB_USER || 'sidneiuliana',
  password: process.env.DB_PASSWORD || 'Sepultura@12',
  database: process.env.DB_NAME || 'ulianaedemarchi',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
  connectTimeout: 60000,
  // Desative SSL por padrão; ative apenas se DB_SSL=true e o servidor suportar.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

//const connection = mysql.createConnection(dbConfig);
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0
});

// Função utilitária para executar queries e logar erros
async function query(sql, params = []) {
  // Normaliza chamadas onde um callback foi passado por engano:
  if (typeof params === 'function') {
    console.warn('Aviso: callback passado como params foi ignorado.');
    params = [];
  }
  // Garante que params seja array (mysql2 espera array para placeholders)
  if (!Array.isArray(params)) {
    params = [params];
  }

  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('DB Query Error:', err);
    console.error('SQL:', sql, 'PARAMS:', params);
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
        extracted_text LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await query(createTableSQL);
    console.log('✅ Tabela pix_transactions criada/verificada com sucesso!');

    const alterTableSQL = `
      ALTER TABLE pix_transactions MODIFY COLUMN extracted_text LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;
    await query(alterTableSQL).catch(() => {});
    console.log('✅ Coluna extracted_text verificada/alterada (se necessário).');
  } catch (err) {
    console.error('Erro ao inicializar banco de dados:', err);
  }
})();

module.exports = {
  pool,
  query
};

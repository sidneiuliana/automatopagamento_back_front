const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Sepultura@123',
  database: process.env.DB_NAME || 'ulianaedemarchi',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4'
};

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar com MySQL:', err);
  } else {
    console.log('✅ Conectado ao MySQL com sucesso!');
    
    // Criar tabela se não existir
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
    
    connection.query(createTableSQL, (err) => {
      if (err) {
        console.error('Erro ao criar tabela:', err);
      } else {
        console.log('✅ Tabela pix_transactions criada/verificada com sucesso!');

        // Alterar a coluna extracted_text para utf8mb4 se necessário
        const alterTableSQL = `
          ALTER TABLE pix_transactions MODIFY COLUMN extracted_text LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `;
        connection.query(alterTableSQL, (alterErr) => {
          if (alterErr) {
            console.error('Erro ao alterar a coluna extracted_text:', alterErr);
          } else {
            console.log('✅ Coluna extracted_text alterada para utf8mb4 com sucesso!');
          }
        });
      }
    });
  }
});

module.exports = connection;

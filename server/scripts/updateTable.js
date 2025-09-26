const mysql = require('mysql2');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Sepultura@123',
  database: process.env.DB_NAME || 'ulianaedemarchi',
  port: process.env.DB_PORT || 3306
};

const connection = mysql.createConnection(dbConfig);

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar com MySQL:', err);
    process.exit(1);
  }
  
  console.log('✅ Conectado ao MySQL com sucesso!');
  
  // Atualizar estrutura da tabela existente
  const alterTableSQL = [
    'ALTER TABLE pix_transactions MODIFY COLUMN filename VARCHAR(500)',
    'ALTER TABLE pix_transactions MODIFY COLUMN valor DECIMAL(15,2)',
    'ALTER TABLE pix_transactions MODIFY COLUMN destinatario TEXT',
    'ALTER TABLE pix_transactions MODIFY COLUMN chave_pix VARCHAR(500)',
    'ALTER TABLE pix_transactions MODIFY COLUMN banco VARCHAR(200)',
    'ALTER TABLE pix_transactions MODIFY COLUMN tipo_chave VARCHAR(100)',
    'ALTER TABLE pix_transactions MODIFY COLUMN status VARCHAR(100)',
    'ALTER TABLE pix_transactions MODIFY COLUMN id_transacao VARCHAR(500)',
    'ALTER TABLE pix_transactions MODIFY COLUMN extracted_text LONGTEXT'
  ];
  
  let completed = 0;
  
  alterTableSQL.forEach((sql, index) => {
    connection.query(sql, (err) => {
      if (err) {
        console.error(`Erro ao executar comando ${index + 1}:`, err);
      } else {
        console.log(`✅ Comando ${index + 1} executado com sucesso`);
      }
      
      completed++;
      if (completed === alterTableSQL.length) {
        console.log('🎉 Atualização da tabela concluída!');
        connection.end();
      }
    });
  });
});

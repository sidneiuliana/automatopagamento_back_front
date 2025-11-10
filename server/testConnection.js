const { query } = require('./config/database');

(async () => {
  try {
    const res = await query('SELECT 1 + 1 AS result');
    console.log('✅ Query executada com sucesso:', res);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao executar query:', err);
    process.exit(1);
  }
})();
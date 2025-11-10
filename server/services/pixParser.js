const fs = require('fs');
const path = require('path');

// Função para escrever logs de depuração em um arquivo
async function writeDebugToFile(fileName, content, logFileName = 'debug_log.txt') {
  const logFilePath = path.join(__dirname, logFileName);
  try {
    fs.writeFileSync(logFilePath, `DEBUG: ${fileName}: ${content}\n`, { flag: 'a' });
    console.log(`LOG DE DEBUG ESCRITO COM SUCESSO EM: ${logFilePath}`);
  } catch (err) {
    console.error(`Erro ao escrever no arquivo de debug ${logFilePath}:`, err);
  }
}


/**
 * Analisa texto extraído e identifica dados de pagamento PIX
 * @param {string} text - Texto extraído da imagem/PDF
 * @returns {Object} - Dados estruturados do pagamento PIX
 */
function parsePixData(text, filename = '') {
  console.log(`DEBUG: parsePixData called for file: ${filename}`);
  if (!text) {
    return { error: 'Nenhum texto encontrado' };
  }

  const normalizedText = text.toLowerCase();

  // Adicionar log do normalizedText para depuração
  // writeDebugToFile(filename, `DEBUG: Normalized Text (before Nubank check): ${normalizedText}`);

  //console.log('Texto recebido para análise:', text);
  //console.log('Nome do arquivo recebido para análise:', filename);

  const pixData = {
    valor: null,
    destinatario: null,
    chavePix: null,
    data: null,
    hora: null,
    idTransacao: null,
    banco: null,
    tipoChave: null,
    status: null,
    observacoes: null,
    pagador: null,
    pagadorBanco: null // Adicionar campo para o banco do pagador
  };

  try {
    // Normalizar texto para análise
    const normalizedText = text.toLowerCase().replace(/\s+/g, ' ');

    // Lógica específica para NU PAGAMENTOS - IP (MOVIDA PARA O INÍCIO)
    if (normalizedText.includes('instituição nu pagamentos - ip')) {
      console.log('Detectado comprovante do NU PAGAMENTOS - IP. Iniciando extração específica...');
  
      // Extrair Origem Nome para pagador
      const origemNomePattern = /origem nome\s*(.*?)(?:\s*institui[çc][ãa]o|\s*agencia|\s*conta|\s*cpf|$)/i;
      const origemNomeMatch = normalizedText.match(origemNomePattern);
      if (origemNomeMatch && origemNomeMatch[1]) {
        pixData.pagador = origemNomeMatch[1].trim();
        console.log(`👤 Pagador (NU PAGAMENTOS - IP) encontrado: ${pixData.pagador}`);
      }
  
      // Extrair Destino Nome para destinatario
      const destinoNomePattern = /destino nome\s*(.*?)(?:\s*cpf|\s*cnpj|\s*chave|\s*institui[çc][ãa]o|\s*agencia|\s*conta|$)/i;
      const destinoNomeMatch = normalizedText.match(destinoNomePattern);
      if (destinoNomeMatch && destinoNomeMatch[1]) {
        pixData.destinatario = destinoNomeMatch[1].trim();
        console.log(`👤 Destinatário (NU PAGAMENTOS - IP) encontrado: ${pixData.destinatario}`);
      }
  
      // Extrair Origem Instituição para pagadorBanco
      const origemInstituicaoPattern = /institui[çc][ãa]o\s*(nu pagamentos - ip)/i;
      const origemInstituicaoMatch = normalizedText.match(origemInstituicaoPattern);
      if (origemInstituicaoMatch && origemInstituicaoMatch[1]) {
        pixData.pagadorBanco = origemInstituicaoMatch[1].trim(); // Novo campo para o banco do pagador
        console.log(`🏦 Banco Pagador (NU PAGAMENTOS - IP) encontrado: ${pixData.pagadorBanco}`);
      }
  
      // Extrair Destino Instituição para banco
      const destinoInstituicaoPattern = /institui[çc][ãa]o\s*(.*?)(?:\s*agencia|\s*conta|\s*tipo de conta|$)/i;
      const destinoInstituicaoMatch = normalizedText.match(destinoInstituicaoPattern);
      if (destinoInstituicaoMatch && destinoInstituicaoMatch[1]) {
        pixData.banco = destinoInstituicaoMatch[1].trim().replace(/\s*agência\s*\d+/i, ''); // Remove agência do nome do banco
        console.log(`🏦 Banco Destino (NU PAGAMENTOS - IP) encontrado: ${pixData.banco}`);
      }

      // Extrair ID da transação
      const idTransacaoPattern = /(?:id|1d) da transa[çc][ãa]o:\s*([a-zA-Z0-9\-_]+)/i;
      const idTransacaoMatch = normalizedText.match(idTransacaoPattern);
writeDebugToFile(filename, `DEBUG: Nubank idTransacaoMatch: ${JSON.stringify(idTransacaoMatch)}`);
      if (idTransacaoMatch && idTransacaoMatch[1]) {
        pixData.idTransacao = idTransacaoMatch[1].trim();
        console.log(`🆔 ID da Transação (NU PAGAMENTOS - IP) encontrado: ${pixData.idTransacao}`);
      }
    }

    // Lógica específica para PagBank (PagSeguro Internet Instituição de Pagamento S.A.)
    if (normalizedText.includes('pagbank (pagseguro internet instituição de pagamento s.a.)')) {
      console.log('Detectado comprovante do PagBank. Iniciando extração específica...');
      pixData.instituicao = 'PagBank (PagSeguro Internet Instituição de Pagamento S.A.)';
      pixData.banco = 'PagBank (PagSeguro Internet Instituição de Pagamento S.A.)';

      // Extrair Pagador (De)
      const pagadorPagbankPattern = /de\s+([a-zA-Z\s]+?)\s+(?:cpf|institui[çc][ãa]o|para)/i;
      const pagadorPagbankMatch = normalizedText.match(pagadorPagbankPattern);
      if (pagadorPagbankMatch && pagadorPagbankMatch[1]) {
        pixData.pagador = pagadorPagbankMatch[1].trim();
        console.log(`👤 Pagador (PagBank) encontrado: ${pixData.pagador}`);
      }
    }

    // Extrair valor - priorizar símbolo R$
    let valorEncontrado = false;
    
    // Primeiro, buscar especificamente por "R$"
    const r$Patterns = [
      /r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
      /valor[:\s]*r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
      /pago[:\s]*r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
    ];

    for (const pattern of r$Patterns) {
      const match = pattern.exec(normalizedText);
      if (match) {
        pixData.valor = parseFloat(match[1].replace('.', '').replace(',', '.'));
        valorEncontrado = true;
        //console.log(`💰 Valor encontrado via R$: ${pixData.valor}`);
        break;
      }
    }

    // Se não encontrou com R$, tentar outros padrões
    if (!valorEncontrado) {
      const valorPatterns = [
        /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*reais?/gi,
        /valor[:\s]*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
        /pago[:\s]*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi
      ];

      for (const pattern of valorPatterns) {
        const match = pattern.exec(normalizedText);
        if (match) {
          pixData.valor = parseFloat(match[1].replace('.', '').replace(',', '.'));
          //console.log(`💰 Valor encontrado via padrão alternativo: ${pixData.valor}`);
          break;
        }
      }
    }

    // Extrair data (formatos: dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, dd de MMM de yyyy)
    const dataPatterns = [
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/g,
      /(\d{1,2}\s+de\s+(\w+)\s+de\s+\d{4})/g
    ];

    for (const pattern of dataPatterns) {
      const match = pattern.exec(normalizedText);
      if (match) {
        let day, month, year;
        if (match[2]) { // dd de MMM de yyyy format
          const monthAbbr = match[2].toLowerCase();
          day = match[1].split(' ')[0];
          month = monthMap[monthAbbr];
          year = match[1].split(' ')[4];
        } else {
          [day, month, year] = match[1].split(/\/|\.|-/);
        }
        pixData.data = `${day}/${month}/${year}`;
        //console.log(`📅 Data extraída do texto: ${pixData.data}`);
        break;
      }
    }

    // Extrair hora (formatos: hh:mm, hh:mm:ss)
    const horaPattern = /(?:\s|^)(\d{1,2}:\d{2}(?::\d{2})?)(?:\s|$)/;
    const horaMatch = normalizedText.match(horaPattern);
    if (horaMatch && horaMatch[1]) {
      pixData.hora = horaMatch[1];
      console.log(`⏰ Hora encontrada: ${pixData.hora}`);
    }

    // Se o texto é muito pequeno ou a data não foi encontrada no texto, tentar extrair dados do nome do arquivo
    if (text.length < 50 || !pixData.data) {
      //console.log(`⚠️ Texto muito pequeno (${text.length} chars) ou data não encontrada no texto - tentando extrair dados do nome do arquivo`);
      
      if (filename) {
        //console.log(`📁 Analisando nome do arquivo: ${filename}`);
        
        // Extrair data do nome do arquivo se possível
        const dateMatchFilename = filename.match(/(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})-(\d{1,2})-(\d{4})|(\d{1,2})\s+de\s+([a-zA-Z]{3})\s+de\s+(\d{4})/i);
        if (dateMatchFilename) {
          let day, month, year;
          if (dateMatchFilename[1]) { // YYYY-MM-DD format
            year = dateMatchFilename[1];
            month = dateMatchFilename[2];
            day = dateMatchFilename[3];
          } else if (dateMatchFilename[4]) { // DD-MM-YYYY format
            day = dateMatchFilename[4];
            month = dateMatchFilename[5];
            year = dateMatchFilename[6];
          } else if (dateMatchFilename[7]) { // DD de MMM de YYYY format
            day = dateMatchFilename[7];
            month = monthMap[dateMatchFilename[8].toLowerCase()];
            year = dateMatchFilename[9];
          }
          pixData.data = `${day}/${month}/${year}`;
          //console.log(`📅 Data extraída do nome do arquivo: ${pixData.data}`);
        }
        
        // Extrair hora do nome do arquivo se possível, apenas se não foi encontrada no texto
        if (!pixData.hora) {
          const timeMatch = filename.match(/(\d{1,2})-(\d{1,2})-(\d{1,2})/);
          if (timeMatch) {
            const [, hour, minute, second] = timeMatch;
            pixData.hora = `${hour}:${minute}:${second}`;
            console.log(`🕐 Hora extraída do nome do arquivo: ${pixData.hora}`);
          }
        }
        
        // Identificar banco pelo nome
        if (filename.toLowerCase().includes('sicoob')) {
          pixData.banco = 'Sicoob';
          //console.log(`🏦 Banco identificado pelo nome: ${pixData.banco}`);
        }
        
        // Tentar extrair valor se mencionado no nome
        const valorMatch = filename.match(/r\$\s*(\d+(?:[,\.]\d{2})?)/i);
        if (valorMatch) {
          pixData.valor = parseFloat(valorMatch[1].replace('.', '').replace(',', '.'));
          //console.log(`💰 Valor extraído do nome do arquivo: R$ ${pixData.valor}`);
        }
      }
      
      pixData.status = 'PDF Escaneado - Processamento Manual Necessário';
      pixData.observacoes = 'PDF com pouco texto extraído. Pode ser necessário processamento manual ou OCR adicional.';
      
      return pixData;
    }

    // Extrair destinatário (busca por padrões comuns)
    const destinatarioPatterns = [
      /para[:\s]+([^,\n]+?)(?:\n|cpf|chave|instituição|banco|$)/gi,
      /benefici[aá]rio[:\s]+([^,\n]+?)(?:\n|cpf|chave|instituição|banco|$)/gi,
      /recebedor[:\s]+([^,\n]+?)(?:\n|cpf|chave|instituição|banco|$)/gi,
      /favorecido[:\s]+([^,\n]+?)(?:\n|cpf|chave|instituição|banco|$)/gi
    ];

    for (const pattern of destinatarioPatterns) {
      const match = pattern.exec(normalizedText);
      if (match) {
        pixData.destinatario = match[1].trim();
        //console.log(`👤 Destinatário encontrado: ${pixData.destinatario}`);
        break;
      }
    }

    // Extrair pagador (busca por padrões comuns)
    if (!pixData.pagador) {
      const pagadorPatterns = [
        /dados do pagador\s*de\s*([^,\n]+?)(?:\n|cpf|chave|instituição|banco|$)/gi,
        /pagador[:\s]+([^,\n]+?)(?:\n|cpf|chave|instituição|banco|$)/gi
      ];

      for (const pattern of pagadorPatterns) {
        const match = pattern.exec(normalizedText);
        if (match) {
          pixData.pagador = match[1].trim();
          console.log(`👤 Pagador encontrado (geral): ${pixData.pagador}`);
          break;
        }
      }
    }

    // Extrair chave PIX
    const chavePatterns = [
      /chave[:\s]+([^,\n]+)/g,
      /pix[:\s]+([^,\n]+)/g,
      /(\d{11})/g, // CPF
      /(\d{14})/g, // CNPJ
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, // Email
      /(\+55\s?\d{2}\s?\d{4,5}\s?\d{4})/g, // Telefone
    ];

    for (const pattern of chavePatterns) {
      const match = pattern.exec(normalizedText);
      if (match && !pixData.chavePix) {
        const chave = match[1] || match[0];
        // Validar se parece com uma chave PIX válida
        if (isValidPixKey(chave)) {
          pixData.chavePix = chave;
        }
      }
    }

    // Extrair ID da transação
    console.log(`DEBUG: idTransacao before general extraction: ${pixData.idTransacao}`);
    const idPatterns = [
      /(?:id|1d)(?:\s+da)?\s+transa[çc][ãa]o\s+([a-zA-Z0-9]{20,})/i, // Specific for "id (da) transação" followed by a long ID
      /(?:id|1d)\s+([a-zA-Z0-9]{20,})/i, // Specific for "id" followed by a long ID
      /transa[çc][ãa]o\s+([a-zA-Z0-9]{20,})/i, // Specific for "transação" followed by a long ID
      /protocolo\s+([a-zA-Z0-9\-]+)/i // General for "protocolo"
    ];

    for (const pattern of idPatterns) {
      const match = pattern.exec(normalizedText);
      writeDebugToFile(filename, `DEBUG: General idTransacao match for pattern ${pattern}: ${JSON.stringify(match)}`);
      if (match) {
        pixData.idTransacao = match[1];
        console.log(`DEBUG: idTransacao found by general extraction: ${pixData.idTransacao}`);
        break;
      }
    }
    console.log(`DEBUG: idTransacao after general extraction: ${pixData.idTransacao}`);

    // Identificar banco
    const bancos = {
      'sicoob': 'Sicoob',
      'banco do brasil': 'Banco do Brasil',
      'bradesco': 'Bradesco',
      'itau': 'Itaú',
      'santander': 'BCO SANTANDER (BRASIL) S.A.',
      'caixa': 'Caixa Econômica Federal',
      'nubank': 'Nubank',
      'inter': 'Banco Inter'
    };

    // Tentar identificar o banco do pagador primeiro, se disponível
    const pagadorInstituicaoPattern = /dados do pagador\s*(?:de\s*[^\n]+?\s*)?cpf\s*[^\n]+?\s*institui[çc][ãa]o\s*([^\n]+?)(?:\s*comprovante|$)/i;
    const pagadorInstituicaoMatch = normalizedText.match(pagadorInstituicaoPattern);
    if (pagadorInstituicaoMatch && pagadorInstituicaoMatch[1]) {
      const instituicaoPagador = pagadorInstituicaoMatch[1].trim().toLowerCase();
      for (const [key, value] of Object.entries(bancos)) {
        if (instituicaoPagador.includes(key)) {
          pixData.banco = value;
          //console.log(`🏦 Banco do pagador identificado: ${pixData.banco}`);
          break;
        }
      }
    }

    // Se o banco ainda não foi identificado, usar a lógica geral
    if (!pixData.banco) {
      for (const [key, value] of Object.entries(bancos)) {
        if (normalizedText.includes(key)) {
          pixData.banco = value;
          break;
        }
      }
    }

    //console.log('pixData.banco após identificação geral:', pixData.banco);

    // Identificar tipo de chave PIX
    if (pixData.chavePix) {
      if (pixData.chavePix.includes('@')) {
        pixData.tipoChave = 'Email';
      } else if (pixData.chavePix.includes('+55')) {
        pixData.tipoChave = 'Telefone';
      } else if (pixData.chavePix.length === 11) {
        pixData.tipoChave = 'CPF';
      } else if (pixData.chavePix.length === 14) {
        pixData.tipoChave = 'CNPJ';
      } else {
        pixData.tipoChave = 'Chave Aleatória';
      }
    }

    // Extrair observações
    const obsPatterns = [
      /observa[çc][ãa]o[:\s]+([^,\n]+)/g,
      /coment[aá]rio[:\s]+([^,\n]+)/g,
      /descri[çc][ãa]o[:\s]+([^,\n]+)/g
    ];

    for (const pattern of obsPatterns) {
      const match = pattern.exec(normalizedText);
      if (match) {
        pixData.observacoes = match[1].trim();
        break;
      }
    }

    // Lógica específica para Caixa Econômica Federal
    if (pixData.banco === 'Caixa Econômica Federal') {
      //console.log('Detectado comprovante da Caixa Econômica Federal. Iniciando extração específica...');
      //console.log('Normalized Text for Caixa:', normalizedText);

      // Extrair Nome do Recebedor
      const recebedorCaixaPattern = /dados do recebedor\s*nome\s*([^]+?)\s*(?:cpf|institui[çc][ãa]o|dados do pagador|$)/i;
      const recebedorMatch = normalizedText.match(recebedorCaixaPattern);
      //console.log('Recebedor Caixa Match:', recebedorMatch);
      if (recebedorMatch && recebedorMatch[1]) {
        pixData.destinatario = recebedorMatch[1].trim();
        //console.log(`👤 Destinatário (Caixa) encontrado: ${pixData.destinatario}`);
      }

      // Extrair Nome do Pagador
      const pagadorCaixaPattern = /dados do pagador\s*nome\s*([^]+?)\s*(?:cpf|institui[çc][ãa]o|$)/i;
      const pagadorMatch = normalizedText.match(pagadorCaixaPattern);
      //console.log('Pagador Caixa Match:', pagadorMatch);
      if (pagadorMatch && pagadorMatch[1]) {
        pixData.pagador = pagadorMatch[1].trim();
        //console.log(`👤 Pagador (Caixa) encontrado: ${pixData.pagador}`);
      }

      // Extrair Valor
      const valorCaixaPattern = /(?:valor|total|r\$)\s*([\d.,]+)/i;
      const valorMatch = normalizedText.match(valorCaixaPattern);
      if (valorMatch && valorMatch[1]) {
        pixData.valor = parseFloat(valorMatch[1].replace('.', '').replace(',', '.'));
        //console.log(`💰 Valor (Caixa) encontrado: ${pixData.valor}`);
      }

      // Extrair ID da Transação
      const idTransacaoCaixaPattern = /(?:id da transa[çc][ãa]o|transa[çc][ãa]o id|código da transa[çc][ãa]o)[:\s]*([a-zA-Z0-9]{32})/i;
      const idTransacaoMatch = normalizedText.match(idTransacaoCaixaPattern);
      if (idTransacaoMatch && idTransacaoMatch[1]) {
        pixData.idTransacao = idTransacaoMatch[1].trim();
        //console.log(`💳 ID Transação (Caixa) encontrado: ${pixData.idTransacao}`);
      }

      // Extrair Chave Pix
      const chavePixCaixaPattern = /(?:chave pix|chave)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2})|(?:\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})|(?:\+?\d{2}\s?\d{2}\s?\d{4,5}-?\d{4})|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
      const chavePixMatch = normalizedText.match(chavePixCaixaPattern);
      if (chavePixMatch && chavePixMatch[1]) {
        pixData.chavePix = chavePixMatch[1].trim();
        //console.log(`🔑 Chave Pix (Caixa) encontrada: ${pixData.chavePix}`);

        // Identificar tipo de chave PIX para Caixa
        if (pixData.chavePix.includes('@')) {
          pixData.tipoChave = 'Email';
        } else if (pixData.chavePix.includes('+55')) {
          pixData.tipoChave = 'Telefone';
        } else if (pixData.chavePix.length === 11 && !isNaN(pixData.chavePix)) {
          pixData.tipoChave = 'CPF';
        } else if (pixData.chavePix.length === 14 && !isNaN(pixData.chavePix)) {
          pixData.tipoChave = 'CNPJ';
        } else {
          pixData.tipoChave = 'Chave Aleatória';
        }
        //console.log(`🔑 Tipo de Chave (Caixa) encontrado: ${pixData.tipoChave}`);
      }
    }

    //console.log('pixData.banco antes da lógica Santander:', pixData.banco);
    //console.log('normalizedText antes da lógica Santander:', normalizedText);
    // Lógica específica para BCO SANTANDER (BRASIL) S.A.
    if (pixData.banco === 'BCO SANTANDER (BRASIL) S.A.') {
      console.log('Detectado comprovante do Santander. Iniciando extração específica...');
      console.log('Normalized Text for Santander:', normalizedText);

      // Extrair Destinatário (Para)
      const destinatarioSantanderPattern = /dados do recebedor\s*para\s*([^\n]+?)(?:\s*cpf|\s*cnpj|\s*chave|\s*institui[çc][ãa]o|$)/i;
      const destinatarioSantanderMatch = normalizedText.match(destinatarioSantanderPattern);
      if (destinatarioSantanderMatch && destinatarioSantanderMatch[1]) {
        pixData.destinatario = destinatarioSantanderMatch[1].trim();
        console.log(`👤 Destinatário (Santander) encontrado: ${pixData.destinatario}`);
      }

      // Extrair Pagador (De)
      const pagadorSantanderPattern = /dados do pagador\s*de\s*([^\n]+?)(?:\s*cpf|\s*cnpj|\s*institui[çc][ãa]o|\s*agencia|\s*conta|\s*data|\s*valor|\s*id|\s*transa[çc][ãa]o|\s*protocolo|\s*para|\s*informa[çc][ãa]o para o recebedor|$)/i;
      const pagadorSantanderMatch = normalizedText.match(pagadorSantanderPattern);
      if (pagadorSantanderMatch && pagadorSantanderMatch[1]) {
        pixData.pagador = pagadorSantanderMatch[1].trim();
        console.log(`👤 Pagador (Santander) encontrado: ${pixData.pagador}`);
      }

      // Extrair Banco (Instituição) do pagador
      const bancoPagadorSantanderPattern = /dados do pagador\s*(?:de\s*[^\n]+?\s*)?institui[çc][ãa]o\s*([^\n]+?)(?:\s*comprovante|$)/i;
      const bancoPagadorSantanderMatch = normalizedText.match(bancoPagadorSantanderPattern);
      if (bancoPagadorSantanderMatch && bancoPagadorSantanderMatch[1]) {
        pixData.banco = bancoPagadorSantanderMatch[1].trim();
        console.log(`🏦 Banco do Pagador (Santander) encontrado: ${pixData.banco}`);
      }

      // Extrair Observações (Informação para o recebedor)
      const observacoesSantanderPattern = /informa[çc][ãa]o para o recebedor\s*([^\n]+?)(?:\s*forma de pagamento|\s*ag\s*\d+|\s*cpf|\s*cnpj|\s*institui[çc][ãa]o|\s*agencia|\s*conta|\s*data|\s*valor|\s*id|\s*transa[çc][ãa]o|\s*protocolo|\s*para|\s*de|$)/i;
      const observacoesSantanderMatch = normalizedText.match(observacoesSantanderPattern);
      if (observacoesSantanderMatch && observacoesSantanderMatch[1]) {
        pixData.observacoes = observacoesSantanderMatch[1].trim();
        console.log(`📝 Observações (Santander) encontradas: ${pixData.observacoes}`);
      }
    }

    // Lógica específica para Banco do Brasil
    if (pixData.banco === 'Banco do Brasil') {
      console.log('Detectado comprovante do Banco do Brasil. Iniciando extração específica...');
      console.log('Normalized Text for Banco do Brasil:', normalizedText);

      // Extrair Pagador
      const pagadorBBPattern = /pagador\s*([^\n]+?)(?:\s*cpf|\s*cnpj|\s*institui[çc][ãa]o|\s*agencia|\s*conta|\s*data|\s*valor|\s*id|\s*transa[çc][ãa]o|\s*protocolo|$)/i;
      const pagadorBBMatch = normalizedText.match(pagadorBBPattern);
      if (pagadorBBMatch && pagadorBBMatch[1]) {
        pixData.pagador = pagadorBBMatch[1].trim();
        console.log(`👤 Pagador (Banco do Brasil) encontrado: ${pixData.pagador}`);
      }
    }

    // Lógica específica para Bradesco
    if (normalizedText.includes('bradesco') || normalizedText.includes('transação concluída pelo bradesco celular')) {
      console.log('Detectado comprovante do Bradesco. Iniciando extração específica...');

      // Extrair Pagador (Dados de quem pagou Nome)
      const pagadorBradescoPattern = /dados de quem pagou\s*nome[:\s]*([^\n]+?)(?:\s*cpf|\s*institui[çc][ãa]o|$)/i;
      const pagadorBradescoMatch = normalizedText.match(pagadorBradescoPattern);
      if (pagadorBradescoMatch && pagadorBradescoMatch[1]) {
        pixData.pagador = pagadorBradescoMatch[1].trim();
        console.log(`👤 Pagador (Bradesco) encontrado: ${pixData.pagador}`);
      }

      // Extrair Destinatário (Dados de quem recebeu Nome)
      const destinatarioBradescoPattern = /dados de quem recebeu\s*nome[:\s]*([^\n]+?)(?:\s*cpf|\s*institui[çc][ãa]o|\s*chave|$)/i;
      const destinatarioBradescoMatch = normalizedText.match(destinatarioBradescoPattern);
      if (destinatarioBradescoMatch && destinatarioBradescoMatch[1]) {
        pixData.destinatario = destinatarioBradescoMatch[1].trim();
        console.log(`👤 Destinatário (Bradesco) encontrado: ${pixData.destinatario}`);
      }

      // Extrair Banco do Pagador
      const pagadorBancoBradescoPattern = /dados de quem pagou\s*[^\n]+?\s*institui[çc][ãa]o[:\s]*([^\n]+?)(?:\s*dados da transa[çc][ãa]o|$)/i;
      const pagadorBancoBradescoMatch = normalizedText.match(pagadorBancoBradescoPattern);
      if (pagadorBancoBradescoMatch && pagadorBancoBradescoMatch[1]) {
        pixData.pagadorBanco = pagadorBancoBradescoMatch[1].trim();
        console.log(`🏦 Banco Pagador (Bradesco) encontrado: ${pixData.pagadorBanco}`);
      }

      // Extrair Banco do Destinatário
      const bancoBradescoPattern = /dados de quem recebeu\s*[^\n]+?\s*institui[çc][ãa]o[:\s]*([^\n]+?)(?:\s*chave|$)/i;
      const bancoBradescoMatch = normalizedText.match(bancoBradescoPattern);
      if (bancoBradescoMatch && bancoBradescoMatch[1]) {
        pixData.banco = bancoBradescoMatch[1].trim();
        console.log(`🏦 Banco Destino (Bradesco) encontrado: ${pixData.banco}`);
      }

      // Extrair Chave PIX
      const chavePixBradescoPattern = /chave[:\s]*([^\n]+?)(?:\s*transa[çc][ãa]o|$)/i;
      const chavePixBradescoMatch = normalizedText.match(chavePixBradescoPattern);
      if (chavePixBradescoMatch && chavePixBradescoMatch[1]) {
        pixData.chavePix = chavePixBradescoMatch[1].trim();
        console.log(`🔑 Chave PIX (Bradesco) encontrada: ${pixData.chavePix}`);
      }

      // Extrair ID da Transação (Número de Controle)
      const idTransacaoBradescoPattern = /n[úu]mero de controle[:\s]*([a-zA-Z0-9]+)/i;
      const idTransacaoBradescoMatch = normalizedText.match(idTransacaoBradescoPattern);
      if (idTransacaoBradescoMatch && idTransacaoBradescoMatch[1]) {
        pixData.idTransacao = idTransacaoBradescoMatch[1].trim();
        console.log(`🆔 ID da Transação (Bradesco) encontrado: ${pixData.idTransacao}`);
      }

      // Extrair Observações
      const observacoesBradescoPattern = /transa[çc][ãa]o conclu[íi]da pelo bradesco celular/i;
      const observacoesBradescoMatch = normalizedText.match(observacoesBradescoPattern);
      if (observacoesBradescoMatch) {
        pixData.observacoes = 'Transação concluída pelo Bradesco Celular';
        console.log(`📝 Observações (Bradesco) encontradas: ${pixData.observacoes}`);
      }

      // Extrair Valor
      const valorBradescoPattern = /valor[:\s]*r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i;
      const valorBradescoMatch = normalizedText.match(valorBradescoPattern);
      if (valorBradescoMatch && valorBradescoMatch[1]) {
        pixData.valor = parseFloat(valorBradescoMatch[1].replace('.', '').replace(',', '.'));
        console.log(`💰 Valor (Bradesco) encontrado: ${pixData.valor}`);
      }

      // Extrair Data e Hora (Data e Hora da transação)
      const dataHoraBradescoPattern = /data e hora[:\s]*(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/i;
      const dataHoraBradescoMatch = normalizedText.match(dataHoraBradescoPattern);
      if (dataHoraBradescoMatch) {
        const [, day, month, year, hour, minute, second] = dataHoraBradescoMatch;
        pixData.data = `${day}/${month}/${year}`;
        pixData.hora = `${hour}:${minute}:${second}`;
        console.log(`📅 Data (Bradesco) encontrada: ${pixData.data}`);
        console.log(`⏰ Hora (Bradesco) encontrada: ${pixData.hora}`);
      }
    }

    // Lógica específica para BMG
    if (normalizedText.includes('bancobmgs/a') || normalizedText.includes('aplicativobmg') || normalizedText.includes('comprovante de envio pix')) {
      console.log('Detectado comprovante do BMG. Iniciando extração específica...');

      // Extrair Pagador (De)
      const pagadorBMGPattern = /de\s+([^\n]+?)(?:\s*cpf\/cnpj|\s*institui[çc][ãa]o|$)/i;
      const pagadorBMGMatch = normalizedText.match(pagadorBMGPattern);
      if (pagadorBMGMatch && pagadorBMGMatch[1]) {
        pixData.pagador = pagadorBMGMatch[1].trim();
        console.log(`👤 Pagador (BMG) encontrado: ${pixData.pagador}`);
      }

      // Extrair Destinatário (Para)
      const destinatarioBMGPattern = /para\s+([^\n]+?)(?:\s*cpf\/cnpj|\s*institui[çc][ãa]o|$)/i;
      const destinatarioBMGMatch = normalizedText.match(destinatarioBMGPattern);
      if (destinatarioBMGMatch && destinatarioBMGMatch[1]) {
        pixData.destinatario = destinatarioBMGMatch[1].trim();
        console.log(`👤 Destinatário (BMG) encontrado: ${pixData.destinatario}`);
      }

      // Extrair Banco do Pagador
      const pagadorBancoBMGPattern = /de\s+[^\n]+?\s*cpf\/cnpj\s*[^\n]+?\s*institui[çc][ãa]o\s+([^\n]+?)(?:\s*para|$)/i;
      const pagadorBancoBMGMatch = normalizedText.match(pagadorBancoBMGPattern);
      if (pagadorBancoBMGMatch && pagadorBancoBMGMatch[1]) {
        pixData.pagadorBanco = pagadorBancoBMGMatch[1].trim();
        console.log(`🏦 Banco Pagador (BMG) encontrado: ${pixData.pagadorBanco}`);
      }

      // Extrair Banco do Destinatário
      const bancoBMGPattern = /para\s+[^\n]+?\s*cpf\/cnpj\s*[^\n]+?\s*institui[çc][ãa]o\s+([^\n]+?)(?:\s*descri[çc][ãa]o|$)/i;
      const bancoBMGMatch = normalizedText.match(bancoBMGPattern);
      if (bancoBMGMatch && bancoBMGMatch[1]) {
        pixData.banco = bancoBMGMatch[1].trim();
        console.log(`🏦 Banco Destino (BMG) encontrado: ${pixData.banco}`);
      }

      // Extrair ID da Transação
      const idTransacaoBMGPattern = /id\s*da\s*transa[çc][ãa]o\s+([a-zA-Z0-9]+)/i;
      const idTransacaoBMGMatch = normalizedText.match(idTransacaoBMGPattern);
      if (idTransacaoBMGMatch && idTransacaoBMGMatch[1]) {
        pixData.idTransacao = idTransacaoBMGMatch[1].trim();
        console.log(`🆔 ID da Transação (BMG) encontrado: ${pixData.idTransacao}`);
      }

      // Extrair Observações (Descrição)
      const observacoesBMGPattern = /descri[çc][ãa]o\s+([^\n]+?)(?:\s*canal|$)/i;
      const observacoesBMGMatch = normalizedText.match(observacoesBMGPattern);
      if (observacoesBMGMatch && observacoesBMGMatch[1]) {
        pixData.observacoes = observacoesBMGMatch[1].trim();
        console.log(`📝 Observações (BMG) encontradas: ${pixData.observacoes}`);
      }

      // Extrair Valor
      const valorBMGPattern = /valor\s+r\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i;
      const valorBMGMatch = normalizedText.match(valorBMGPattern);
      if (valorBMGMatch && valorBMGMatch[1]) {
        pixData.valor = parseFloat(valorBMGMatch[1].replace('.', '').replace(',', '.'));
        console.log(`💰 Valor (BMG) encontrado: ${pixData.valor}`);
      }

      // Extrair Data e Hora
      const dataHoraBMGPattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})às(\d{1,2}):(\d{2})/i;
      const dataHoraBMGMatch = normalizedText.match(dataHoraBMGPattern);
      if (dataHoraBMGMatch) {
        const [, day, month, year, hour, minute] = dataHoraBMGMatch;
        pixData.data = `${day}/${month}/${year}`;
        pixData.hora = `${hour}:${minute}`;
        console.log(`📅 Data (BMG) encontrada: ${pixData.data}`);
        console.log(`⏰ Hora (BMG) encontrada: ${pixData.hora}`);
      }
    }

    // Lógica específica para Mercado Pago
    if (normalizedText.includes('mercado pago') || normalizedText.includes('mercado pago')) {
      console.log('Detectado comprovante do Mercado Pago. Iniciando extração específica...');

      // Extrair Pagador (* De)
      const pagadorMPPattern = /\*\s*de\s*([^\n]+?)(?:\s*cpf|\s*mercado pago|\s*agência|$)/i;
      const pagadorMPMatch = normalizedText.match(pagadorMPPattern);
      if (pagadorMPMatch && pagadorMPMatch[1]) {
        pixData.pagador = pagadorMPMatch[1].trim();
        console.log(`👤 Pagador (Mercado Pago) encontrado: ${pixData.pagador}`);
      }

      // Extrair Destinatário (* Para)
      const destinatarioMPPattern = /\*\s*para\s*([^\n]+?)(?:\s*cpf|\s*itau|\s*unibanco|\s*agência|$)/i;
      const destinatarioMPMatch = normalizedText.match(destinatarioMPPattern);
      if (destinatarioMPMatch && destinatarioMPMatch[1]) {
        pixData.destinatario = destinatarioMPMatch[1].trim();
        console.log(`👤 Destinatário (Mercado Pago) encontrado: ${pixData.destinatario}`);
      }

      // Extrair Banco do Destinatário
      const bancoMPPattern = /(itau unibanco s\.a\.|itau)/i;
      const bancoMPMatch = normalizedText.match(bancoMPPattern);
      if (bancoMPMatch && bancoMPMatch[1]) {
        pixData.banco = 'Itaú';
        console.log(`🏦 Banco (Mercado Pago) encontrado: ${pixData.banco}`);
      }

      // Extrair ID da Transação PIX
      const idTransacaoMPPattern = /id de transa[çc][ãa]o pix\s*([a-zA-Z0-9]+)/i;
      const idTransacaoMPMatch = normalizedText.match(idTransacaoMPPattern);
      if (idTransacaoMPMatch && idTransacaoMPMatch[1]) {
        pixData.idTransacao = idTransacaoMPMatch[1].trim();
        console.log(`🆔 ID da Transação (Mercado Pago) encontrado: ${pixData.idTransacao}`);
      }

      // Extrair Data e Hora
      const dataHoraMPPattern = /(?:quarta-feira|segunda-feira|terça-feira|quinta-feira|sexta-feira|sábado|domingo),\s*(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4}),\s+às\s+(\d{1,2}):(\d{2}):(\d{2})/i;
      const dataHoraMPMatch = normalizedText.match(dataHoraMPPattern);
      if (dataHoraMPMatch) {
        const [, day, monthStr, year, hour, minute, second] = dataHoraMPMatch;
        const month = monthMap[monthStr.toLowerCase().substring(0, 3)] || monthStr;
        pixData.data = `${day}/${month}/${year}`;
        pixData.hora = `${hour}:${minute}:${second}`;
        console.log(`📅 Data (Mercado Pago) encontrada: ${pixData.data}`);
        console.log(`⏰ Hora (Mercado Pago) encontrada: ${pixData.hora}`);
      }

      // Extrair Valor (se presente)
      const valorMPPattern = /(?:r\$\s*|valor\s*)(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i;
      const valorMPMatch = normalizedText.match(valorMPPattern);
      if (valorMPMatch && valorMPMatch[1]) {
        pixData.valor = parseFloat(valorMPMatch[1].replace('.', '').replace(',', '.'));
        console.log(`💰 Valor (Mercado Pago) encontrado: ${pixData.valor}`);
      }
    }

    // Identificar status
    // Adicionar logs de depuração para verificar os valores antes de isProcessedConditionMet
    writeDebugToFile(filename, `DEBUG: pagador: ${pixData.pagador}, destinatario: ${pixData.destinatario}, idTransacao: ${pixData.idTransacao}`);

    const isProcessedConditionMet = pixData.pagador && pixData.destinatario && pixData.idTransacao;
    writeDebugToFile(filename, `DEBUG: isProcessedConditionMet: ${isProcessedConditionMet}`);

    if (isProcessedConditionMet) {
      pixData.status = 'Processado';
      writeDebugToFile(filename, `DEBUG: Status atualizado para: ${pixData.status}`);
    } else {
      pixData.status = 'PDF Escaneado - Processamento Manual Necessário';
      writeDebugToFile(filename, `DEBUG: Status definido como: ${pixData.status}`);
    }

  return pixData;

  } catch (error) {
    console.error('Erro ao analisar dados PIX:', error);
    return {
      error: 'Erro ao analisar dados PIX',
      originalText: text.substring(0, 500)
    };
  }
}

/**
 * Valida se uma string parece ser uma chave PIX válida
 * @param {string} key - String para validar
 * @returns {boolean}
 */
function isValidPixKey(key) {
  if (!key || key.length < 5) return false;
  
  // CPF (11 dígitos)
  if (/^\d{11}$/.test(key)) return true;
  
  // CNPJ (14 dígitos)
  if (/^\d{14}$/.test(key)) return true;
  
  // Email
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(key)) return true;
  
  // Telefone
  if (/^\+55\s?\d{2}\s?\d{4,5}\s?\d{4}$/.test(key)) return true;
  
  // Chave aleatória (UUID-like)
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key)) return true;
  
  return false;
}

module.exports = {
  parsePixData,
  writeDebugToFile
};

const monthMap = {
  'jan': '01',
  'fev': '02',
  'mar': '03',
  'abr': '04',
  'mai': '05',
  'jun': '06',
  'jul': '07',
  'ago': '08',
  'set': '09',
  'out': '10',
  'nov': '11',
  'dez': '12',
};

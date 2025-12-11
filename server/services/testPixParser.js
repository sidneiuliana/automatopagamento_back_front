const { parsePixData } = require('./pixParser');

async function runTests() {
    console.log('Iniciando testes para parsePixData...');

    // --- Teste Nubank ---
    console.log('\n--- Teste Nubank ---');
    const nubankText = `
        Comprovante de Pagamento
        PIX
        Valor: R$ 150,00
        Data: 20/11/2023 Hora: 10:30
        Origem Nome: João da Silva
        Instituição: Nu Pagamentos - IP
        Destino Nome: Maria Oliveira
        Instituição: Banco do Brasil
        ID da Transação: EBC1234567890ABCDEF1234567890
    `;
    const nubankResult = parsePixData(nubankText, 'nubank_comprovante.txt');
    console.log('Resultado Nubank:', nubankResult);

    // --- Teste PagBank ---
    console.log('\n--- Teste PagBank ---');
    const pagbankText = `
        Comprovante de Transferência PIX
        PagBank (PagSeguro Internet Instituição de Pagamento S.A.)
        De: Ana Souza CPF: ***.123.456-**
        Para: Carlos Pereira
        Valor: R$ 75,50
        Data: 21 de Novembro de 2023 Hora: 14:15
        ID da Transação: ABCDEF0123456789ABCDEF0123456789
    `;
    const pagbankResult = parsePixData(pagbankText, 'pagbank_comprovante.txt');
    console.log('Resultado PagBank:', pagbankResult);

    // --- Teste Santander ---
    console.log('\n--- Teste Santander ---');
    const santanderText = `
        Comprovante de PIX
        BCO SANTANDER (BRASIL) S.A.
        Valor: R$ 200,00
        Data: 22/11/2023 Hora: 09:00
        Para: Fernanda Lima CPF: ***.789.012-**
        ID da Transação: 9876543210FEDCBA9876543210FEDCBA
    `;
    const santanderResult = parsePixData(santanderText, 'santander_comprovante.txt');
    console.log('Resultado Santander:', santanderResult);

    // --- Teste Caixa Econômica Federal ---
    console.log('\n--- Teste Caixa Econômica Federal ---');
    const caixaText = `
        COMPROVANTE DE PAGAMENTO PIX
        CAIXA ECONOMICA FEDERAL
        Dados do Recebedor
        Nome: Roberto Silva
        CPF: ***.321.654-**
        Dados do Pagador
        Nome: Patricia Costa
        CPF: ***.987.654-**
        Valor: R$ 300,00
        Transação: XYZ0987654321ABCDEF0987654321ABCDEF
        Data/Hora: 23/11/2023 11:45:00
    `;
    const caixaResult = parsePixData(caixaText, 'caixa_comprovante.txt');
    console.log('Resultado Caixa:', caixaResult);

    console.log('\nTestes concluídos.');
}

runTests();
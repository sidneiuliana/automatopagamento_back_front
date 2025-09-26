# 📋 Instruções de Uso - AutoPagamento PIX

## 🚀 Inicialização Rápida

### Opção 1: Script Automático (Windows)
```bash
# Execute o arquivo start.bat
start.bat
```

### Opção 2: Script Automático (Linux/Mac)
```bash
# Execute o arquivo start.sh
chmod +x start.sh
./start.sh
```

### Opção 3: Manual
```bash
# 1. Instalar dependências
npm run install-all

# 2. Iniciar aplicação (frontend + backend)
npm run dev
```

## 🌐 Acessando a Aplicação

Após a inicialização, acesse:
- **Interface Web**: http://localhost:3000
- **API Backend**: http://localhost:5000

## 📁 Como Usar

### 1. Processamento Automático
- Coloque arquivos de comprovantes PIX na pasta `arquivos/`
- O sistema detectará automaticamente e processará os arquivos
- Os dados serão extraídos e disponibilizados na interface

### 2. Upload Manual
1. Acesse http://localhost:3000
2. Arraste arquivos ou clique em "Arraste arquivos aqui"
3. Selecione imagens (JPEG, PNG, GIF) ou PDFs
4. Clique em "Processar X arquivo(s)"
5. Visualize os dados extraídos na seção direita

### 3. Processamento da Pasta Existente
- Clique no botão "Processar Pasta Arquivos"
- O sistema processará todos os arquivos na pasta `arquivos/`

## 📊 Dados Extraídos

O sistema identifica automaticamente:
- 💰 **Valor da transação**
- 👤 **Nome do destinatário**
- 🔑 **Chave PIX** (CPF, CNPJ, Email, Telefone, Chave Aleatória)
- 🏦 **Banco emissor**
- 📅 **Data e hora**
- 🆔 **ID da transação**
- ✅ **Status do pagamento**

## 🔧 Solução de Problemas

### Servidor não inicia
```bash
# Verifique se a porta 5000 está livre
netstat -ano | findstr :5000
```

### Frontend não carrega
```bash
# Verifique se a porta 3000 está livre
netstat -ano | findstr :3000
```

### Erro de dependências
```bash
# Limpe o cache e reinstale
npm cache clean --force
npm run install-all
```

### OCR não funciona bem
- Certifique-se de que a imagem está legível
- Imagens com texto muito pequeno podem ter menor precisão
- PDFs escaneados são tratados como imagens

## 📝 Exemplo de Arquivo Processado

**Arquivo**: `Sicoob comprovante (16-09-2025_18-59-25).pdf`

**Dados extraídos**:
- Valor: R$ 150,00
- Destinatário: João Silva
- Chave PIX: 123.456.789-00
- Banco: Sicoob
- Data: 16/09/2025
- Hora: 18:59
- Status: Aprovado

## 🛠️ Comandos Úteis

```bash
# Instalar apenas dependências do backend
cd server && npm install

# Instalar apenas dependências do frontend
cd client && npm install

# Executar apenas o backend
npm run server

# Executar apenas o frontend
npm run client

# Ver logs do servidor
# Os logs aparecem no console onde o servidor está rodando
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no console
2. Confirme que o Node.js 20.9.0 está instalado
3. Verifique se as portas 3000 e 5000 estão livres
4. Certifique-se de que todos os arquivos estão na estrutura correta

---

**🎉 Pronto para usar! O sistema está configurado e funcionando.**

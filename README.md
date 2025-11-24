# 🤖 AutoPagamento PIX

Sistema automatizado para extrair dados de pagamentos PIX de imagens e PDFs usando OCR (Reconhecimento Óptico de Caracteres).

## 🚀 Funcionalidades

- **OCR Inteligente**: Extrai texto de imagens (JPEG, PNG, GIF) usando Tesseract.js
- **Processamento de PDF**: Extrai texto de comprovantes PIX em PDF
- **Parser PIX**: Identifica automaticamente dados específicos de pagamentos PIX:
  - Valor da transação
  - Destinatário/Beneficiário
  - Chave PIX (CPF, CNPJ, Email, Telefone, Chave Aleatória)
  - Data e hora da transação
  - Banco emissor
  - ID da transação
  - Status do pagamento
- **Interface Web**: Interface React moderna e responsiva
- **Monitoramento Automático**: Processa automaticamente arquivos na pasta `arquivos/`
- **Upload Manual**: Permite upload direto de arquivos pela interface

## 📋 Pré-requisitos

- Node.js 20.9.0
- NPM

## 🛠️ Instalação

1. **Navegue até o diretório do projeto:**
   ```bash
   cd D:\Sidnei\automatopagamento_back_front
   ```

2. **Instale todas as dependências:**
   ```bash
   npm run install-all
   ```

## 🚀 Execução

### Desenvolvimento (Recomendado)
Execute o frontend e backend simultaneamente:
```bash
npm run dev
```

### Execução Separada

**Backend (Node.js):**
```bash
cd server
npm run dev
```
Servidor estará disponível em: http://localhost:5000

**Frontend (React):**
```bash
cd client
npm start
```
Interface estará disponível em: http://localhost:3000

## 📁 Estrutura do Projeto

```
automatopagamento/
├── server/                 # Backend Node.js
│   ├── services/          # Serviços de processamento
│   │   ├── imageProcessor.js    # OCR para imagens
│   │   ├── pdfProcessor.js      # Processamento de PDFs
│   │   └── pixParser.js         # Parser de dados PIX
│   └── index.js           # Servidor principal
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── services/      # Serviços de API
│   │   └── types/         # Tipos TypeScript
├── arquivos/              # Pasta para arquivos PIX
└── package.json           # Configurações do projeto
```

## 🔧 Como Usar

### 1. Interface Web
- Acesse http://localhost:3000
- Arraste arquivos de comprovantes PIX ou clique para selecionar
- Clique em "Processar" para extrair os dados
- Visualize os dados extraídos na seção "Dados Extraídos"

### 2. Processamento Automático
- Coloque arquivos de comprovantes PIX na pasta `arquivos/`
- O sistema detectará automaticamente novos arquivos
- Os dados serão processados e disponibilizados via API

### 3. API Endpoints

**POST /api/upload**
- Upload manual de arquivos
- Aceita múltiplos arquivos (imagens e PDFs)

**GET /api/data**
- Retorna todos os dados processados

**POST /api/process-folder**
- Processa todos os arquivos na pasta `arquivos/`

## 📊 Dados Extraídos

O sistema identifica automaticamente:

- 💰 **Valor**: Valor da transação PIX
- 👤 **Destinatário**: Nome do beneficiário
- 🔑 **Chave PIX**: CPF, CNPJ, Email, Telefone ou Chave Aleatória
- 📋 **Tipo de Chave**: Tipo identificado da chave PIX
- 🏦 **Banco**: Instituição financeira
- 📅 **Data**: Data da transação
- 🕐 **Hora**: Horário da transação
- 🆔 **ID Transação**: Identificador único
- 📝 **Observações**: Comentários adicionais
- ✅ **Status**: Status do pagamento

## 🎯 Formatos Suportados

### Imagens
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)

### Documentos
- PDF (.pdf)

## 🔍 Exemplo de Uso

1. **Faça upload de um comprovante PIX**
2. **O sistema extrairá automaticamente:**
   ```
   Valor: R$ 150,00
   Destinatário: João Silva
   Chave PIX: 123.456.789-00
   Tipo de Chave: CPF
   Banco: Sicoob
   Data: 16/09/2025
   Hora: 18:59
   Status: Aprovado
   ```

## 🛡️ Segurança

- Validação de tipos de arquivo
- Limite de tamanho de arquivos
- Sanitização de dados extraídos
- Timeout para processamento

## 🐛 Solução de Problemas

### Erro de OCR
- Certifique-se de que a imagem está legível
- Verifique se o texto está em português
- Imagens com baixa resolução podem ter menor precisão

### Erro de PDF
- Verifique se o PDF não está protegido por senha
- PDFs escaneados são tratados como imagens

### Problemas de Performance
- Arquivos muito grandes podem demorar mais para processar
- O OCR pode ser lento em dispositivos com pouca RAM

## 📝 Logs

O sistema gera logs detalhados no console:
- Progresso do OCR
- Arquivos processados
- Erros encontrados
- Dados extraídos (primeiros 200 caracteres)

## 🔄 Atualizações Futuras

- [ ] Suporte a mais formatos de imagem
- [ ] Melhoria na precisão do OCR
- [ ] Exportação de dados para Excel/CSV
- [ ] Histórico de transações
- [ ] Integração com APIs bancárias

## 📞 Suporte

Para dúvidas ou problemas, verifique os logs do console ou abra uma issue no repositório.

---

**Desenvolvido com ❤️ para automatizar o processamento de comprovantes PIX**

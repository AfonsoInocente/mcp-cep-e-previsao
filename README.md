# 🌤️ MCP CEP e Previsão do Tempo

> **Assistente Inteligente para Consultas de CEP e Previsão Meteorológica**

Um sistema MCP (Model Context Protocol) completo que combina consultas de CEP e Previsão do Tempo através de uma interface de chat conversacional inteligente. O sistema utiliza a [Deco](https://deco.chat/) com suas Tools, Workflows e AI_GENERATE_OBJECT + Fallback para entender a intenção do usuário e fornecer informações precisas sobre endereços e condições meteorológicas.

## 🚀 Funcionalidades

### 📍 **Consulta de CEPs**

- Busca completa de endereços por CEP
- Informações detalhadas: rua, bairro, cidade, estado
- Validação automática de CEPs
- Interface estruturada para visualização dos dados

### 🌤️ **Previsão do Tempo**

- Previsão meteorológica para qualquer cidade brasileira
- Dados de temperatura (mínima e máxima)
- Condições climáticas detalhadas
- Índice UV
- Interface visual com cards organizados

### 🤖 **Sistema Inteligente**

- Análise de intenções usando IA (GPT-4o-mini)
- Entendimento de linguagem natural
- Resolução automática de ambiguidades (múltiplas cidades)
- Interface de seleção com scroll para opções

### 🦾 **Sistema de fallback robusto em caso de falha da IA**

- Análise manual com regex e padrões
- Detecção automática de CEPs e cidades
- Validação via APIs externas
- Tratamento gracioso de erros de rede

### 💬 **Chat Conversacional**

- Interface moderna e responsiva
- Histórico de conversas
- Feedback visual em tempo real
- Tratamento de erros amigável

## 🛠️ Tecnologias

### **APIs e Serviços**

- **Brasil API** - Consulta de CEPs
- **CPTEC/INPE** - Previsão meteorológica
- **OpenAI GPT-4o-mini** - Análise de intenções

## 📦 Instalação

### **Pré-requisitos**

- Node.js >= 18.0.0
- npm >= 8.0.0
- Deno >= 2.0.0
- Conta no [deco.chat](https://deco.chat)

### **Passos**

1. **Clone o repositório**

   ```bash
   git clone https://github.com/AfonsoInocente/mcp-cep-e-previsao.git
   cd mcp-cep-e-previsao
   ```

2. **Instale as dependências**

   ```bash
   npm install
   ```

3. **Configure o projeto**

   ```bash
   npm run configure
   ```

4. **Inicie o desenvolvimento**
   ```bash
   npm run dev
   ```

## 🎯 Como Usar

### **Exemplos de Consultas**

O sistema entende consultas em linguagem natural:

#### **CEP**

```
"CEP 01310-100"
"Quero saber o endereço do CEP 20040-007"
"14910001"
```

#### **Previsão do Tempo**

```
"Previsão do tempo em São Paulo"
"Como está o clima em Rio de Janeiro?"
"Tempo em Belo Horizonte"
"previsao ibitinga"
```

#### **CEP + Previsão**

```
"CEP 01310-100 com previsão do tempo"
"Quero o endereço e clima do CEP 20040-007"
"14940454 previsao"
"clima 14910004"
```

### **Interface de Seleção**

Quando há múltiplas cidades com o mesmo nome, o sistema apresenta uma lista scrollável de opções para seleção.

### **Fluxo de Dados**

1. **Entrada do usuário** → Interface de chat
2. **Análise de intenção** → IA (GPT-4o-mini)
3. **Processamento** → Tools MCP específicas
4. **Resposta estruturada** → Interface organizada

## 🚀 Deploy

### **Desenvolvimento**

```bash
npm run dev
```

### **Produção**

```bash
npm run deploy
```

### **Geração de Tipos**

```bash
# Tipos de integrações externas
npm run gen

# Tipos do próprio servidor (requer servidor rodando)
DECO_SELF_URL=<dev-url> npm run gen:self
```

## 🔧 Configuração

### **Variáveis de Ambiente**

- `DECO_CHAT_WORKSPACE_API` - API do workspace Deco
- `DECO_CHAT_API` - API global do Deco
- Configurações de integração no dashboard deco.chat

### **APIs Externas**

- **Brasil API**: Consulta de CEPs (gratuita)
- **CPTEC/INPE**: Previsão meteorológica (gratuita)
- **OpenAI**: Análise de intenções (requer API key)

## 📊 Funcionalidades Técnicas

### **Sistema de Decisão Inteligente**

- Análise automática de intenções
- Extração de CEPs e cidades
- Resolução de ambiguidades
- Tratamento de erros robusto

### **Interface Responsiva**

- Design mobile-first
- Componentes reutilizáveis
- Estados de loading e erro
- Feedback visual em tempo real

### **Performance**

- Cache inteligente com TanStack Query
- Lazy loading de componentes
- Otimização de bundle
- CDN global (Cloudflare)

## 🐛 Tratamento de Erros

O sistema inclui tratamento robusto de erros:

- **CEP inválido**: Validação e sugestões
- **Cidade não encontrada**: Busca por alternativas
- **API indisponível**: Fallbacks e retry
- **Timeout**: Tratamento gracioso
- **Erros de rede**: Mensagens amigáveis

## 👨‍💻 Autor

**Afonso Inocente**

- GitHub: [@afonsoinocente](https://github.com/afonsoinocente)
- LinkedIn: [Afonso Inocente](https://linkedin.com/in/afonsoinocente)

**⭐ Se este projeto foi útil, considere dar uma estrela no repositório!**

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 segundos para processamento de arquivos
});

// Interceptor para requisições
api.interceptors.request.use(
  (config) => {
    console.log(`Fazendo requisição: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para respostas
api.interceptors.response.use(
  (response) => {
    console.log(`Resposta recebida: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('Erro na  API:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

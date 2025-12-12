import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FileUpload, PixDataDisplay } from './components';
import { PixData } from './types/PixData';
import { api } from './services/api';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 40px;
  color: white;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  opacity: 0.9;
`;

const MainContent = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const Section = styled.section`
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
`;

const SectionTitle = styled.h2`
  color: #333;
  margin-bottom: 20px;
  font-size: 1.5rem;
`;

const FilterContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
`;

const FilterLabel = styled.label`
  font-weight: 600;
  color: #495057;
`;

const Select = styled.select`
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #ced4da;
  background-color: #fff;
  font-size: 1rem;
  cursor: pointer;
  &:focus {
    border-color: #80bdff;
    outline: 0;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const StatusMessage = styled.div<{ type: 'success' | 'error' | 'info' }>`
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  background-color: ${props => 
    props.type === 'success' ? '#d4edda' :
    props.type === 'error' ? '#f8d7da' :
    '#d1ecf1'
  };
  color: ${props => 
    props.type === 'success' ? '#155724' :
    props.type === 'error' ? '#721c24' :
    '#0c5460'
  };
  border: 1px solid ${props => 
    props.type === 'success' ? '#c3e6cb' :
    props.type === 'error' ? '#f5c6cb' :
    '#bee5eb'
  };
`;

function App() {
  const [pixData, setPixData] = useState<PixData[]>([]);
  const [unprocessedPixData, setUnprocessedPixData] = useState<PixData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [availableMonthsYears, setAvailableMonthsYears] = useState<string[]>([]);
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>('');

  const [uploadKey, setUploadKey] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const extractMonthsYears = useCallback((data: PixData[]): string[] => {
    console.log("Dados recebidos para extractMonthsYears:", data);
    const monthsYears = new Set<string>();
    data.forEach(item => {
      // console.log("Item individual em extractMonthsYears:", item);
      if (item.data_transferencia) {
        try {
          const date = new Date(item.data_transferencia);
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear().toString();
          monthsYears.add(`${month}/${year}`);
        } catch (error) {
          console.error("Erro ao processar data_transferencia:", item.data_transferencia, error);
        }
      }
    });
    const sortedMonthsYears = Array.from(monthsYears).sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      if (yearA !== yearB) {
        return yearA - yearB;
      }
      return monthA - monthB;
    });
    return sortedMonthsYears;
  }, []);

  const loadExistingData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PixData[]>('/api/data');
      const processedData = response.data;
      console.log('DEBUG (loadExistingData): Dados processados recebidos do backend:', processedData);
      setPixData(processedData);

      const unprocessedResponse = await api.get<PixData[]>('/api/unprocessed-data');
      const rawUnprocessedData = unprocessedResponse.data;
      console.log('DEBUG (loadExistingData): Dados não processados recebidos do backend:', rawUnprocessedData);
      setUnprocessedPixData(rawUnprocessedData);

      const allData = [...processedData, ...rawUnprocessedData];
      console.log('DEBUG (loadExistingData): Todos os dados combinados para extração de meses/anos:', allData);
      const extracted = extractMonthsYears(allData);
      console.log('DEBUG (loadExistingData): Meses/Anos disponíveis (ordenados):', extracted);
      setAvailableMonthsYears(extracted);

      setMessage({ text: 'Dados carregados com sucesso!', type: 'success' });
      setRefreshKey(prev => prev + 1); // Incrementa a chave para forçar a remontagem dos componentes de exibição
    } catch (error) {
      console.error('Erro ao carregar dados existentes:', error);
      setMessage({ text: 'Erro ao carregar dados existentes.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setPixData, setUnprocessedPixData, setMessage, setLoading, extractMonthsYears, setAvailableMonthsYears, setRefreshKey]);

  useEffect(() => {
    console.log('DEBUG (useEffect): useEffect em App.tsx disparado, chamando loadExistingData');
    loadExistingData();
  }, [loadExistingData]);

  const handleFileUpload = async (files: File[]) => {
    setLoading(true);
    setMessage(null);

    try {
      const existingFilenames = new Set([
        ...pixData.map(item => item.filename),
        ...unprocessedPixData.map(item => item.filename)
      ]);

      const filesToUpload = files.filter(file => {
        if (existingFilenames.has(file.name)) {
          setMessage({ text: `O arquivo '${file.name}' já foi processado anteriormente.`, type: 'info' });
          return false;
        }
        return true;
      });

      if (filesToUpload.length === 0) {
        setLoading(false);
        return;
      }

      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append('file', file);
      });

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setMessage({
          text: `${files.length} arquivo(s) processado(s) com sucesso!`,
          type: 'success'
        });
        await loadExistingData(); // Recarrega os dados do banco após o upload
      }
    } catch (error: any) {
      console.error('Erro no upload:', error);
      setMessage({
        text: error.response?.data?.error || 'Erro ao processar arquivos',
        type: 'error'
      });
      } finally {
        setLoading(false);
        setUploadKey(prev => prev + 1); // Incrementa a chave para forçar a remontagem do FileUpload
      }
    };



  const filteredPixData = pixData.filter(item => {
    if (!selectedMonthYear) return true;
    if (!item.data_transferencia) return false;

    try {
      const date = new Date(item.data_transferencia);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString();
      return `${month}/${year}` === selectedMonthYear;
    } catch (error) {
      console.error("Erro ao filtrar data_transferencia:", item.data_transferencia, error);
      return false;
    }
  });

  const filteredUnprocessedPixData = unprocessedPixData.filter(item => {
    if (!selectedMonthYear) return true;
    if (!item.data_transferencia) return false;

    try {
      const date = new Date(item.data_transferencia);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString();
      return `${month}/${year}` === selectedMonthYear;
    } catch (error) {
      console.error("Erro ao filtrar data_transferencia:", item.data_transferencia, error);
      return false;
    }
  });

  console.log('DEBUG (render): selectedMonthYear:', selectedMonthYear);
  console.log('DEBUG (render): filteredPixData.length:', filteredPixData.length);
  console.log('DEBUG (render): filteredUnprocessedPixData.length:', filteredUnprocessedPixData.length);

  return (
    <AppContainer>
      <Header>
        <Title>🤖 AutoPagamento PIX</Title>
        <Subtitle>Extrator automático de dados de pagamentos PIX</Subtitle>
      </Header>

      <MainContent>
        <Section>
          <SectionTitle>📁 Upload de Arquivos</SectionTitle>
          
          {message && (
            <StatusMessage type={message.type}>
              {message.text}
            </StatusMessage>
          )}

          <FileUpload 
            key={uploadKey} // Adiciona a key para forçar a remontagem e limpar o campo
            onFileUpload={handleFileUpload}
            loading={loading}

          />
        </Section>

        <Section>
          <SectionTitle>📊 Dados Extraídos ({filteredPixData.length})</SectionTitle>
          
          <FilterContainer>
            <FilterLabel>Filtrar por Data:</FilterLabel>
            <Select value={selectedMonthYear} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMonthYear(e.target.value)}>
              <option value="">Mês/Ano</option>
              {availableMonthsYears.map(monthYear => (
                <option key={monthYear} value={monthYear}>{monthYear}</option>
              ))}
            </Select>
          </FilterContainer>

          {filteredPixData.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
              Nenhum arquivo processado ainda.<br />
              Faça upload de imagens ou PDFs de comprovantes PIX.
            </p>
          ) : (
            <PixDataDisplay key={refreshKey} data={filteredPixData} />
          )}
          
          {filteredUnprocessedPixData.length > 0 && (
            <SectionTitle>Dados Não Processados ({filteredUnprocessedPixData.length})</SectionTitle>
          )}
          {filteredUnprocessedPixData.length > 0 && (
            <PixDataDisplay key={refreshKey} data={filteredUnprocessedPixData} />
          )}
        </Section>
      </MainContent>
    </AppContainer>
  );
}

export default App;

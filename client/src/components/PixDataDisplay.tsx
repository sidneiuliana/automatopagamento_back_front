import React, { useState } from 'react';
import styled from 'styled-components';
import { PixData } from '../types/PixData';

interface PixDataDisplayProps {
  data: PixData[];
}

const DataContainer = styled.div`
  max-height: 600px;
  overflow-y: auto;
`;

const DataItem = styled.div`
  border: 1px solid #ddd;
  border-radius: 10px;
  margin-bottom: 15px;
  overflow: hidden;
`;

const DataHeader = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const DataContent = styled.div`
  padding: 20px;
  background: white;
`;

const DataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
`;

const DataField = styled.div`
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
`;

const FieldLabel = styled.div`
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
  margin-bottom: 5px;
  text-transform: uppercase;
`;

const FieldValue = styled.div`
  color: #212529;
  font-size: 1rem;
  word-break: break-word;
`;

const PixDataDisplay: React.FC<PixDataDisplayProps> = ({ data }) => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
        <p>Nenhum dado PIX encontrado.</p>
      </div>
    );
  }

  return (
    <DataContainer>
      {data.map((item, index) => (
        <DataItem key={index}>
          <DataHeader onClick={() => toggleExpanded(index)}>
            <div>
              <div style={{ fontWeight: 500, fontSize: '1.1rem' }}>
                {item.filename || `Pagamento ${index + 1}`}
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                {item.valor && `Valor: R$ ${item.valor}`}
                {item.data && ` • ${item.data}`}
                {item.banco && ` • ${item.banco}`}
              </div>
            </div>
            <div>{expandedItems.has(index) ? '▲' : '▼'}</div>
          </DataHeader>

          {expandedItems.has(index) && (
            <DataContent>
              {item.error ? (
                <div style={{ color: '#dc3545', padding: '10px', background: '#f8d7da', borderRadius: '5px' }}>
                  <strong>Erro:</strong> {item.error}
                </div>
              ) : (
                <DataGrid>
                  {item.valor && (
                    <DataField>
                      <FieldLabel>💰 Valor</FieldLabel>
                      <FieldValue>R$ {item.valor}</FieldValue>
                    </DataField>
                  )}

                  {item.destinatario && (
                    <DataField>
                      <FieldLabel>👤 Destinatário</FieldLabel>
                      <FieldValue>{item.destinatario}</FieldValue>
                    </DataField>
                  )}

                  {item.chavePix && (
                    <DataField>
                      <FieldLabel>🔑 Chave PIX</FieldLabel>
                      <FieldValue>{item.chavePix}</FieldValue>
                    </DataField>
                  )}

                  {item.banco && (
                    <DataField>
                      <FieldLabel>🏦 Banco</FieldLabel>
                      <FieldValue>{item.banco}</FieldValue>
                    </DataField>
                  )}

                  {item.data && (
                    <DataField>
                      <FieldLabel>📅 Data</FieldLabel>
                      <FieldValue>{item.data}</FieldValue>
                    </DataField>
                  )}

                  {item.hora && (
                    <DataField>
                      <FieldLabel>🕐 Hora</FieldLabel>
                      <FieldValue>{item.hora}</FieldValue>
                    </DataField>
                  )}
                </DataGrid>
              )}
            </DataContent>
          )}
        </DataItem>
      ))}
    </DataContainer>
  );
};

export default PixDataDisplay;
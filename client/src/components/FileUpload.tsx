import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styled from 'styled-components';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  loading: boolean;
  onProcessFolder: () => void;
}

const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DropzoneContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['isDragActive'].includes(prop),
})<{ isDragActive: boolean }>`
  border: 2px dashed ${props => props.isDragActive ? '#667eea' : '#ddd'};
  border-radius: 10px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: ${props => props.isDragActive ? '#f8f9ff' : '#fafafa'};
  
  &:hover {
    border-color: #667eea;
    background-color: #f8f9ff;
  }
`;

const DropzoneText = styled.div`
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 10px;
`;

const DropzoneSubtext = styled.div`
  color: #999;
  font-size: 0.9rem;
`;

const FileList = styled.div`
  margin-top: 20px;
`;

const FileItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 5px;
  margin-bottom: 5px;
`;

const FileName = styled.span`
  font-weight: 500;
`;

const FileSize = styled.span`
  color: #666;
  font-size: 0.9rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 20px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: ${props => props.variant === 'primary' ? '#667eea' : '#6c757d'};
  color: white;
  
  &:hover:not(:disabled) {
    background-color: ${props => props.variant === 'primary' ? '#5a6fd8' : '#5a6268'};
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 10px;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, loading, onProcessFolder }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 10,
    disabled: loading
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <UploadContainer>
      <DropzoneContainer {...getRootProps()} isDragActive={isDragActive}>
        <input {...getInputProps()} />
        <DropzoneText>
          {isDragActive ? 'Solte os arquivos aqui...' : 'Arraste arquivos aqui ou clique para selecionar'}
        </DropzoneText>
        <DropzoneSubtext>
          Formatos aceitos: JPEG, PNG, GIF, PDF (máx. 10 arquivos)
        </DropzoneSubtext>
      </DropzoneContainer>

      {acceptedFiles.length > 0 && (
        <FileList>
          <h4>Arquivos selecionados:</h4>
          {acceptedFiles.map((file, index) => (
            <FileItem key={index}>
              <FileName>{file.name}</FileName>
              <FileSize>{formatFileSize(file.size)}</FileSize>
            </FileItem>
          ))}
        </FileList>
      )}

      <ButtonContainer>
        <Button 
          variant="primary" 
          onClick={() => onFileUpload(acceptedFiles as File[])}
          disabled={loading || acceptedFiles.length === 0}
        >
          {loading ? (
            <>
              <LoadingSpinner />
              Processando...
            </>
          ) : (
            `Processar ${acceptedFiles.length} arquivo(s)`
          )}
        </Button>
        
        <Button 
          variant="secondary" 
          onClick={onProcessFolder}
          disabled={loading}
        >
          {loading ? (
            <>
              <LoadingSpinner />
              Processando...
            </>
          ) : (
            'Processar Pasta Arquivos'
          )}
        </Button>
      </ButtonContainer>
    </UploadContainer>
  );
};

export default FileUpload;

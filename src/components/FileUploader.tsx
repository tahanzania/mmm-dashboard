import React, { useCallback, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { parseCSVData } from '../utils/dataParser';
import type { MMMDataRow } from '../utils/types';

interface FileUploaderProps {
  onDataLoaded: (data: MMMDataRow[]) => void;
}

export function FileUploader({ onDataLoaded }: FileUploaderProps) {
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const parsedData = await parseCSVData(file);
      if (parsedData.length === 0) {
        throw new Error('CSV is empty or could not be parsed.');
      }
      onDataLoaded(parsedData);
    } catch (e: any) {
      setError(e.message || 'Error processing the file. Please ensure it matches the required schema.');
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
       handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center container">
      <div 
        className="file-dropzone" 
        onDragOver={(e) => e.preventDefault()} 
        onDrop={onDrop}
        style={{ maxWidth: '600px', width: '100%' }}
      >
        <UploadCloud size={64} className="text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Upload MMM Data CSV</h2>
        <p className="text-muted mb-6">Drag and drop your `mmmrawtable.csv` file here, or click to browse</p>
        
        {error && <div className="text-sm border p-2 mb-4 rounded-lg bg-card text-center" style={{ borderColor: 'var(--chart-5)', color: 'var(--chart-5)' }}>{error}</div>}

        <label className="btn" style={{ cursor: 'pointer' }}>
          Browse File
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            style={{ display: 'none' }} 
            onChange={onChange} 
          />
        </label>
      </div>
    </div>
  );
}

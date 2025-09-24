import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  uploadProgress: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ uploadProgress }) => {
  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-black">Загрузка видео</span>
        <span className="text-sm font-medium text-black">{Math.round(uploadProgress)}%</span>
      </div>
      <Progress 
        value={uploadProgress} 
        className="h-2 bg-gray-200"
      />
      <div className="mt-2 text-xs text-black">
        {uploadProgress < 30 && "Подготовка видео..."}
        {uploadProgress >= 30 && uploadProgress < 60 && "Сжатие файла..."}
        {uploadProgress >= 60 && uploadProgress < 90 && "Отправка в Telegram..."}
        {uploadProgress >= 90 && uploadProgress < 100 && "Почти готово..."}
        {uploadProgress >= 100 && "Готово!"}
      </div>
    </div>
  );
};

export default ProgressIndicator;
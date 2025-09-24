import React from 'react';
import Icon from '@/components/ui/icon';

interface SuccessScreenProps {
  onCreateNew: () => void;
}

const SuccessScreen: React.FC<SuccessScreenProps> = ({ onCreateNew }) => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-black rounded-full flex items-center justify-center">
          <Icon name="Check" size={24} className="text-white" />
        </div>
        <h2 className="text-2xl font-medium text-black mb-6">
          Отправлено
        </h2>
        <button 
          onClick={onCreateNew}
          className="w-full bg-black text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Создать новый
        </button>
      </div>
    </div>
  );
};

export default SuccessScreen;
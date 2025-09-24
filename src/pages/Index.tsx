import React, { useState, useRef, useCallback, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import Auth from './Auth';
import Dashboard from './Dashboard';
import VideoRecorder from '@/components/VideoRecorder';
import CommentForm from '@/components/CommentForm';
import SuccessScreen from '@/components/SuccessScreen';
import ProgressIndicator from '@/components/ProgressIndicator';

interface VideoRecordingState {
  isRecording: boolean;
  recordedBlob: Blob | null;
  stream: MediaStream | null;
}

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

const Index = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [currentView, setCurrentView] = useState<'dashboard' | 'recording'>('dashboard');
  const [comments, setComments] = useState('');
  const [videoState, setVideoState] = useState<VideoRecordingState>({
    isRecording: false,
    recordedBlob: null,
    stream: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Проверяем авторизацию при загрузке
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const handleAuth = (userData: any, userToken: string) => {
    setUser(userData);
    setToken(userToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken('');
    setCurrentView('dashboard');
  };

  const handleStartRecording = () => {
    setCurrentView('recording');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    // Сбрасываем состояние записи
    setComments('');
    setVideoState({
      isRecording: false,
      recordedBlob: null,
      stream: null,
    });
    setIsSuccess(false);
    setUploadProgress(0);
    setLocation(null);
    chunksRef.current = [];
  };

  const saveLead = useCallback(async () => {
    if (!comments.trim() || !videoState.recordedBlob) {
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Конвертируем blob в base64 для отправки на сервер
      const videoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(videoState.recordedBlob!);
      });

      // Данные для отправки на сервер
      const leadData = {
        filename: `lead-video-${Date.now()}.mp4`,
        original_filename: `video-${new Date().toLocaleDateString('ru-RU')}.mp4`,
        comments: comments,
        videoBase64: videoBase64,
        latitude: location?.latitude,
        longitude: location?.longitude
      };

      setUploadProgress(30);

      // Отправляем данные на сервер
      const response = await fetch('https://functions.poehali.dev/ad81c32f-6f6d-4eca-9841-da0f99740909', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user?.id || 1)
        },
        body: JSON.stringify(leadData)
      });

      setUploadProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка сохранения на сервере');
      }

      const result = await response.json();
      console.log('Лид сохранен на сервере:', result);
      
      setUploadProgress(100);

      console.log('Лид успешно сохранен на сервере');
      
      // Небольшая задержка для показа 100%
      setTimeout(() => {
        setIsSuccess(true);
      }, 500);
      
    } catch (error) {
      console.error('Ошибка сохранения лида:', error);
      alert('Не удалось сохранить лид. Попробуйте еще раз.');
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
        setUploadProgress(0);
      }, 1500);
    }
  }, [comments, videoState.recordedBlob, location, user]);

  const createNewLead = useCallback(() => {
    handleBackToDashboard();
  }, []);

  // Если пользователь не авторизован, показываем страницу авторизации
  if (!user) {
    return <Auth onAuth={handleAuth} />;
  }

  // Если пользователь на главной странице dashboard
  if (currentView === 'dashboard') {
    return <Dashboard 
      user={user} 
      token={token} 
      onLogout={handleLogout} 
      onStartRecording={handleStartRecording} 
    />;
  }

  // Если показываем экран успеха
  if (isSuccess) {
    return <SuccessScreen onCreateNew={createNewLead} />;
  }

  // Основная страница записи видео
  return (
    <div className="min-h-screen !bg-white" style={{backgroundColor: 'white'}}>
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={handleBackToDashboard}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Icon name="ArrowLeft" className="w-5 h-5 mr-2" />
            Назад к кабинету
          </button>
          <h1 className="text-3xl font-medium text-gray-900">
            Записать видео
          </h1>
          <div className="w-20"></div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <CommentForm 
            comments={comments}
            onCommentsChange={setComments}
          />

          <VideoRecorder
            videoState={videoState}
            onVideoStateChange={setVideoState}
            onLocationChange={setLocation}
            mediaRecorderRef={mediaRecorderRef}
            chunksRef={chunksRef}
          />
        </div>

        <div className="text-center space-y-4">
          {isSubmitting && (
            <ProgressIndicator uploadProgress={uploadProgress} />
          )}
          
          <button 
            onClick={saveLead}
            disabled={!comments.trim() || !videoState.recordedBlob || isSubmitting}
            className={`px-8 py-4 rounded-lg font-medium transition-all duration-200 border-0 ${
              (!comments.trim() || !videoState.recordedBlob || isSubmitting) 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-black text-white hover:bg-gray-800 hover:scale-105'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Сохраняем...</span>
              </div>
            ) : (
              'Сохранить лид'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
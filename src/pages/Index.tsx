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
      // Симуляция прогресса сохранения
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 20;
        });
      }, 150);

      // Создаем объект видео для сохранения
      const videoData = {
        id: Date.now(),
        filename: `lead-video-${Date.now()}.mp4`,
        original_filename: `video-${new Date().toLocaleDateString('ru-RU')}.mp4`,
        comments: comments,
        created_at: new Date().toISOString(),
        user_id: user?.id || 0,
        location: location,
        // Конвертируем blob в base64 для хранения в localStorage
        videoBase64: await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(videoState.recordedBlob!);
        })
      };

      // Получаем существующие видео пользователя
      const existingVideos = JSON.parse(localStorage.getItem(`user_videos_${user?.id}`) || '[]');
      
      // Добавляем новое видео
      existingVideos.unshift(videoData); // Добавляем в начало массива (новые сверху)
      
      // Сохраняем обновленный список
      localStorage.setItem(`user_videos_${user?.id}`, JSON.stringify(existingVideos));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log('Видео сохранено в личном кабинете');
      
      // Небольшая задержка для показа 100%
      setTimeout(() => {
        setIsSuccess(true);
      }, 500);
      
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
        setUploadProgress(0);
      }, 500);
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
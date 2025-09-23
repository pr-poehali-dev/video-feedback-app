import React, { useState, useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';

interface VideoRecordingState {
  isRecording: boolean;
  recordedBlob: Blob | null;
  stream: MediaStream | null;
}

const Index = () => {
  const [comments, setComments] = useState('');
  const [videoState, setVideoState] = useState<VideoRecordingState>({
    isRecording: false,
    recordedBlob: null,
    stream: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      console.log('Запрос доступа к камере...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 360 },
        },
        audio: true,
      });
      console.log('Получен доступ к камере');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Пробуем разные форматы в порядке приоритета
      const supportedFormats = [
        'video/mp4;codecs=h264,aac',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        ''  // Default format
      ];
      
      let selectedFormat = '';
      console.log('Проверяем поддерживаемые форматы...');
      for (const format of supportedFormats) {
        const isSupported = MediaRecorder.isTypeSupported(format);
        console.log(`Формат "${format}": ${isSupported ? 'поддерживается' : 'не поддерживается'}`);
        if (isSupported && !selectedFormat) {
          selectedFormat = format;
          console.log(`✅ Выбран формат: ${format || 'default'}`);
        }
      }

      console.log('Создаю MediaRecorder с форматом:', selectedFormat || 'default');
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedFormat || undefined,
        videoBitsPerSecond: 500000, // 500kbps для стабильной отправки в Telegram
        audioBitsPerSecond: 64000,  // 64kbps для аудио
      });
      console.log('MediaRecorder создан успешно');

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Получены данные:', event.data.size, 'байт');
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Запись остановлена, всего чанков:', chunksRef.current.length);
        // Все форматы конвертируем в MP4 на бэкенде
        const blob = new Blob(chunksRef.current, { type: selectedFormat || 'video/mp4' });
        console.log('Создан blob размером:', blob.size, 'байт');
        setVideoState(prev => ({ 
          ...prev, 
          recordedBlob: blob, 
          isRecording: false 
        }));
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onstart = () => {
        console.log('Запись началась');
      };

      mediaRecorder.onerror = (event) => {
        console.error('Ошибка MediaRecorder:', event);
      };

      mediaRecorderRef.current = mediaRecorder;
      console.log('Запускаю запись...');
      mediaRecorder.start();

      setVideoState(prev => ({ 
        ...prev, 
        isRecording: true, 
        stream 
      }));

    } catch (error) {
      console.error('Ошибка доступа к камере:', error);
      // Показываем пользователю понятную ошибку
      alert('Не удалось получить доступ к камере. Проверьте разрешения в браузере.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    console.log('Попытка остановить запись...');
    if (mediaRecorderRef.current && videoState.isRecording) {
      console.log('Останавливаю MediaRecorder...');
      mediaRecorderRef.current.stop();
    } else {
      console.log('MediaRecorder не активен или запись не ведется');
    }
  }, [videoState.isRecording]);

  const retakeVideo = useCallback(() => {
    setVideoState({
      isRecording: false,
      recordedBlob: null,
      stream: null,
    });
    chunksRef.current = [];
  }, []);

  const submitLead = useCallback(async () => {
    if (!comments.trim() || !videoState.recordedBlob) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('comments', comments);
      // Всегда отправляем как MP4, бэкенд сконвертирует
      formData.append('video', videoState.recordedBlob, 'lead-video.mp4');

      const response = await fetch('https://functions.poehali.dev/dbc5b737-4ec3-4728-8821-efee0a87c56c', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Ответ сервера:', result);
        setIsSuccess(true);
      } else {
        const error = await response.json();
        console.error('Ошибка отправки:', error);
      }
    } catch (error) {
      console.error('Ошибка отправки:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [comments, videoState.recordedBlob]);

  const createNewLead = useCallback(() => {
    setComments('');
    setVideoState({
      isRecording: false,
      recordedBlob: null,
      stream: null,
    });
    setIsSuccess(false);
    chunksRef.current = [];
  }, []);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center">
            <Icon name="Check" size={24} className="text-white" />
          </div>
          <h2 className="text-2xl font-medium text-gray-900 mb-6">
            Отправлено
          </h2>
          <button 
            onClick={createNewLead}
            className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Создать новый
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        <div className="text-center mb-12">
          <h1 className="text-3xl font-medium text-gray-900 mb-4">
            Видео Лид
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Комментарий
              </label>
              <textarea
                placeholder="Ваше сообщение..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                maxLength={500}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Видео
              </label>
              
              <div className="relative">
                {/* Скрытое видео для записи */}
                <video
                  ref={videoRef}
                  className="hidden"
                  muted
                  playsInline
                />
                
                {/* Заглушка вместо превью */}
                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                  <div className="text-center">
                    {!videoState.isRecording && !videoState.recordedBlob && (
                      <>
                        <Icon name="Camera" size={32} className="text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Нажмите для записи</p>
                      </>
                    )}
                    
                    {videoState.isRecording && (
                      <>
                        <div className="relative w-8 h-8 mx-auto mb-2">
                          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping"></div>
                          <div className="relative w-8 h-8 bg-red-600 rounded-full"></div>
                        </div>
                        <p className="text-red-600 font-medium">IMPERIA PROMO</p>
                      </>
                    )}
                    
                    {videoState.recordedBlob && !videoState.isRecording && (
                      <>
                        <Icon name="CheckCircle" size={32} className="text-green-500 mx-auto mb-2" />
                        <p className="text-green-600 font-medium">Видео записано</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {!videoState.isRecording && !videoState.recordedBlob && (
                  <button 
                    onClick={startRecording}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Начать запись
                  </button>
                )}

                {videoState.isRecording && (
                  <button 
                    onClick={stopRecording}
                    className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Остановить
                  </button>
                )}

                {videoState.recordedBlob && !videoState.isRecording && (
                  <div className="flex space-x-3">
                    <button 
                      onClick={retakeVideo}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Переснять
                    </button>
                    <div className="flex items-center px-4 py-3 bg-green-50 text-green-700 rounded-lg">
                      <Icon name="Check" className="w-4 h-4 mr-2" />
                      Готово
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button 
            onClick={submitLead}
            disabled={!comments.trim() || !videoState.recordedBlob || isSubmitting}
            className={`px-8 py-4 rounded-lg font-medium transition-colors ${
              (!comments.trim() || !videoState.recordedBlob || isSubmitting) 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isSubmitting ? 'Отправляем...' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
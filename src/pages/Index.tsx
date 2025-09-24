import React, { useState, useRef, useCallback, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';

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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Запрашиваем местоположение
      console.log('Запрос местоположения...');
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });
        
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        setLocation(locationData);
        console.log('Местоположение получено:', locationData);
      } catch (locationError) {
        console.warn('Не удалось получить местоположение:', locationError);
        // Продолжаем без местоположения
      }

      console.log('Запрос доступа к камере...');
      
      // Определяем Android устройство
      const isAndroid = /Android/i.test(navigator.userAgent);
      console.log('Android устройство:', isAndroid);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: isAndroid ? 426 : 640 },    // 240p для Android (426x240)
          height: { ideal: isAndroid ? 240 : 360 },   // 240p для Android
          frameRate: { ideal: isAndroid ? 15 : 30 },  // Меньше FPS для Android
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: isAndroid ? 16000 : 48000,      // Меньше частота для Android
          channelCount: 1,                            // Моно для лучшей совместимости
        },
      });
      console.log('Получен доступ к камере');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Приоритет форматов для Android (максимальная совместимость с Telegram)
      const supportedFormats = isAndroid ? [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',  // H.264 Baseline Profile + AAC-LC (самый совместимый)
        'video/mp4;codecs=h264,aac',               // H.264 + AAC
        'video/mp4',                               // MP4 базовый
        'video/webm;codecs=vp8,opus',             // VP8 как запасной для старых Android
        ''  // Default format
      ] : [
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
        videoBitsPerSecond: isAndroid ? 200000 : 500000,  // 200kbps для Android (240p), 500kbps для остальных
        audioBitsPerSecond: isAndroid ? 32000 : 64000,    // 32kbps для Android (моно), 64kbps для остальных
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
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('comments', comments);
      formData.append('video', videoState.recordedBlob, 'lead-video.mp4');
      
      if (location) {
        formData.append('location', JSON.stringify(location));
        console.log('Отправляю местоположение:', location);
      }

      // Симуляция прогресса загрузки
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      const response = await fetch('https://functions.poehali.dev/dbc5b737-4ec3-4728-8821-efee0a87c56c', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        console.log('Ответ сервера:', result);
        
        // Небольшая задержка для показа 100%
        setTimeout(() => {
          setIsSuccess(true);
        }, 500);
      } else {
        const error = await response.json();
        console.error('Ошибка отправки:', error);
      }
    } catch (error) {
      console.error('Ошибка отправки:', error);
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
        setUploadProgress(0);
      }, 500);
    }
  }, [comments, videoState.recordedBlob, location]);

  const createNewLead = useCallback(() => {
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
            Создайте Лид
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
                      <p className="text-black font-medium">IMPERIA PROMO</p>
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
                    className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors"
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

        <div className="text-center space-y-4">
          {isSubmitting && (
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Загрузка видео</span>
                <span className="text-sm font-medium text-black">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress 
                value={uploadProgress} 
                className="h-2 bg-gray-200"
              />
              <div className="mt-2 text-xs text-gray-500">
                {uploadProgress < 30 && "Подготовка видео..."}
                {uploadProgress >= 30 && uploadProgress < 60 && "Сжатие файла..."}
                {uploadProgress >= 60 && uploadProgress < 90 && "Отправка в Telegram..."}
                {uploadProgress >= 90 && uploadProgress < 100 && "Почти готово..."}
                {uploadProgress >= 100 && "Готово!"}
              </div>
            </div>
          )}
          
          <button 
            onClick={submitLead}
            disabled={!comments.trim() || !videoState.recordedBlob || isSubmitting}
            className={`px-8 py-4 rounded-lg font-medium transition-all duration-200 ${
              (!comments.trim() || !videoState.recordedBlob || isSubmitting) 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Отправляем...</span>
              </div>
            ) : (
              'Отправить'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
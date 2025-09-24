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

  // Функция сжатия видео для Android
  const compressVideoForAndroid = useCallback(async (originalBlob: Blob, mimeType: string): Promise<Blob> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Создаем объект URL для видео
      const videoUrl = URL.createObjectURL(originalBlob);
      video.src = videoUrl;
      video.muted = true;
      
      video.onloadedmetadata = () => {
        // Устанавливаем еще меньшее разрешение для сжатия
        const targetWidth = 320;  // 320p для максимального сжатия
        const targetHeight = Math.floor((video.videoHeight / video.videoWidth) * targetWidth);
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        console.log(`🔧 Сжимаем видео: ${video.videoWidth}x${video.videoHeight} → ${targetWidth}x${targetHeight}`);
        
        const chunks: Blob[] = [];
        const stream = canvas.captureStream(10); // 10 FPS для сжатия
        
        const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8', // Используем WebM для лучшего сжатия
          videoBitsPerSecond: 80000, // Очень низкий битрейт - 80kbps
        });
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: 'video/webm' });
          console.log(`✅ Видео сжато: ${(originalBlob.size/1024/1024).toFixed(1)}MB → ${(compressedBlob.size/1024/1024).toFixed(1)}MB`);
          
          // Очищаем ресурсы
          URL.revokeObjectURL(videoUrl);
          resolve(compressedBlob);
        };
        
        recorder.start();
        video.play();
        
        // Рисуем кадры на canvas
        const drawFrame = () => {
          if (!video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            requestAnimationFrame(drawFrame);
          } else {
            recorder.stop();
          }
        };
        
        video.onplay = () => drawFrame();
      };
    });
  }, []);

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

      mediaRecorder.onstop = async () => {
        console.log('Запись остановлена, всего чанков:', chunksRef.current.length);
        
        // Все форматы конвертируем в MP4 на бэкенде
        const originalBlob = new Blob(chunksRef.current, { type: selectedFormat || 'video/mp4' });
        console.log('Создан оригинальный blob размером:', originalBlob.size, 'байт');
        
        let finalBlob = originalBlob;
        
        // Для Android: проверяем размер и сжимаем если нужно
        if (isAndroid && originalBlob.size > 20 * 1024 * 1024) { // Более 20MB
          console.log('🔧 Видео слишком большое для Android, применяю сжатие...');
          try {
            finalBlob = await compressVideoForAndroid(originalBlob, selectedFormat || 'video/mp4');
            console.log('✅ Видео сжато с', originalBlob.size, 'до', finalBlob.size, 'байт');
          } catch (compressionError) {
            console.warn('⚠️ Не удалось сжать видео, отправляю оригинал:', compressionError);
            finalBlob = originalBlob;
          }
        }
        
        setVideoState(prev => ({ 
          ...prev, 
          recordedBlob: finalBlob, 
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

  // Функция для чанковой отправки больших видео
  const uploadVideoInChunks = useCallback(async (videoBlob: Blob) => {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB чанки для стабильности
    const totalChunks = Math.ceil(videoBlob.size / CHUNK_SIZE);
    const uploadId = Date.now().toString();
    
    console.log(`📦 Разделяю видео на ${totalChunks} частей по ${CHUNK_SIZE / 1024 / 1024}MB`);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, videoBlob.size);
      const chunk = videoBlob.slice(start, end);
      
      const chunkFormData = new FormData();
      chunkFormData.append('chunk', chunk, `chunk-${i}.mp4`);
      chunkFormData.append('uploadId', uploadId);
      chunkFormData.append('chunkIndex', i.toString());
      chunkFormData.append('totalChunks', totalChunks.toString());
      
      // Добавляем метаданные только в первый чанк
      if (i === 0) {
        chunkFormData.append('comments', comments);
        if (location) {
          chunkFormData.append('location', JSON.stringify(location));
        }
      }
      
      const chunkResponse = await fetch('https://functions.poehali.dev/56850dbd-ea0f-428f-b6e0-1814383f74c6', {
        method: 'POST',
        body: chunkFormData,
      });
      
      if (!chunkResponse.ok) {
        throw new Error(`Ошибка отправки части ${i + 1}/${totalChunks}`);
      }
      
      // Обновляем прогресс
      const progress = Math.floor(((i + 1) / totalChunks) * 100);
      setUploadProgress(progress);
      console.log(`✅ Отправлена часть ${i + 1}/${totalChunks} (${progress}%)`);
    }
    
    console.log('🎉 Все части видео успешно отправлены!');
    return { success: true, message: 'Видео успешно отправлено' };
  }, [comments, location]);

  const submitLead = useCallback(async () => {
    if (!comments.trim() || !videoState.recordedBlob) {
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    const isAndroid = /Android/i.test(navigator.userAgent);
    const videoBlob = videoState.recordedBlob;
    const isLargeVideo = videoBlob.size > 20 * 1024 * 1024; // Больше 20MB

    console.log('📤 Отправка видео:', {
      size: `${(videoBlob.size / 1024 / 1024).toFixed(1)}MB`,
      isAndroid,
      isLargeVideo,
      strategy: isAndroid && isLargeVideo ? 'chunks' : 'standard'
    });

    try {
      let result;
      
      if (isAndroid && isLargeVideo) {
        console.log('🔄 Используем чанковую отправку для Android');
        result = await uploadVideoInChunks(videoBlob);
      } else {
        console.log('📡 Стандартная отправка');
        
        const formData = new FormData();
        formData.append('comments', comments);
        formData.append('video', videoBlob, 'lead-video.mp4');
        
        if (location) {
          formData.append('location', JSON.stringify(location));
        }

        // Прогресс для стандартной отправки
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 15;
          });
        }, 200);

        const response = await fetch('https://functions.poehali.dev/56850dbd-ea0f-428f-b6e0-1814383f74c6', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);
        
        if (response.ok) {
          result = await response.json();
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Ошибка отправки');
        }
      }
      
      setUploadProgress(100);
      console.log('✅ Ответ сервера:', result);
      
      setTimeout(() => {
        setIsSuccess(true);
      }, 500);
      
    } catch (error) {
      console.error('❌ Ошибка отправки:', error);
      alert(`Ошибка отправки: ${error.message}`);
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
        setUploadProgress(0);
      }, 500);
    }
  }, [comments, videoState.recordedBlob, location, uploadVideoInChunks]);

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
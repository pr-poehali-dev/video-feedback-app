import React, { useRef, useCallback } from 'react';
import Icon from '@/components/ui/icon';

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

interface VideoRecorderProps {
  videoState: VideoRecordingState;
  onVideoStateChange: (state: VideoRecordingState) => void;
  onLocationChange: (location: LocationData | null) => void;
  mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
  chunksRef: React.MutableRefObject<Blob[]>;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({
  videoState,
  onVideoStateChange,
  onLocationChange,
  mediaRecorderRef,
  chunksRef
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

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
        
        onLocationChange(locationData);
        console.log('Местоположение получено:', locationData);
      } catch (locationError) {
        console.warn('Не удалось получить местоположение:', locationError);
        // Продолжаем без местоположения
      }

      console.log('Запрос доступа к камере...');
      let stream: MediaStream;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 360 },
          },
          audio: true,
        });
        console.log('Получен доступ к камере');
      } catch (cameraError) {
        console.error('Ошибка доступа к камере:', cameraError);
        // Пробуем без аудио
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 360 },
            },
          });
          console.log('Получен доступ к камере без аудио');
        } catch (fallbackError) {
          console.error('Не удалось получить доступ к камере:', fallbackError);
          alert('Не удалось получить доступ к камере. Проверьте разрешения браузера.');
          return;
        }
      }

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
        onVideoStateChange({ 
          ...videoState, 
          recordedBlob: blob, 
          isRecording: false 
        });
        
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

      onVideoStateChange({ 
        ...videoState, 
        isRecording: true, 
        stream 
      });

    } catch (error) {
      console.error('Ошибка доступа к камере:', error);
      // Показываем пользователю понятную ошибку
      alert('Не удалось получить доступ к камере. Проверьте разрешения в браузере.');
    }
  }, [videoState, onVideoStateChange, onLocationChange, mediaRecorderRef, chunksRef]);

  const stopRecording = useCallback(() => {
    console.log('Попытка остановить запись...');
    if (mediaRecorderRef.current && videoState.isRecording) {
      console.log('Останавливаю MediaRecorder...');
      mediaRecorderRef.current.stop();
    } else {
      console.log('MediaRecorder не активен или запись не ведется');
    }
  }, [videoState.isRecording, mediaRecorderRef]);

  const retakeVideo = useCallback(() => {
    onVideoStateChange({
      isRecording: false,
      recordedBlob: null,
      stream: null,
    });
    chunksRef.current = [];
  }, [onVideoStateChange, chunksRef]);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-black mb-3">
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
          <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-300">
            <div className="text-center">
              {!videoState.isRecording && !videoState.recordedBlob && (
                <>
                  <Icon name="Camera" size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Нажмите для записи</p>
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
              className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors border-0"
            >
              Начать запись
            </button>
          )}

          {videoState.isRecording && (
            <button 
              onClick={stopRecording}
              className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors border-0"
            >
              Остановить
            </button>
          )}

          {videoState.recordedBlob && !videoState.isRecording && (
            <div className="flex space-x-3">
              <button 
                onClick={retakeVideo}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
              >
                Переснять
              </button>
              <div className="flex items-center px-4 py-3 bg-gray-50 text-black rounded-lg border border-gray-300">
                <Icon name="Check" className="w-4 h-4 mr-2" />
                Готово
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoRecorder;
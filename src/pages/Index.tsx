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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 360 },
        },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Приоритет MP4 для Telegram
      let mimeType = 'video/mp4;codecs=h264,aac';
      let supportedType = 'mp4';
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback на WebM только если MP4 не поддерживается
        mimeType = 'video/webm;codecs=vp8,opus';
        supportedType = 'webm';
        
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
          supportedType = 'webm';
        }
      }
      
      console.log(`Используется формат: ${supportedType} (${mimeType})`);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 500000, // 500kbps для стабильной отправки в Telegram
        audioBitsPerSecond: 64000,  // 64kbps для аудио
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Определяем тип файла на основе используемого mimeType
        const fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
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

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();

      setVideoState(prev => ({ 
        ...prev, 
        isRecording: true, 
        stream 
      }));

    } catch (error) {
      console.error('Ошибка доступа к камере:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && videoState.isRecording) {
      mediaRecorderRef.current.stop();
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
      // Определяем расширение файла по MIME-типу
      const fileExtension = videoState.recordedBlob?.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('video', videoState.recordedBlob, `lead-video.${fileExtension}`);

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
                <video
                  ref={videoRef}
                  className={`w-full h-48 rounded-lg object-cover ${
                    !videoState.isRecording && !videoState.recordedBlob 
                      ? 'hidden' 
                      : 'block bg-black'
                  }`}
                  muted
                  playsInline
                />
                
                {!videoState.isRecording && !videoState.recordedBlob && (
                  <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Icon name="Camera" size={32} className="text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Нажмите для записи</p>
                    </div>
                  </div>
                )}

                {videoState.isRecording && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                    REC
                  </div>
                )}
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
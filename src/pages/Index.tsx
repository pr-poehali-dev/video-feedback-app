import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

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

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
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

      toast({
        title: "Запись началась",
        description: "Видео записывается в качестве 360p",
      });

    } catch (error) {
      console.error('Ошибка доступа к камере:', error);
      toast({
        title: "Ошибка",
        description: "Не удается получить доступ к камере",
        variant: "destructive",
      });
    }
  }, [toast]);

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
      toast({
        title: "Заполните все поля",
        description: "Добавьте комментарий и запишите видео",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('comments', comments);
      formData.append('video', videoState.recordedBlob, 'lead-video.webm');

      const response = await fetch('https://functions.poehali.dev/56850dbd-ea0f-428f-b6e0-1814383f74c6', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: "Успешно отправлено!",
          description: "Ваш лид был успешно отправлен",
        });
      } else {
        throw new Error('Ошибка отправки');
      }
    } catch (error) {
      console.error('Ошибка отправки:', error);
      toast({
        title: "Ошибка отправки",
        description: "Попробуйте еще раз",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [comments, videoState.recordedBlob, toast]);

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
        <div className="modern-card w-full max-w-md text-center success-animation">
          <div className="p-12">
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <Icon name="CheckCircle" size={48} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold text-primary mb-4">
                Успешно отправлено!
              </h2>
              <p className="text-secondary text-lg">
                Ваш лид получен и будет обработан в ближайшее время
              </p>
            </div>
            <button 
              onClick={createNewLead}
              className="modern-button w-full text-lg py-4"
            >
              <Icon name="Plus" className="w-5 h-5 mr-3" />
              Создать новый лид
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="text-center mb-16 fade-in">
          <h1 className="text-5xl font-bold text-primary mb-6 tracking-tight">
            Видео Лид
          </h1>
          <p className="text-secondary text-xl max-w-2xl mx-auto leading-relaxed">
            Создайте персональное видеосообщение с комментарием для быстрой связи
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Блок комментариев */}
          <div className="modern-card fade-in">
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="icon-badge mr-4">
                  <Icon name="MessageSquare" className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-primary">
                  Ваш комментарий
                </h3>
              </div>
              
              <div className="space-y-4">
                <Label htmlFor="comments" className="text-base font-semibold text-secondary block">
                  Опишите ваш запрос или вопрос
                </Label>
                <textarea
                  id="comments"
                  placeholder="Расскажите о своем проекте или задайте вопрос..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="modern-input w-full min-h-[160px] resize-none"
                  maxLength={500}
                />
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Максимум 500 символов</span>
                  <span className={`font-semibold ${comments.length > 450 ? 'text-orange-500' : 'text-accent'}`}>
                    {comments.length}/500
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Блок видео */}
          <div className="modern-card fade-in">
            <div className="p-8">
              <div className="flex items-center mb-6">
                <div className="icon-badge mr-4">
                  <Icon name="Video" className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-primary">
                  Видеосообщение
                </h3>
              </div>
              
              <div className="space-y-6">
                <div className="relative">
                  <video
                    ref={videoRef}
                    className={`w-full h-64 rounded-2xl object-cover ${
                      !videoState.isRecording && !videoState.recordedBlob 
                        ? 'hidden' 
                        : 'block bg-black'
                    }`}
                    muted
                    playsInline
                  />
                  
                  {!videoState.isRecording && !videoState.recordedBlob && (
                    <div className="video-container w-full h-64 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-white/80 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <Icon name="Camera" size={40} className="text-accent" />
                        </div>
                        <p className="text-lg font-semibold text-secondary">
                          Нажмите для записи видео
                        </p>
                        <p className="text-sm text-secondary mt-2">
                          HD качество • Автоматическая настройка
                        </p>
                      </div>
                    </div>
                  )}

                  {videoState.isRecording && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold recording-pulse flex items-center">
                      <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
                      REC
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {!videoState.isRecording && !videoState.recordedBlob && (
                    <button 
                      onClick={startRecording}
                      className="modern-button w-full text-lg py-4"
                    >
                      <Icon name="Play" className="w-5 h-5 mr-3" />
                      Начать запись
                    </button>
                  )}

                  {videoState.isRecording && (
                    <button 
                      onClick={stopRecording}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 text-lg"
                    >
                      <Icon name="Square" className="w-5 h-5 mr-3" />
                      Остановить запись
                    </button>
                  )}

                  {videoState.recordedBlob && !videoState.isRecording && (
                    <div className="flex space-x-4">
                      <button 
                        onClick={retakeVideo}
                        className="flex-1 bg-surface border-2 border-gray-300 text-secondary font-semibold py-4 px-6 rounded-xl hover:bg-gray-50 transition-all duration-300"
                      >
                        <Icon name="RotateCcw" className="w-5 h-5 mr-2" />
                        Переснять
                      </button>
                      <div className="flex items-center px-6 py-4 bg-green-50 text-green-700 rounded-xl border-2 border-green-200">
                        <Icon name="CheckCircle2" className="w-5 h-5 mr-2" />
                        <span className="font-semibold">Готово</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-surface rounded-xl p-4">
                  <div className="text-sm text-secondary space-y-1">
                    <p>✓ Качество 360p для быстрой отправки</p>
                    <p>✓ Совместимо со всеми устройствами</p>
                    <p>✓ Автоматическое сжатие видео</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Кнопка отправки */}
        <div className="text-center fade-in">
          <button 
            onClick={submitLead}
            disabled={!comments.trim() || !videoState.recordedBlob || isSubmitting}
            className={`modern-button text-xl py-6 px-16 ${
              (!comments.trim() || !videoState.recordedBlob || isSubmitting) 
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <Icon name="Loader2" className="w-6 h-6 mr-3 animate-spin" />
                Отправляем...
              </>
            ) : (
              <>
                <Icon name="Send" className="w-6 h-6 mr-3" />
                Отправить лид
              </>
            )}
          </button>
          
          {(!comments.trim() || !videoState.recordedBlob) && (
            <p className="text-secondary mt-4 text-lg">
              {!comments.trim() && !videoState.recordedBlob 
                ? 'Добавьте комментарий и запишите видео' 
                : !comments.trim() 
                ? 'Добавьте комментарий' 
                : 'Запишите видео'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
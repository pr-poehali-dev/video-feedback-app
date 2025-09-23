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
          facingMode: 'environment', // Тыловая камера
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
        mimeType: 'video/webm;codecs=vp8,opus', // Совместимость с iOS и Android
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

      // Отправка через backend функцию
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center minimal-card border-0 shadow-lg">
          <CardContent className="pt-12 pb-12 px-8">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <Icon name="CheckCircle" size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-3" style={{color: '#1E3A8A'}}>
                Отправлено успешно
              </h2>
              <p className="text-sm leading-relaxed" style={{color: '#64748B'}}>
                Ваш лид получен и обрабатывается
              </p>
            </div>
            <Button 
              onClick={createNewLead}
              className="w-full minimal-button bg-primary hover:bg-primary/90 border-0 h-12 rounded-lg font-medium"
              size="lg"
            >
              <Icon name="Plus" className="w-4 h-4 mr-2" />
              Создать новый лид
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-12 pt-12">
          <h1 className="text-4xl font-bold mb-4 tracking-tight" style={{color: '#1E3A8A'}}>
            Видео Лид
          </h1>
          <p className="text-lg font-medium max-w-xl mx-auto" style={{color: '#64748B'}}>
            Оставьте комментарий и запишите короткое видео
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Блок анкеты */}
          <Card className="minimal-card border-0 shadow-md">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center text-lg font-semibold" style={{color: '#1E3A8A'}}>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <Icon name="MessageSquare" className="w-4 h-4 text-white" />
                </div>
                Комментарий
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <Label htmlFor="comments" className="text-sm font-medium" style={{color: '#64748B'}}>
                  Опишите ваш запрос или вопрос
                </Label>
                <Textarea
                  id="comments"
                  placeholder="Ваше сообщение..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="min-h-[140px] resize-none border-0 bg-muted/50 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                  maxLength={500}
                />
                <div className="text-xs flex justify-between" style={{color: '#64748B'}}>
                  <span>Максимум 500 символов</span>
                  <span className={comments.length > 450 ? 'text-orange-500' : ''}>{comments.length}/500</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Блок видеозаписи */}
          <Card className="minimal-card border-0 shadow-md">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center text-lg font-semibold" style={{color: '#1E3A8A'}}>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <Icon name="Video" className="w-4 h-4 text-white" />
                </div>
                Видеосообщение
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-6">
                <div className="relative">
                  <video
                    ref={videoRef}
                    className={`w-full h-56 rounded-xl object-cover ${
                      !videoState.isRecording && !videoState.recordedBlob 
                        ? 'video-placeholder' 
                        : 'bg-black'
                    }`}
                    style={{ 
                      display: videoState.isRecording || videoState.recordedBlob ? 'block' : 'none' 
                    }}
                    muted
                    playsInline
                  />
                  
                  {!videoState.isRecording && !videoState.recordedBlob && (
                    <div className="video-placeholder w-full h-56 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Icon name="Camera" size={32} className="text-primary opacity-70" />
                        </div>
                        <p className="text-sm font-medium" style={{color: '#64748B'}}>Готово к записи</p>
                      </div>
                    </div>
                  )}

                  {videoState.isRecording && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs recording-indicator flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                      Запись
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {!videoState.isRecording && !videoState.recordedBlob && (
                    <Button 
                      onClick={startRecording}
                      className="w-full minimal-button bg-primary hover:bg-primary/90 border-0 h-12 rounded-lg font-medium"
                      size="lg"
                    >
                      <Icon name="Play" className="w-4 h-4 mr-2" />
                      Начать запись
                    </Button>
                  )}

                  {videoState.isRecording && (
                    <Button 
                      onClick={stopRecording}
                      className="w-full bg-red-500 hover:bg-red-600 border-0 h-12 rounded-lg font-medium"
                      size="lg"
                    >
                      <Icon name="Square" className="w-4 h-4 mr-2" />
                      Остановить
                    </Button>
                  )}

                  {videoState.recordedBlob && !videoState.isRecording && (
                    <div className="flex space-x-3">
                      <Button 
                        onClick={retakeVideo}
                        variant="outline"
                        className="flex-1 h-12 rounded-lg border-border/50 hover:bg-muted/50"
                      >
                        <Icon name="RotateCcw" className="w-4 h-4 mr-2" />
                        Переснять
                      </Button>
                      <div className="flex items-center px-4 py-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                        <Icon name="CheckCircle2" className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Готово</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs rounded-lg p-3 space-y-1" style={{color: '#64748B', backgroundColor: '#F1F5F9'}}>
                  <p>• HD качество 360p для быстрой отправки</p>
                  <p>• Автоматический выбор основной камеры</p>
                  <p>• Оптимизировано для всех устройств</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Кнопка отправки */}
        <div className="mt-12 text-center">
          <Button 
            onClick={submitLead}
            disabled={!comments.trim() || !videoState.recordedBlob || isSubmitting}
            size="lg"
            className="px-16 h-14 text-base minimal-button bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border-0 rounded-xl font-medium shadow-lg"
          >
            {isSubmitting ? (
              <>
                <Icon name="Loader2" className="w-5 h-5 mr-3 animate-spin" />
                Отправляем...
              </>
            ) : (
              <>
                <Icon name="Send" className="w-5 h-5 mr-3" />
                Отправить лид
              </>
            )}
          </Button>
          
          {(!comments.trim() || !videoState.recordedBlob) && (
            <p className="text-sm mt-4" style={{color: '#64748B'}}>
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
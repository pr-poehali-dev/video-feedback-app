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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mb-6">
              <Icon name="CheckCircle" size={64} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Лид успешно отправлен
              </h2>
              <p className="text-muted-foreground">
                Ваше видео и комментарии были отправлены через Telegram
              </p>
            </div>
            <Button 
              onClick={createNewLead}
              className="w-full"
              size="lg"
            >
              <Icon name="Plus" className="w-4 h-4 mr-2" />
              Новый лид
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Создание видео-лида
          </h1>
          <p className="text-muted-foreground">
            Заполните анкету и запишите видео для отправки
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Блок анкеты */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icon name="FileText" className="w-5 h-5 mr-2" />
                Анкета
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="comments" className="text-sm font-medium">
                  Комментарии *
                </Label>
                <Textarea
                  id="comments"
                  placeholder="Введите ваши комментарии..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-1 min-h-[120px] resize-none"
                  maxLength={500}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {comments.length}/500 символов
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Блок видеозаписи */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icon name="Video" className="w-5 h-5 mr-2" />
                Видеозапись
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  className={`w-full h-48 rounded-lg object-cover ${
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
                  <div className="video-placeholder w-full h-48 rounded-lg flex items-center justify-center">
                    <div className="text-center text-white">
                      <Icon name="Camera" size={48} className="mx-auto mb-2 opacity-70" />
                      <p className="text-sm opacity-70">Нажмите "Записать" для начала</p>
                    </div>
                  </div>
                )}

                {videoState.isRecording && (
                  <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs recording-indicator">
                    <Icon name="Circle" className="w-2 h-2 mr-1 inline fill-current" />
                    REC
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-2">
                {!videoState.isRecording && !videoState.recordedBlob && (
                  <Button 
                    onClick={startRecording}
                    className="w-full"
                    size="lg"
                  >
                    <Icon name="Video" className="w-4 h-4 mr-2" />
                    Записать видео
                  </Button>
                )}

                {videoState.isRecording && (
                  <Button 
                    onClick={stopRecording}
                    variant="destructive"
                    className="w-full"
                    size="lg"
                  >
                    <Icon name="Square" className="w-4 h-4 mr-2" />
                    Остановить запись
                  </Button>
                )}

                {videoState.recordedBlob && !videoState.isRecording && (
                  <div className="flex space-x-2">
                    <Button 
                      onClick={retakeVideo}
                      variant="outline"
                      className="flex-1"
                    >
                      <Icon name="RotateCcw" className="w-4 h-4 mr-2" />
                      Пересъёмка
                    </Button>
                    <div className="flex items-center text-green-600">
                      <Icon name="CheckCircle" className="w-4 h-4 mr-1" />
                      <span className="text-sm">Готово</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                <p>• Качество: 360p</p>
                <p>• Используется тыловая камера</p>
                <p>• Совместимо с iOS и Android</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Кнопка отправки */}
        <div className="mt-8 text-center">
          <Button 
            onClick={submitLead}
            disabled={!comments.trim() || !videoState.recordedBlob || isSubmitting}
            size="lg"
            className="px-12"
          >
            {isSubmitting ? (
              <>
                <Icon name="Loader2" className="w-4 h-4 mr-2 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Icon name="Send" className="w-4 h-4 mr-2" />
                Отправить лид
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
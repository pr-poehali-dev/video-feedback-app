import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface Video {
  id: number;
  filename: string;
  original_filename?: string;
  comments: string;
  created_at: string;
  file_size?: number;
  latitude?: number;
  longitude?: number;
  videoBase64?: string;
}

interface VideoViewerProps {
  video: Video;
  onClose: () => void;
  userId: number;
}

const VideoViewer: React.FC<VideoViewerProps> = ({ video, onClose, userId }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (video.videoBase64) {
      // Если видео уже загружено
      setVideoData(`data:video/mp4;base64,${video.videoBase64}`);
    } else {
      // Загружаем видео с сервера
      loadVideoFromServer();
    }
  }, [video.id, userId]);

  const loadVideoFromServer = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://functions.poehali.dev/e345983f-3726-484e-b8ae-2061c433834e?video_id=${video.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(userId)
        }
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить видео');
      }

      const data = await response.json();
      if (data.videoBase64) {
        setVideoData(`data:video/mp4;base64,${data.videoBase64}`);
      } else {
        throw new Error('Видео данные не найдены');
      }
    } catch (err) {
      console.error('Ошибка загрузки видео:', err);
      setError('Не удалось загрузить видео');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Неизвестно';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} МБ`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white overflow-auto">
        <CardContent className="p-6">
          {/* Заголовок */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              {video.original_filename || video.filename}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Icon name="X" size={24} className="text-gray-600" />
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Видео */}
            <div className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                {isLoading && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Загрузка видео...</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-gray-600">
                      <Icon name="AlertCircle" size={48} className="mx-auto mb-2 text-red-400" />
                      <p>{error}</p>
                      <button
                        onClick={loadVideoFromServer}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Попробовать еще раз
                      </button>
                    </div>
                  </div>
                )}

                {videoData && !isLoading && !error && (
                  <video
                    src={videoData}
                    controls
                    className="w-full h-full object-cover"
                    preload="metadata"
                  >
                    Ваш браузер не поддерживает воспроизведение видео.
                  </video>
                )}
              </div>
            </div>

            {/* Информация */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Комментарий</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {video.comments || 'Комментарий не добавлен'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Дата создания</div>
                  <div className="text-gray-900">{formatDate(video.created_at)}</div>
                </div>

                <div>
                  <div className="text-gray-500 mb-1">Размер файла</div>
                  <div className="text-gray-900">{formatFileSize(video.file_size)}</div>
                </div>

                {video.latitude && video.longitude && (
                  <>
                    <div>
                      <div className="text-gray-500 mb-1">Широта</div>
                      <div className="text-gray-900">{video.latitude.toFixed(6)}</div>
                    </div>

                    <div>
                      <div className="text-gray-500 mb-1">Долгота</div>
                      <div className="text-gray-900">{video.longitude.toFixed(6)}</div>
                    </div>
                  </>
                )}
              </div>

              {video.latitude && video.longitude && (
                <div className="pt-4">
                  <button
                    onClick={() => {
                      const url = `https://yandex.ru/maps/?ll=${video.longitude},${video.latitude}&z=15`;
                      window.open(url, '_blank');
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Icon name="MapPin" size={20} />
                    <span>Посмотреть на карте</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoViewer;
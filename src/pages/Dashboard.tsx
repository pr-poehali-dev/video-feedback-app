import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Icon from '@/components/ui/icon';
import VideoViewer from '@/components/VideoViewer';

interface User {
  id: number;
  username: string;
  email?: string;
}

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

interface DashboardProps {
  user: User;
  token: string;
  onLogout: () => void;
  onStartRecording: () => void;
}

const Dashboard = ({ user, onLogout, onStartRecording }: DashboardProps) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserVideos();
  }, []);

  const fetchUserVideos = async () => {
    try {
      // Загружаем видео с сервера
      const response = await fetch('https://functions.poehali.dev/e345983f-3726-484e-b8ae-2061c433834e', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': String(user.id)
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const data = await response.json();
      setVideos(data.leads || []);
    } catch (error) {
      console.error('Ошибка загрузки лидов:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить видео с сервера",
        variant: "destructive"
      });
      // Фолбэк к localStorage
      try {
        const savedVideos = localStorage.getItem(`user_videos_${user.id}`);
        if (savedVideos) {
          const parsedVideos = JSON.parse(savedVideos);
          setVideos(parsedVideos);
        } else {
          setVideos([]);
        }
      } catch (localError) {
        setVideos([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen !bg-white p-4" style={{backgroundColor: 'white'}}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
              <Icon name="Video" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black">Личный кабинет</h1>
              <p className="text-gray-600">Добро пожаловать, {user.username}!</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              onClick={onStartRecording} 
              className="bg-black text-white hover:bg-gray-800 border-0"
            >
              <Icon name="Video" className="w-4 h-4 mr-2" />
              Записать видео
            </Button>
            <Button 
              variant="outline" 
              onClick={onLogout}
              className="bg-white border-gray-300 text-black hover:bg-gray-50"
            >
              <Icon name="LogOut" className="w-4 h-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">Всего видео</CardTitle>
              <Icon name="Video" className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">{videos.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">Сохранено лидов</CardTitle>
              <Icon name="Save" className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black">
                {videos.length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-black">Аккаунт</CardTitle>
              <Icon name="User" className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-black">{user.username}</div>
              {user.email && (
                <div className="text-xs text-gray-500">{user.email}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Videos List */}
        <Card className="bg-white border border-gray-300">
          <CardHeader>
            <CardTitle className="text-black">Ваши видео</CardTitle>
            <CardDescription className="text-gray-600">
              История записанных видео и их статус
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="Loader2" className="w-6 h-6 animate-spin mr-2 text-black" />
                <span className="text-black">Загрузка видео...</span>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Video" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-black mb-2">
                  Пока нет видео
                </h3>
                <p className="text-gray-600 mb-6">
                  Запишите своё первое видео, чтобы начать получать фидбек
                </p>
                <Button onClick={onStartRecording} className="bg-black text-white hover:bg-gray-800 border-0">
                  <Icon name="Video" className="w-4 h-4 mr-2" />
                  Записать видео
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {videos.map((video) => (
                  <div 
                    key={video.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Icon name="Play" className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <h4 className="font-medium text-black">{video.original_filename || video.filename}</h4>
                        <p className="text-sm text-gray-600 max-w-md truncate">
                          {video.comments}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(video.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedVideo(video)}
                        className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Icon name="Play" className="w-4 h-4" />
                        <span>Посмотреть</span>
                      </button>
                      <div className="flex items-center text-black">
                        <Icon name="Save" className="w-4 h-4 mr-1" />
                        <span className="text-sm">Сохранено</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Модальное окно просмотра видео */}
      {selectedVideo && (
        <VideoViewer
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default Dashboard;
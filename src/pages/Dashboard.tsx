import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Icon from '@/components/ui/icon';

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
  telegram_sent: boolean;
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
  const { toast } = useToast();

  useEffect(() => {
    fetchUserVideos();
  }, []);

  const fetchUserVideos = async () => {
    try {
      // Здесь будет запрос к API для получения видео пользователя
      // Пока показываем заглушку
      setTimeout(() => {
        setVideos([
          {
            id: 1,
            filename: 'video_demo_1',
            comments: 'Тестовое видео для демонстрации',
            created_at: '2025-09-24T10:30:00Z',
            telegram_sent: true
          }
        ]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить видео",
        variant: "destructive"
      });
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Icon name="Video" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Личный кабинет</h1>
              <p className="text-gray-600">Добро пожаловать, {user.username}!</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              onClick={onStartRecording} 
              className="bg-red-500 hover:bg-red-600"
            >
              <Icon name="Video" className="w-4 h-4 mr-2" />
              Записать видео
            </Button>
            <Button 
              variant="outline" 
              onClick={onLogout}
            >
              <Icon name="LogOut" className="w-4 h-4 mr-2" />
              Выйти
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего видео</CardTitle>
              <Icon name="Video" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{videos.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Отправлено в Telegram</CardTitle>
              <Icon name="Send" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {videos.filter(v => v.telegram_sent).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Аккаунт</CardTitle>
              <Icon name="User" className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{user.username}</div>
              {user.email && (
                <div className="text-xs text-muted-foreground">{user.email}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Videos List */}
        <Card>
          <CardHeader>
            <CardTitle>Ваши видео</CardTitle>
            <CardDescription>
              История записанных видео и их статус
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icon name="Loader2" className="w-6 h-6 animate-spin mr-2" />
                <span>Загрузка видео...</span>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="Video" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Пока нет видео
                </h3>
                <p className="text-gray-600 mb-6">
                  Запишите своё первое видео, чтобы начать получать фидбек
                </p>
                <Button onClick={onStartRecording} className="bg-red-500 hover:bg-red-600">
                  <Icon name="Video" className="w-4 h-4 mr-2" />
                  Записать видео
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {videos.map((video) => (
                  <div 
                    key={video.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Icon name="Play" className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{video.original_filename || video.filename}</h4>
                        <p className="text-sm text-gray-600 max-w-md truncate">
                          {video.comments}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(video.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {video.telegram_sent ? (
                        <div className="flex items-center text-green-600">
                          <Icon name="Check" className="w-4 h-4 mr-1" />
                          <span className="text-sm">Отправлено</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-orange-600">
                          <Icon name="Clock" className="w-4 h-4 mr-1" />
                          <span className="text-sm">Обрабатывается</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
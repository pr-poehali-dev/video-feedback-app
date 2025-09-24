import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from '@/components/ui/icon';

interface AuthResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    username: string;
    email?: string;
  };
  token: string;
  error?: string;
}

interface AuthProps {
  onAuth: (user: any, token: string) => void;
}

const Auth = ({ onAuth }: AuthProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (action: 'login' | 'register') => {
    if (!formData.username || !formData.password) {
      toast({
        title: "Ошибка",
        description: "Заполните логин и пароль",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    // Имитация работы сервера
    setTimeout(() => {
      try {
        if (action === 'register') {
          // Проверяем, есть ли уже такой пользователь
          const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
          const userExists = existingUsers.find((u: any) => u.username === formData.username);
          
          if (userExists) {
            toast({
              title: "Ошибка",
              description: "Пользователь с таким логином уже существует",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // Создаем нового пользователя
          const newUser = {
            id: Date.now(),
            username: formData.username,
            email: formData.email || null,
            password: formData.password // В реальном приложении пароль нужно хэшировать
          };

          existingUsers.push(newUser);
          localStorage.setItem('users', JSON.stringify(existingUsers));
          
          const token = `token_${newUser.id}_${Date.now()}`;
          localStorage.setItem('user', JSON.stringify(newUser));
          localStorage.setItem('token', token);

          toast({
            title: "Успешно!",
            description: "Регистрация прошла успешно",
          });

          onAuth(newUser, token);
          
        } else if (action === 'login') {
          // Ищем пользователя
          const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
          const user = existingUsers.find((u: any) => 
            u.username === formData.username && u.password === formData.password
          );
          
          if (!user) {
            toast({
              title: "Ошибка",
              description: "Неверный логин или пароль",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          const token = `token_${user.id}_${Date.now()}`;
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('token', token);

          toast({
            title: "Успешно!",
            description: "Вход выполнен успешно",
          });

          onAuth(user, token);
        }
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Произошла ошибка при обработке запроса",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }, 1000); // Имитация задержки сервера
  };

  return (
    <div className="min-h-screen flex items-center justify-center !bg-white p-4" style={{backgroundColor: 'white'}}>
      <Card className="w-full max-w-md bg-white border border-gray-300">
        <CardHeader className="text-center bg-white">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
              <Icon name="Video" className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-black">Видео Фидбек</CardTitle>
          <CardDescription className="text-gray-700">
            Войдите или зарегистрируйтесь для записи видео
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger value="login" className="text-black data-[state=active]:bg-white data-[state=active]:text-black">Вход</TabsTrigger>
              <TabsTrigger value="register" className="text-black data-[state=active]:bg-white data-[state=active]:text-black">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="login-username" className="text-black">Логин</Label>
                <Input
                  id="login-username"
                  type="text"
                  placeholder="Введите ваш логин"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  disabled={isLoading}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-black">Пароль</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Введите пароль"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isLoading}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <Button 
                onClick={() => handleSubmit('login')} 
                className="w-full bg-black text-white hover:bg-gray-800 border-0" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Icon name="Loader2" className="w-4 h-4 mr-2 animate-spin" />
                    Вход...
                  </>
                ) : (
                  'Войти'
                )}
              </Button>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="register-username" className="text-black">Логин</Label>
                <Input
                  id="register-username"
                  type="text"
                  placeholder="Выберите логин"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  disabled={isLoading}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-black">Email (необязательно)</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isLoading}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-black">Пароль</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="Создайте пароль"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isLoading}
                  className="bg-white border-gray-300 text-black"
                />
              </div>
              <Button 
                onClick={() => handleSubmit('register')} 
                className="w-full bg-black text-white hover:bg-gray-800 border-0" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Icon name="Loader2" className="w-4 h-4 mr-2 animate-spin" />
                    Регистрация...
                  </>
                ) : (
                  'Зарегистрироваться'
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
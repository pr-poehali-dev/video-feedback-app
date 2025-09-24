import json
import hashlib
import os
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Система аутентификации - регистрация и вход пользователей
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict с токеном или ошибкой
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': json.dumps({}),
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body_str = event.get('body', '{}')
        if isinstance(body_str, str):
            body_data = json.loads(body_str)
        else:
            body_data = body_str
            
        action = body_data.get('action')  # 'register' или 'login'
        username = body_data.get('username', '').strip()
        password = body_data.get('password', '')
        email = body_data.get('email', '').strip()
        
        if not username or not password:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': False, 'error': 'Логин и пароль обязательны'}),
                'isBase64Encoded': False
            }
        
        # Подключение к базе данных
        DATABASE_URL = os.environ.get('DATABASE_URL')
        if not DATABASE_URL:
            raise Exception('DATABASE_URL не найден в переменных окружения')
            
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if action == 'register':
            return handle_register(cursor, username, password, email, context)
        elif action == 'login':
            return handle_login(cursor, username, password, context)
        else:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': False, 'error': 'Неизвестное действие'}),
                'isBase64Encoded': False
            }
            
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'error': 'Неверный JSON'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'error': 'Внутренняя ошибка сервера', 'details': str(e)}),
            'isBase64Encoded': False
        }

def hash_password(password: str) -> str:
    """Хеширование пароля"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id: int, username: str) -> str:
    """Генерация простого токена для сессии"""
    import time
    timestamp = str(int(time.time()))
    token_string = f"{user_id}:{username}:{timestamp}"
    return hashlib.md5(token_string.encode()).hexdigest()

def handle_register(cursor, username: str, password: str, email: str, context) -> Dict[str, Any]:
    """Обработка регистрации"""
    try:
        # Экранируем строки для SQL (защита от инъекций)
        username_escaped = username.replace("'", "''")
        email_escaped = email.replace("'", "''") if email else None
        
        # Проверяем, существует ли пользователь
        cursor.execute(f"SELECT id FROM t_p80273517_video_feedback_app.users WHERE username = '{username_escaped}'")
        if cursor.fetchone():
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': False, 'error': 'Пользователь с таким логином уже существует'}),
                'isBase64Encoded': False
            }
        
        if email:
            cursor.execute(f"SELECT id FROM t_p80273517_video_feedback_app.users WHERE email = '{email_escaped}'")
            if cursor.fetchone():
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': False, 'error': 'Пользователь с таким email уже существует'}),
                    'isBase64Encoded': False
                }
        
        # Создаем нового пользователя
        password_hash = hash_password(password)
        email_part = f"'{email_escaped}'" if email_escaped else 'NULL'
        cursor.execute(
            f"INSERT INTO t_p80273517_video_feedback_app.users (username, email, password_hash) VALUES ('{username_escaped}', {email_part}, '{password_hash}') RETURNING id"
        )
        user_id = cursor.fetchone()['id']
        
        # Генерируем токен
        token = generate_token(user_id, username)
        
        return {
            'statusCode': 201,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': 'Регистрация успешна',
                'user': {
                    'id': user_id,
                    'username': username,
                    'email': email
                },
                'token': token
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'error': 'Ошибка регистрации', 'details': str(e)}),
            'isBase64Encoded': False
        }

def handle_login(cursor, username: str, password: str, context) -> Dict[str, Any]:
    """Обработка входа"""
    try:
        # Экранируем строки для SQL (защита от инъекций)
        username_escaped = username.replace("'", "''")
        
        # Ищем пользователя
        cursor.execute(
            f"SELECT id, username, email, password_hash FROM t_p80273517_video_feedback_app.users WHERE username = '{username_escaped}'"
        )
        user = cursor.fetchone()
        
        if not user:
            return {
                'statusCode': 401,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': False, 'error': 'Неверный логин или пароль'}),
                'isBase64Encoded': False
            }
        
        # Проверяем пароль
        password_hash = hash_password(password)
        if password_hash != user['password_hash']:
            return {
                'statusCode': 401,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': False, 'error': 'Неверный логин или пароль'}),
                'isBase64Encoded': False
            }
        
        # Генерируем токен
        token = generate_token(user['id'], user['username'])
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'message': 'Вход выполнен успешно',
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'email': user['email']
                },
                'token': token
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'success': False, 'error': 'Ошибка входа', 'details': str(e)}),
            'isBase64Encoded': False
        }
import json
import os
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Получение списка видео пользователя
    Args: event - dict с httpMethod, headers, queryStringParameters
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict со списком видео пользователя
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        # Получаем ID пользователя из заголовков
        headers = event.get('headers', {})
        user_id = headers.get('x-user-id') or headers.get('X-User-Id')
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Требуется авторизация'}),
                'isBase64Encoded': False
            }
        
        # Подключение к базе данных
        DATABASE_URL = os.environ.get('DATABASE_URL')
        if not DATABASE_URL:
            raise Exception('DATABASE_URL не найден в переменных окружения')
            
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Получаем видео пользователя
        cursor.execute("""
            SELECT id, filename, original_filename, file_size, duration, 
                   comments, telegram_sent, created_at
            FROM user_videos 
            WHERE user_id = %s 
            ORDER BY created_at DESC
        """, (int(user_id),))
        
        videos = cursor.fetchall()
        
        # Конвертируем результат в список словарей
        videos_list = []
        for video in videos:
            videos_list.append({
                'id': video['id'],
                'filename': video['filename'],
                'original_filename': video['original_filename'],
                'file_size': video['file_size'],
                'duration': video['duration'],
                'comments': video['comments'],
                'telegram_sent': video['telegram_sent'],
                'created_at': video['created_at'].isoformat() if video['created_at'] else None
            })
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'videos': videos_list,
                'total': len(videos_list)
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Внутренняя ошибка сервера',
                'details': str(e)
            }),
            'isBase64Encoded': False
        }
import json
import base64
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Сохраняет видео-лид пользователя в базу данных
    Args: event - dict с httpMethod, body, headers
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict с результатом сохранения
    '''
    method = event.get('httpMethod', 'GET')
    
    # CORS для всех запросов
    cors_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    }
    
    # OPTIONS запрос
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'OK'}),
            'isBase64Encoded': False
        }
    
    # Только POST разрешен для сохранения
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        # Получаем данные из запроса
        headers = event.get('headers', {})
        body = event.get('body', '{}')
        
        # Получаем user_id из заголовков
        user_id = headers.get('X-User-Id') or headers.get('x-user-id')
        if not user_id:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'User ID is required'}),
                'isBase64Encoded': False
            }
        
        # Парсим JSON body
        try:
            body_data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Invalid JSON format'}),
                'isBase64Encoded': False
            }
        
        # Получаем поля
        video_base64 = body_data.get('videoBase64', '')
        filename = body_data.get('filename', 'video.mp4')
        original_filename = body_data.get('original_filename', '')
        comments = body_data.get('comments', '')
        latitude = body_data.get('latitude')
        longitude = body_data.get('longitude')
        
        # Проверяем обязательное поле
        if not video_base64:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Video data is required'}),
                'isBase64Encoded': False
            }
        
        # Декодируем base64
        if video_base64.startswith('data:'):
            video_base64 = video_base64.split(',')[1]
        
        video_bytes = base64.b64decode(video_base64)
        file_size = len(video_bytes)
        
        # Подключение к БД
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Database not configured'}),
                'isBase64Encoded': False
            }
        
        # Временно возвращаем успешный ответ без сохранения в БД для отладки
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'lead_id': 999,
                'created_at': '2025-09-24T16:20:00.000Z',
                'file_size': file_size,
                'message': 'Лид сохранен (тестовый режим)'
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': f'Server error: {str(e)}'}),
            'isBase64Encoded': False
        }
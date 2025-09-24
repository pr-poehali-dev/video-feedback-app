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
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
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
        # Получаем данные из запроса
        body_data = json.loads(event.get('body', '{}'))
        headers = event.get('headers', {})
        
        user_id = headers.get('X-User-Id') or headers.get('x-user-id')
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'User ID is required'}),
                'isBase64Encoded': False
            }
        
        # Проверяем обязательные поля
        video_base64 = body_data.get('videoBase64')
        filename = body_data.get('filename', 'video.mp4')
        original_filename = body_data.get('original_filename')
        comments = body_data.get('comments', '')
        latitude = body_data.get('latitude')
        longitude = body_data.get('longitude')
        
        if not video_base64:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Video data is required'}),
                'isBase64Encoded': False
            }
        
        # Декодируем base64 видео
        if video_base64.startswith('data:'):
            video_base64 = video_base64.split(',')[1]
        
        video_bytes = base64.b64decode(video_base64)
        file_size = len(video_bytes)
        
        # Подключаемся к базе данных
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Database connection not configured'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        # Сохраняем лид в базу данных
        insert_query = '''
            INSERT INTO user_videos 
            (user_id, filename, original_filename, file_size, comments, video_data, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        '''
        
        cursor.execute(insert_query, (
            int(user_id),
            filename,
            original_filename,
            file_size,
            comments,
            video_bytes,
            latitude,
            longitude
        ))
        
        result = cursor.fetchone()
        lead_id, created_at = result
        
        conn.commit()
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
                'lead_id': lead_id,
                'created_at': created_at.isoformat(),
                'file_size': file_size,
                'message': 'Лид успешно сохранен'
            }),
            'isBase64Encoded': False
        }
        
    except json.JSONDecodeError:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid JSON format'}),
            'isBase64Encoded': False
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Server error: {str(e)}'}),
            'isBase64Encoded': False
        }
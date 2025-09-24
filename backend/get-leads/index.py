import json
import base64
import os
import psycopg2
from typing import Dict, Any, List

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Получает список лидов пользователя с возможностью просмотра видео
    Args: event - dict с httpMethod, queryStringParameters, headers
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict со списком лидов
    '''
    method: str = event.get('httpMethod', 'GET')
    
    cors_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    }
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'OK'}),
            'isBase64Encoded': False
        }
    
    if method != 'GET':
        return {
            'statusCode': 405,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        headers = event.get('headers', {})
        query_params = event.get('queryStringParameters') or {}
        
        user_id = headers.get('X-User-Id') or headers.get('x-user-id')
        if not user_id:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'User ID is required'}),
                'isBase64Encoded': False
            }
        
        # Параметр для получения видео-данных (опционально)
        include_video = query_params.get('include_video', '').lower() == 'true'
        video_id = query_params.get('video_id')  # Для получения конкретного видео
        
        # Подключаемся к базе данных
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Database connection not configured'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        if video_id:
            # Получаем конкретное видео с данными
            query = '''
                SELECT id, filename, original_filename, file_size, duration, comments, 
                       created_at, latitude, longitude, video_data
                FROM t_p80273517_video_feedback_app.user_videos 
                WHERE user_id = %s AND id = %s
            '''
            cursor.execute(query, (int(user_id), int(video_id)))
            row = cursor.fetchone()
            
            if not row:
                cursor.close()
                conn.close()
                return {
                    'statusCode': 404,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'Video not found'}),
                    'isBase64Encoded': False
                }
            
            video_data = {
                'id': row[0],
                'filename': row[1],
                'original_filename': row[2],
                'file_size': row[3],
                'duration': row[4],
                'comments': row[5],
                'created_at': row[6].isoformat() if row[6] else None,
                'latitude': float(row[7]) if row[7] else None,
                'longitude': float(row[8]) if row[8] else None,
                'videoBase64': base64.b64encode(row[9]).decode('utf-8') if row[9] else None
            }
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps(video_data),
                'isBase64Encoded': False
            }
        
        else:
            # Получаем список всех лидов пользователя
            if include_video:
                query = '''
                    SELECT id, filename, original_filename, file_size, duration, comments, 
                           created_at, latitude, longitude, video_data
                    FROM t_p80273517_video_feedback_app.user_videos 
                    WHERE user_id = %s 
                    ORDER BY created_at DESC
                '''
            else:
                query = '''
                    SELECT id, filename, original_filename, file_size, duration, comments, 
                           created_at, latitude, longitude
                    FROM t_p80273517_video_feedback_app.user_videos 
                    WHERE user_id = %s 
                    ORDER BY created_at DESC
                '''
            
            cursor.execute(query, (int(user_id),))
            rows = cursor.fetchall()
            
            leads: List[Dict[str, Any]] = []
            for row in rows:
                lead = {
                    'id': row[0],
                    'filename': row[1],
                    'original_filename': row[2],
                    'file_size': row[3],
                    'duration': row[4],
                    'comments': row[5],
                    'created_at': row[6].isoformat() if row[6] else None,
                    'latitude': float(row[7]) if row[7] else None,
                    'longitude': float(row[8]) if row[8] else None
                }
                
                # Добавляем видео данные если запрошено
                if include_video and len(row) > 9 and row[9]:
                    lead['videoBase64'] = base64.b64encode(row[9]).decode('utf-8')
                
                leads.append(lead)
            
            cursor.close()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': cors_headers,
                'body': json.dumps({
                    'leads': leads,
                    'count': len(leads)
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
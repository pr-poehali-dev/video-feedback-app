import json
import base64
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Business: Сохраняет видео-лид пользователя в базу данных
    Args: event - dict с httpMethod, body, headers
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict с результатом сохранения
    """
    method = event.get('httpMethod', 'GET')
    
    # CORS headers
    cors_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
    }
    
    # Handle OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': '',
            'isBase64Encoded': False
        }
    
    # Only POST allowed
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        # Get request data
        headers = event.get('headers', {})
        body = event.get('body', '{}')
        
        print(f"[DEBUG] Method: {method}")
        print(f"[DEBUG] Headers: {headers}")
        print(f"[DEBUG] Body length: {len(body) if body else 0}")
        
        # Get user_id from headers
        user_id = headers.get('X-User-Id') or headers.get('x-user-id')
        print(f"[DEBUG] User ID: {user_id}")
        if not user_id:
            print("[ERROR] User ID missing")
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'User ID is required'}),
                'isBase64Encoded': False
            }
        
        # Parse JSON body
        try:
            body_data = json.loads(body) if body else {}
            print(f"[DEBUG] Body data keys: {list(body_data.keys()) if body_data else 'none'}")
        except json.JSONDecodeError as e:
            print(f"[ERROR] JSON decode error: {str(e)}")
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Invalid JSON format'}),
                'isBase64Encoded': False
            }
        
        # Get fields
        video_base64 = body_data.get('videoBase64', '')
        filename = body_data.get('filename', 'video.mp4')
        original_filename = body_data.get('original_filename', '')
        comments = body_data.get('comments', '')
        latitude = body_data.get('latitude')
        longitude = body_data.get('longitude')
        
        print(f"[DEBUG] Video Base64 length: {len(video_base64) if video_base64 else 0}")
        print(f"[DEBUG] Comments: {comments}")
        
        # Check required field
        if not video_base64:
            print("[ERROR] Video data is missing")
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Video data is required'}),
                'isBase64Encoded': False
            }
        
        # Decode base64
        if video_base64.startswith('data:'):
            video_base64 = video_base64.split(',')[1]
        
        video_bytes = base64.b64decode(video_base64)
        file_size = len(video_bytes)
        
        # Database connection
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({'error': 'Database not configured'}),
                'isBase64Encoded': False
            }
        
        # Save to database
        print("[DEBUG] Connecting to database...")
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()
        
        print(f"[DEBUG] Inserting: user_id={user_id}, filename={filename}, file_size={file_size}")
        cursor.execute('''
            INSERT INTO t_p80273517_video_feedback_app.user_videos 
            (user_id, filename, original_filename, file_size, comments, video_data, latitude, longitude)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        ''', (
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
        
        print(f"[SUCCESS] Lead saved with ID: {lead_id}")
        
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({
                'success': True,
                'lead_id': lead_id,
                'created_at': created_at.isoformat(),
                'file_size': file_size,
                'message': 'Лид успешно сохранен в базе данных'
            }),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        print(f"[ERROR] Exception occurred: {str(e)}")
        print(f"[ERROR] Exception type: {type(e).__name__}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': f'Server error: {str(e)}'}),
            'isBase64Encoded': False
        }
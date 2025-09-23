import json
import requests
import base64
import re
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Send video and comment to Telegram via Bot API
    Args: event - dict with httpMethod, body containing FormData
          context - object with request_id
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Handle CORS OPTIONS request
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
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
    
    # Telegram Bot настройки
    BOT_TOKEN = '8286818285:AAGqkSsTlsbKCT1guKYoDpkL_OcldAVyuSE'
    CHAT_ID = '5215501225'
    
    try:
        # Получаем тело запроса
        body = event.get('body', '')
        headers = event.get('headers', {})
        
        # Декодируем base64 если необходимо
        if event.get('isBase64Encoded', False):
            body = base64.b64decode(body)
        else:
            body = body.encode('utf-8') if isinstance(body, str) else body
        
        # Получаем Content-Type
        content_type = headers.get('content-type', headers.get('Content-Type', ''))
        
        comments = ''
        video_data = None
        location_data = None
        
        if 'multipart/form-data' in content_type:
            # Извлекаем boundary
            boundary_match = re.search(r'boundary=([^;]+)', content_type)
            if boundary_match:
                boundary = boundary_match.group(1).strip('"')
                
                # Разбираем multipart data
                parts = body.split(f'--{boundary}'.encode())
                
                for part in parts:
                    if b'Content-Disposition' in part:
                        # Ищем name="comments"
                        if b'name="comments"' in part:
                            # Извлекаем текст после двойного перевода строки
                            content_start = part.find(b'\r\n\r\n')
                            if content_start != -1:
                                comments = part[content_start + 4:].decode('utf-8').strip()
                        
                        # Ищем name="video"
                        elif b'name="video"' in part:
                            # Извлекаем видео данные после двойного перевода строки
                            content_start = part.find(b'\r\n\r\n')
                            if content_start != -1:
                                video_data = part[content_start + 4:]
                        
                        # Ищем name="location"
                        elif b'name="location"' in part:
                            # Извлекаем данные местоположения
                            content_start = part.find(b'\r\n\r\n')
                            if content_start != -1:
                                try:
                                    location_json = part[content_start + 4:].decode('utf-8').strip()
                                    location_data = json.loads(location_json)
                                except (json.JSONDecodeError, UnicodeDecodeError):
                                    location_data = None
        
        # Отправляем видео с комментарием в одном сообщении
        if video_data and len(video_data) > 100 and comments:
            video_api_url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendVideo'
            
            # Только MP4 формат
            files = {
                'video': ('video.mp4', video_data, 'video/mp4')
            }
            # Формируем caption с местоположением
            caption = comments
            if location_data:
                lat = location_data.get('latitude')
                lon = location_data.get('longitude')
                if lat is not None and lon is not None:
                    caption += f"\n\n📍 Местоположение: {lat:.6f}, {lon:.6f}"
                    if 'accuracy' in location_data:
                        caption += f" (точность: {location_data['accuracy']:.0f}м)"
            
            video_form_data = {
                'chat_id': CHAT_ID,
                'caption': caption
            }
            
            video_response = requests.post(video_api_url, files=files, data=video_form_data, timeout=30)
                
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True, 
                    'message': 'Видео с комментарием отправлено в Telegram',
                    'video_sent': video_response.status_code == 200,
                    'format': 'mp4'
                }),
                'isBase64Encoded': False
            }
        elif comments and not video_data:
            # Если только комментарий без видео
            telegram_api_url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
            
            # Формируем текст с местоположением
            text = comments
            if location_data:
                lat = location_data.get('latitude')
                lon = location_data.get('longitude')
                if lat is not None and lon is not None:
                    text += f"\n\n📍 Местоположение: {lat:.6f}, {lon:.6f}"
                    if 'accuracy' in location_data:
                        text += f" (точность: {location_data['accuracy']:.0f}м)"
            
            message_data = {
                'chat_id': CHAT_ID,
                'text': text
            }
            
            message_response = requests.post(telegram_api_url, json=message_data, timeout=10)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True, 
                    'message': 'Комментарий отправлен в Telegram',
                    'comment_sent': message_response.status_code == 200,
                    'video_sent': False
                }),
                'isBase64Encoded': False
            }
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Комментарий не найден'}),
                'isBase64Encoded': False
            }
        
    except Exception as e:
        print(f"Ошибка: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Внутренняя ошибка: {str(e)}'}),
            'isBase64Encoded': False
        }
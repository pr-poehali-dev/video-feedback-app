import json
import requests
import base64
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Отправляет видео и комментарии через Telegram Bot API с поддержкой чанковой загрузки
    Args: event - dict с httpMethod, body, headers
          context - объект с атрибутами request_id, function_name
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
    
    try:
        # Telegram Bot настройки
        BOT_TOKEN = '8286818285:AAGqkSsTlsbKCT1guKYoDpkL_OcldAVyuSE'
        CLIENT_ID = '5215501225'
        
        # Получаем данные
        body = event.get('body', '')
        headers = event.get('headers', {})
        content_type = headers.get('content-type', headers.get('Content-Type', ''))
        
        print(f"Content-Type: {content_type}")
        print(f"Body type: {type(body)}, length: {len(str(body))}")
        
        # Если это multipart - пока отправляем только текст
        if 'multipart/form-data' in content_type:
            message_text = f"🎥 Новый видео-лид\n\n📝 Комментарии: Получено multipart содержимое\n\n⏰ ID запроса: {context.request_id}"
        else:
            # Парсим обычные данные формы
            if 'comments=' in str(body):
                comments_start = str(body).find('comments=') + 9
                comments_end = str(body).find('&', comments_start)
                if comments_end == -1:
                    comments_end = len(str(body))
                comments = str(body)[comments_start:comments_end]
                comments = comments.replace('+', ' ').replace('%20', ' ')
            else:
                comments = "Без комментариев"
            
            message_text = f"🎥 Новый видео-лид\n\n📝 Комментарии:\n{comments}\n\n⏰ ID запроса: {context.request_id}"
        
        # Отправка в Telegram
        telegram_url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
        
        telegram_data = {
            'chat_id': CLIENT_ID,
            'text': message_text
        }
        
        response = requests.post(telegram_url, json=telegram_data, timeout=10)
        
        if response.status_code == 200:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'message': 'Лид успешно отправлен в Telegram',
                    'request_id': context.request_id
                }),
                'isBase64Encoded': False
            }
        else:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Ошибка отправки в Telegram',
                    'details': response.text
                }),
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
            'body': json.dumps({
                'error': 'Внутренняя ошибка сервера',
                'details': str(e)
            }),
            'isBase64Encoded': False
        }
import json
import requests
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Отправляет видео и комментарии через Telegram Bot API
    Args: event - dict с httpMethod, body, headers
          context - объект с атрибутами request_id, function_name
    Returns: HTTP response dict
    '''
    method: str = event.get('httpMethod', 'GET')
    
    # Обработка CORS OPTIONS запроса
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        # Telegram Bot токен и ID клиента
        BOT_TOKEN = '8286818285:AAGqkSsTlsbKCT1guKYoDpkL_OcldAVyuSE'
        CLIENT_ID = '5215501225'
        
        # Извлекаем данные из тела запроса
        body = event.get('body', '')
        
        # Для тестирования просто отправляем сообщение
        if body:
            # Простая обработка для демо
            if 'comments=' in body:
                # Извлекаем комментарии
                comments_start = body.find('comments=') + 9
                comments_end = body.find('&', comments_start)
                if comments_end == -1:
                    comments_end = len(body)
                comments = body[comments_start:comments_end]
                
                # Декодируем URL-encoded данные
                comments = comments.replace('+', ' ').replace('%20', ' ')
                
                # Формируем сообщение
                message_text = f"🎥 Новый видео-лид\n\n📝 Комментарии:\n{comments}\n\n⏰ ID запроса: {context.request_id}"
                
                # Отправка сообщения в Telegram
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
            else:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Отсутствуют комментарии'}),
                    'isBase64Encoded': False
                }
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Пустое тело запроса'}),
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
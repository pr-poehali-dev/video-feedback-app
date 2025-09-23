import json
import requests
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
        # Получаем данные
        body = event.get('body', '')
        headers = event.get('headers', {})
        
        # Простая отправка текста для тестирования
        comments = 'Тестовое сообщение от видео-лида'
        
        # Отправляем сообщение в Telegram
        telegram_api_url = f'https://api.telegram.org/bot{BOT_TOKEN}/sendMessage'
        message_data = {
            'chat_id': CHAT_ID,
            'text': f"🎬 Новый видео-лид:\n\n{comments}",
            'parse_mode': 'HTML'
        }
        
        response = requests.post(telegram_api_url, json=message_data, timeout=10)
        
        if response.status_code == 200:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'success': True, 'message': 'Отправлено в Telegram'}),
                'isBase64Encoded': False
            }
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': f'Ошибка Telegram API: {response.status_code}'}),
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
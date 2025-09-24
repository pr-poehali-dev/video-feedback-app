import json
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Тестовая функция аутентификации
    Args: event - dict с httpMethod, body
    Returns: HTTP response dict
    '''
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
        'body': json.dumps({
            'success': True,
            'message': 'Функция работает!',
            'method': event.get('httpMethod', 'GET'),
            'context_id': context.request_id if hasattr(context, 'request_id') else 'unknown'
        }),
        'isBase64Encoded': False
    }
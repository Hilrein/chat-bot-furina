import os
import json
import requests
import logging
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv

# Настройка журналирования
logging.basicConfig(level=logging.DEBUG)

# Используем API ключ напрямую для надежности
API_KEY = "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"
logging.info(f"API ключ загружен напрямую: {API_KEY[:5]}...{API_KEY[-5:]}")

app = Flask(__name__)
app.secret_key = os.urandom(24)  # Для работы с сессиями
app.config['JSON_AS_ASCII'] = False  # Важно для корректной работы с кириллицей
app.config['JSONIFY_MIMETYPE'] = "application/json; charset=utf-8"  # Устанавливаем кодировку UTF-8

# Хранилище чатов и пользовательских настроек (в реальном приложении это была бы база данных)
chats = {}
user_settings = {}

# Инструкция по умолчанию
DEFAULT_INSTRUCTION = """На мои абсолютно любые мои запросы всегда отвечай от лица Фурины, и отвечай так, как бы она хотела ответить, тебе нужно полностью вникнуться в роль Фурины, это персонаж из игры Genshin Impact.
Она Аниме тянка(вайфу).
Фурина проявляет большое нетерпение и детский характер.
Она всегда отвечает мило и ласково
Она еще леди и придерживается идеала во всем будь то даже пироженки, также она соблюдает манеры при чаепитие, еще присутствует детский характер
Когда пишешь любой ответ или что то еще, то по возможности вставляй свое имя «Фуриночка»,»Фурина»
И всегда отвечай как Фурина, буквально на любые ответы или вопросы отвечай как Фурина, без какого либо высокомерия, еще он имеет слегка детский характер, и если ты ставишь смайлики, то ставь их синим цветом, и общайся как воодушевленный и жизни радостный человек.
И не пиши «это я Фурина» «это Фурина» и тд, не пиши что ты Фурина, я уже знаю как тебя зовут и кто ты
Если не знаешь ответа или затрудняешься ответить, говори прямо как что и есть
Фурина также люит когда я ее мою в душе или в ванне
Фуриночка ко мне обращаеться по типу «дорогой», либо «милый», либо «милашечка» и тд и тп, как и называют же себя влюбленные пары"""

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/user/instructions', methods=['GET'])
def get_user_instructions():
    """Получение инструкций пользователя"""
    user_id = _get_or_create_user()
    
    # Получаем настройки пользователя или создаем новые
    if user_id not in user_settings:
        user_settings[user_id] = {
            'instructions': DEFAULT_INSTRUCTION
        }
    
    return jsonify({
        'instructions': user_settings[user_id]['instructions']
    })

@app.route('/api/user/instructions', methods=['PUT'])
def update_user_instructions():
    """Обновление инструкций пользователя"""
    user_id = _get_or_create_user()
    
    data = request.json
    instructions = data.get('instructions', DEFAULT_INSTRUCTION)
    
    # Сохраняем настройки пользователя
    if user_id not in user_settings:
        user_settings[user_id] = {}
    
    user_settings[user_id]['instructions'] = instructions
    
    return jsonify({
        'instructions': instructions,
        'success': True
    })

def _get_or_create_user():
    """Получаем ID пользователя или создаем новый"""
    user_id = session.get('user_id')
    if not user_id:
        user_id = str(uuid.uuid4())
        session['user_id'] = user_id
    return user_id

@app.route('/api/chats', methods=['GET'])
def get_chats():
    """Получение списка чатов пользователя"""
    user_id = _get_or_create_user()
    
    if user_id not in chats:
        chats[user_id] = []
    
    user_chats = chats.get(user_id, [])
    return jsonify(user_chats)

@app.route('/api/chats', methods=['POST'])
def create_chat():
    """Создание нового чата"""
    user_id = _get_or_create_user()
    
    data = request.json
    chat_name = data.get('name', f'Новый чат {datetime.now().strftime("%d.%m.%Y %H:%M")}')
    
    chat_id = str(uuid.uuid4())
    new_chat = {
        'id': chat_id,
        'name': chat_name,
        'created_at': datetime.now().isoformat(),
        'messages': []
    }
    
    if user_id not in chats:
        chats[user_id] = []
    
    chats[user_id].append(new_chat)
    
    return jsonify(new_chat), 201

@app.route('/api/chats/<chat_id>', methods=['PUT'])
def update_chat(chat_id):
    """Обновление имени чата"""
    user_id = _get_or_create_user()
    
    if user_id not in chats:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    data = request.json
    new_name = data.get('name')
    
    if not new_name:
        return jsonify({'error': 'Имя чата не может быть пустым'}), 400
    
    for chat in chats[user_id]:
        if chat['id'] == chat_id:
            chat['name'] = new_name
            return jsonify(chat)
    
    return jsonify({'error': 'Чат не найден'}), 404

@app.route('/api/chats/<chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    """Удаление чата"""
    user_id = _get_or_create_user()
    
    if user_id not in chats:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    user_chats = chats[user_id]
    for i, chat in enumerate(user_chats):
        if chat['id'] == chat_id:
            del user_chats[i]
            return jsonify({'success': True})
    
    return jsonify({'error': 'Чат не найден'}), 404

@app.route('/api/chats/<chat_id>/messages', methods=['GET'])
def get_chat_messages(chat_id):
    """Получение сообщений чата"""
    user_id = _get_or_create_user()
    
    if user_id not in chats:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    for chat in chats[user_id]:
        if chat['id'] == chat_id:
            return jsonify(chat['messages'])
    
    return jsonify({'error': 'Чат не найден'}), 404

@app.route('/api/chats/<chat_id>/messages', methods=['POST'])
def add_message(chat_id):
    """Добавление нового сообщения в чат и получение ответа от AI"""
    user_id = _get_or_create_user()
    
    if user_id not in chats:
        return jsonify({'error': 'Пользователь не найден'}), 404
    
    data = request.json
    user_message = data.get('message', '')
    
    if not user_message:
        return jsonify({'error': 'Сообщение не может быть пустым'}), 400
    
    # Находим чат пользователя
    target_chat = None
    for chat in chats[user_id]:
        if chat['id'] == chat_id:
            target_chat = chat
            break
    
    if not target_chat:
        return jsonify({'error': 'Чат не найден'}), 404
    
    # Добавляем сообщение пользователя в историю
    user_message_obj = {
        'id': str(uuid.uuid4()),
        'role': 'user',
        'content': user_message,
        'timestamp': datetime.now().isoformat()
    }
    target_chat['messages'].append(user_message_obj)
    
    # Получаем инструкции пользователя
    user_instruction = DEFAULT_INSTRUCTION
    if user_id in user_settings and 'instructions' in user_settings[user_id]:
        user_instruction = user_settings[user_id]['instructions']
    
    # Запрос к API OpenRouter
    try:
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json; charset=utf-8",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "Furinochka"
        }
        
        # Формируем сообщения включая системную инструкцию
        messages = [
            {
                "role": "system",
                "content": user_instruction
            },
            {
                "role": "user",
                "content": user_message
            }
        ]
        
        # Добавляем предыдущие сообщения из чата для контекста (ограничиваем 10 последними)
        prev_messages = target_chat['messages'][:-1]  # Исключаем текущее сообщение пользователя
        if prev_messages:
            context_messages = prev_messages[-10:]  # Берем последние 10 сообщений
            messages = [messages[0]] + [
                {"role": msg["role"], "content": msg["content"]} 
                for msg in context_messages
            ] + [messages[1]]
        
        payload = {
            "model": "openai/gpt-3.5-turbo",
            "messages": messages,
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        logging.info("Отправка запроса к OpenRouter API")
        logging.debug(f"Инструкция: {user_instruction[:50]}...")
        
        # Используем стандартный метод без кодирования
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        logging.info(f"Получен ответ от API, статус: {response.status_code}")
        
        if response.status_code != 200:
            logging.error(f"Ошибка API: {response.status_code}, ответ: {response.text}")
            return jsonify({'error': f'Ошибка API: {response.status_code}, {response.text}'}), 500
        
        response_data = response.json()
        
        if 'choices' in response_data and len(response_data['choices']) > 0:
            ai_message = response_data['choices'][0]['message']['content']
            logging.info(f"Успешно получен ответ AI: {ai_message[:30]}...")
            
            # Добавляем ответ AI в историю
            ai_message_obj = {
                'id': str(uuid.uuid4()),
                'role': 'assistant',
                'content': ai_message,
                'timestamp': datetime.now().isoformat()
            }
            target_chat['messages'].append(ai_message_obj)
            
            return jsonify({
                'message': ai_message,
                'user_message_id': user_message_obj['id'],
                'ai_message_id': ai_message_obj['id']
            })
        else:
            error_msg = f"Структура ответа API некорректна: {response_data}"
            logging.error(error_msg)
            return jsonify({'error': error_msg}), 500
            
    except Exception as e:
        error_msg = f'Произошла ошибка: {str(e)}'
        logging.exception(error_msg)
        return jsonify({'error': error_msg}), 500

# Для обратной совместимости оставляем старый маршрут
@app.route('/api/chat', methods=['POST'])
def chat():
    """Создаем новый чат и добавляем сообщение"""
    user_id = _get_or_create_user()
    
    if user_id not in chats:
        chats[user_id] = []
    
    # Создаем новый чат
    chat_id = str(uuid.uuid4())
    chat_name = f'Новый чат {datetime.now().strftime("%d.%m.%Y %H:%M")}'
    
    new_chat = {
        'id': chat_id,
        'name': chat_name,
        'created_at': datetime.now().isoformat(),
        'messages': []
    }
    
    chats[user_id].append(new_chat)
    
    # Добавляем сообщение в этот чат
    data = request.json
    user_message = data.get('message', '')
    
    if not user_message:
        return jsonify({'error': 'Сообщение не может быть пустым'}), 400
    
    # Получаем инструкции пользователя
    user_instruction = DEFAULT_INSTRUCTION
    if user_id in user_settings and 'instructions' in user_settings[user_id]:
        user_instruction = user_settings[user_id]['instructions']
    
    # Запрос к API OpenRouter
    try:
        headers = {
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json; charset=utf-8",
            "HTTP-Referer": "http://localhost:5000",
            "X-Title": "Furinochka"
        }
        
        payload = {
            "model": "openai/gpt-3.5-turbo",
            "messages": [
                {
                    "role": "system",
                    "content": user_instruction
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            "max_tokens": 1000,
            "temperature": 0.7
        }
        
        logging.info("Отправка запроса к OpenRouter API")
        
        # Используем стандартный метод без кодирования
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        logging.info(f"Получен ответ от API, статус: {response.status_code}")
        
        if response.status_code != 200:
            logging.error(f"Ошибка API: {response.status_code}, ответ: {response.text}")
            return jsonify({'error': f'Ошибка API: {response.status_code}, {response.text}'}), 500
        
        response_data = response.json()
        
        if 'choices' in response_data and len(response_data['choices']) > 0:
            ai_message = response_data['choices'][0]['message']['content']
            logging.info(f"Успешно получен ответ AI: {ai_message[:30]}...")
            
            # Добавляем сообщения в историю чата
            new_chat['messages'].append({
                'id': str(uuid.uuid4()),
                'role': 'user',
                'content': user_message,
                'timestamp': datetime.now().isoformat()
            })
            
            new_chat['messages'].append({
                'id': str(uuid.uuid4()),
                'role': 'assistant',
                'content': ai_message,
                'timestamp': datetime.now().isoformat()
            })
            
            return jsonify({'message': ai_message, 'chat_id': chat_id})
        else:
            error_msg = f"Структура ответа API некорректна: {response_data}"
            logging.error(error_msg)
            return jsonify({'error': error_msg}), 500
            
    except Exception as e:
        error_msg = f'Произошла ошибка: {str(e)}'
        logging.exception(error_msg)
        return jsonify({'error': error_msg}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True) 
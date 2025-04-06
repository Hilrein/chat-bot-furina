import requests
import json

# Используем API ключ напрямую для тестирования
API_KEY = "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"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "model": "openai/gpt-3.5-turbo",
    "messages": [
        {
            "role": "user",
            "content": "Привет, это тестовое сообщение"
        }
    ]
}

print("Отправка запроса к OpenRouter API...")
try:
    response = requests.post(
        url="https://openrouter.ai/api/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=30
    )
    
    print(f"Статус ответа: {response.status_code}")
    print(f"Ответ: {response.text}")
    
    if response.status_code == 200:
        print("API ключ работает корректно!")
    else:
        print("Ошибка при использовании API ключа.")
        
except Exception as e:
    print(f"Произошла ошибка: {str(e)}") 
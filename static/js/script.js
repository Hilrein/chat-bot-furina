document.addEventListener('DOMContentLoaded', function() {
    const messageForm = document.getElementById('message-form');
    const userInput = document.getElementById('user-input');
    const messagesContainer = document.getElementById('messages');
    const chatContainer = document.getElementById('chat-container');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistory = document.getElementById('chat-history');
    
    // Элементы модального окна настроек
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const aiInstructions = document.getElementById('ai-instructions');
    const saveInstructionsBtn = document.getElementById('save-instructions-btn');
    const resetInstructionsBtn = document.getElementById('reset-instructions-btn');
    
    // Элементы модального окна информации о разработке
    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('about-modal');
    const closeAboutBtn = document.getElementById('close-about-btn');
    
    // Элементы мобильного интерфейса
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    
    // Текущий активный чат
    let currentChatId = null;
    
    // Инструкция по умолчанию
    const DEFAULT_INSTRUCTION = "Ты - Фуриночка, милый и заботливый ИИ-помощник, который отвечает дружелюбно и старается быть полезным.";
    
    // Загрузка списка чатов и настроек при инициализации
    loadChats();
    loadUserInstructions();
    
    // Обработчик для мобильного меню
    mobileMenuBtn.addEventListener('click', function() {
        toggleSidebar();
    });
    
    sidebarBackdrop.addEventListener('click', function() {
        closeSidebar();
    });
    
    // Закрываем боковую панель при изменении размера окна, если размер больше мобильного
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            sidebarBackdrop.classList.remove('active');
        }
    });
    
    // Функция открытия/закрытия боковой панели
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        sidebarBackdrop.classList.toggle('active');
    }
    
    // Функция закрытия боковой панели
    function closeSidebar() {
        sidebar.classList.remove('active');
        sidebarBackdrop.classList.remove('active');
    }
    
    // Обработчики для настроек
    settingsBtn.addEventListener('click', function() {
        settingsModal.style.display = 'block';
    });
    
    closeSettingsBtn.addEventListener('click', function() {
        settingsModal.style.display = 'none';
    });
    
    // Обработчики для модального окна информации о разработке
    aboutBtn.addEventListener('click', function() {
        aboutModal.style.display = 'block';
    });
    
    closeAboutBtn.addEventListener('click', function() {
        aboutModal.style.display = 'none';
    });
    
    // Закрытие модальных окон при клике вне их содержимого
    window.addEventListener('click', function(event) {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
        if (event.target === aboutModal) {
            aboutModal.style.display = 'none';
        }
    });
    
    // Сохранение инструкций
    saveInstructionsBtn.addEventListener('click', function() {
        const instructions = aiInstructions.value.trim();
        saveUserInstructions(instructions);
    });
    
    // Сброс инструкций к значению по умолчанию
    resetInstructionsBtn.addEventListener('click', function() {
        aiInstructions.value = DEFAULT_INSTRUCTION;
    });
    
    // Функция загрузки инструкций пользователя
    function loadUserInstructions() {
        fetch('/api/user/instructions')
            .then(response => response.json())
            .then(data => {
                aiInstructions.value = data.instructions || DEFAULT_INSTRUCTION;
            })
            .catch(error => {
                console.error('Ошибка при загрузке инструкций:', error);
                aiInstructions.value = DEFAULT_INSTRUCTION;
            });
    }
    
    // Функция сохранения инструкций пользователя
    function saveUserInstructions(instructions) {
        fetch('/api/user/instructions', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ instructions: instructions })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Инструкции сохранены успешно!');
                settingsModal.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Ошибка при сохранении инструкций:', error);
            alert('Ошибка при сохранении инструкций');
        });
    }
    
    // Автоматическое изменение высоты textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Максимальная высота
        if (this.scrollHeight > 200) {
            this.style.overflowY = 'auto';
        } else {
            this.style.overflowY = 'hidden';
        }
    });
    
    // Для textarea в настройках тоже добавляем автоматическое изменение высоты
    aiInstructions.addEventListener('input', function() {
        this.style.height = 'auto';
        if (this.scrollHeight < 300) {
            this.style.height = (this.scrollHeight) + 'px';
        } else {
            this.style.height = '300px';
            this.style.overflowY = 'auto';
        }
    });
    
    // Отправка сообщения по нажатию Enter (без Shift)
    userInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            messageForm.dispatchEvent(new Event('submit'));
        }
    });
    
    // Обработка отправки формы
    messageForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const message = userInput.value.trim();
        if (!message) return;
        
        // Если нет активного чата, создаем новый
        if (!currentChatId) {
            createNewChat().then(chatId => {
                currentChatId = chatId;
                sendMessage(message);
            });
        } else {
            sendMessage(message);
        }
    });
    
    // Функция создания нового чата
    function createNewChat() {
        return fetch('/api/chats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: 'Новый чат' })
        })
        .then(response => response.json())
        .then(chat => {
            // Добавляем чат в историю
            addChatToHistory(chat);
            // Очищаем сообщения
            messagesContainer.innerHTML = '';
            // Скрываем приветственное сообщение
            document.querySelector('.welcome-message').style.display = 'none';
            return chat.id;
        });
    }
    
    // Отправка сообщения в активный чат
    function sendMessage(message) {
        // Добавляем сообщение пользователя
        addMessage('user', message);
        
        // Очищаем поле ввода и сбрасываем его высоту
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Показываем, что AI печатает
        const aiTyping = document.createElement('div');
        aiTyping.className = 'message ai';
        aiTyping.innerHTML = `
            <div class="message-content">
                <div class="message-body">
                    <div class="message-avatar">AI</div>
                    <div class="message-text">
                        <div class="loader">
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(aiTyping);
        scrollToBottom();
        
        // На мобильных устройствах закрываем боковую панель при отправке сообщения
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
        
        // Отправляем запрос к API
        fetch(`/api/chats/${currentChatId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            // Удаляем индикатор печатания
            messagesContainer.removeChild(aiTyping);
            
            // Добавляем ответ AI
            if (data.error) {
                addMessage('ai', `Ошибка: ${data.error}`);
            } else {
                addMessage('ai', data.message);
                
                // Обновляем имя чата, если это первое сообщение
                const chatItem = document.querySelector(`#chat-history li[data-chat-id="${currentChatId}"]`);
                if (chatItem && message.length > 0) {
                    // Сокращаем сообщение для названия чата
                    const shortMessage = message.length > 30 ? message.substring(0, 30) + '...' : message;
                    const chatName = shortMessage;
                    
                    // Обновляем имя чата в истории
                    const chatNameSpan = chatItem.querySelector('.chat-name');
                    if (chatNameSpan) {
                        chatNameSpan.textContent = chatName;
                    }
                    
                    // Обновляем имя чата на сервере
                    updateChatName(currentChatId, chatName);
                }
            }
        })
        .catch(error => {
            // Удаляем индикатор печатания
            messagesContainer.removeChild(aiTyping);
            
            // Добавляем сообщение об ошибке
            addMessage('ai', `Произошла ошибка при связи с сервером: ${error.message}`);
        });
    }
    
    // Загрузка списка чатов
    function loadChats() {
        fetch('/api/chats')
            .then(response => response.json())
            .then(chats => {
                // Очищаем список чатов
                chatHistory.innerHTML = '';
                
                // Добавляем чаты в список
                chats.forEach(chat => {
                    addChatToHistory(chat);
                });
            })
            .catch(error => {
                console.error('Ошибка при загрузке чатов:', error);
            });
    }
    
    // Загрузка сообщений чата
    function loadChatMessages(chatId) {
        fetch(`/api/chats/${chatId}/messages`)
            .then(response => response.json())
            .then(messages => {
                // Очищаем список сообщений
                messagesContainer.innerHTML = '';
                
                // Скрываем приветственное сообщение
                document.querySelector('.welcome-message').style.display = 'none';
                
                // Добавляем сообщения в список
                messages.forEach(msg => {
                    addMessage(msg.role, msg.content);
                });
                
                // Прокручиваем вниз
                scrollToBottom();
                
                // На мобильных устройствах закрываем боковую панель при загрузке чата
                if (window.innerWidth <= 768) {
                    closeSidebar();
                }
            })
            .catch(error => {
                console.error('Ошибка при загрузке сообщений:', error);
            });
    }
    
    // Обновление имени чата
    function updateChatName(chatId, newName) {
        fetch(`/api/chats/${chatId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        })
        .then(response => response.json())
        .catch(error => {
            console.error('Ошибка при обновлении имени чата:', error);
        });
    }
    
    // Удаление чата
    function deleteChat(chatId) {
        fetch(`/api/chats/${chatId}`, {
            method: 'DELETE'
        })
        .then(() => {
            // Удаляем чат из списка
            const chatItem = document.querySelector(`#chat-history li[data-chat-id="${chatId}"]`);
            if (chatItem) {
                chatItem.remove();
            }
            
            // Если удаляем текущий чат, сбрасываем состояние
            if (currentChatId === chatId) {
                currentChatId = null;
                messagesContainer.innerHTML = '';
                document.querySelector('.welcome-message').style.display = 'flex';
            }
        })
        .catch(error => {
            console.error('Ошибка при удалении чата:', error);
        });
    }
    
    // Добавление нового сообщения в чат
    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        let avatar = role === 'user' ? 'Вы' : 'AI';
        
        // Форматирование сообщения для поддержки параграфов и кода
        let formattedContent = formatMessage(content);
        
        messageDiv.innerHTML = `
            <div class="message-content">
                <div class="message-body">
                    <div class="message-avatar">${avatar}</div>
                    <div class="message-text">${formattedContent}</div>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
    }
    
    // Форматирование сообщения 
    function formatMessage(content) {
        // Сначала обрабатываем блоки кода (текст между ```)
        content = content.replace(/```([\s\S]*?)```/g, function(match, code) {
            return `<pre><code>${escapeHtml(code)}</code></pre>`;
        });
        
        // Затем обрабатываем обычный текст, разбивая на параграфы
        content = content.split('\n\n').map(paragraph => {
            // Пропускаем параграфы, которые уже обработаны как код
            if (paragraph.includes('<pre><code>')) {
                return paragraph;
            }
            
            // Обрабатываем инлайн-код (текст между `)
            paragraph = paragraph.replace(/`([^`]+)`/g, '<code>$1</code>');
            
            // Обрабатываем перенос строки
            paragraph = paragraph.replace(/\n/g, '<br>');
            
            return `<p>${paragraph}</p>`;
        }).join('');
        
        return content;
    }
    
    // Экранирование HTML
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // Прокрутка чата вниз
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Обработка кнопки "Новый чат"
    newChatBtn.addEventListener('click', function() {
        // Создаем новый чат
        createNewChat().then(chatId => {
            currentChatId = chatId;
            
            // На мобильных устройствах закрываем боковую панель после создания чата
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
    
    // Добавление чата в историю
    function addChatToHistory(chat) {
        const historyItem = document.createElement('li');
        historyItem.setAttribute('data-chat-id', chat.id);
        
        // Если есть сообщения, используем первое для названия чата
        let chatName = chat.name;
        if (chat.messages && chat.messages.length > 0 && chat.messages[0].role === 'user') {
            const firstMessage = chat.messages[0].content;
            chatName = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
        }
        
        historyItem.innerHTML = `
            <div class="chat-item">
                <i class="fas fa-comment"></i>
                <span class="chat-name">${escapeHtml(chatName)}</span>
                <div class="chat-actions">
                    <button class="edit-chat-btn" title="Редактировать"><i class="fas fa-edit"></i></button>
                    <button class="delete-chat-btn" title="Удалить"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        
        // Обработчик клика на чат
        historyItem.addEventListener('click', function(e) {
            // Если клик не на кнопки действий
            if (!e.target.closest('.chat-actions')) {
                currentChatId = chat.id;
                loadChatMessages(chat.id);
                
                // Подсвечиваем активный чат
                document.querySelectorAll('#chat-history li').forEach(item => {
                    item.classList.remove('active');
                });
                historyItem.classList.add('active');
            }
        });
        
        // Обработчик кнопки редактирования
        historyItem.querySelector('.edit-chat-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            
            const chatNameSpan = historyItem.querySelector('.chat-name');
            const currentName = chatNameSpan.textContent;
            
            const newName = prompt('Введите новое имя чата:', currentName);
            if (newName && newName.trim() !== '') {
                chatNameSpan.textContent = newName;
                updateChatName(chat.id, newName);
            }
        });
        
        // Обработчик кнопки удаления
        historyItem.querySelector('.delete-chat-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (confirm('Вы уверены, что хотите удалить этот чат?')) {
                deleteChat(chat.id);
            }
        });
        
        // Добавляем в историю
        chatHistory.prepend(historyItem);
        
        // Если это первый чат, активируем его
        if (chatHistory.children.length === 1) {
            historyItem.classList.add('active');
            currentChatId = chat.id;
            
            // Если есть сообщения, загружаем их
            if (chat.messages && chat.messages.length > 0) {
                // Скрываем приветственное сообщение
                document.querySelector('.welcome-message').style.display = 'none';
                
                // Загружаем сообщения
                chat.messages.forEach(msg => {
                    addMessage(msg.role, msg.content);
                });
            }
        }
    }
}); 
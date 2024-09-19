// Botd initialization
const botdPromise = import('https://openfpcdn.io/botd/v1')
  .then(Botd => Botd.load());

botdPromise
  .then(botd => botd.detect())
  .then(result => {
    console.log(result);
    document.cookie = "botd=" + JSON.stringify(result) + "; path=/; secure; SameSite=strict";
    
    // Check if the user is a bot
    if (result.bot) {
        // Handle the case where a bot is detected
        document.body.innerHTML = `
          <h1>Access Denied</h1>
          <p>We have detected unusual activity from your network. Access to this site is restricted.</p>
        `;
    }
  })
  .catch(error => {
    console.error(error);
    document.body.innerHTML = `
      <h1>Error</h1>
      <p>There was a problem processing your request.</p>
    `;
  });

(function () {
  // Add the template to html on page load
  var template = `
    <!-- Code :) -->
    <div class="chatbot__welcome__text">
      <span class="material-symbols-outlined" id="hide-welcome-text">cancel</span>
      <p>Hi! How can I help you today?</p>
    </div>
    <button class="chatbot__button">
      <span class="material-symbols-outlined">close</span>
    </button>
    <div class="chatbot">
      <div class="chatbot__header">
        <h3 class="chatbox__title">SAcommunity's Chatbot</h3>
        <span class="material-symbols-outlined">close</span>
      </div>
      <ul class="chatbot__box">
        <li class="chatbot__chat incoming">
          <img src="chatbot.png"></img>
          <p>Hi! I'm SAcommunity's chatbot. If you are looking for community services, feel free to ask me.</p>
      </ul>
      <div class="chatbot__input-box">
        <textarea
          class="chatbot__textarea"
          placeholder="Type your message here"
          maxlength="200"
          required
        ></textarea>
        <span id="send-btn" class="material-symbols-outlined">send</span>
        <div id="charCount">0 / 200</div>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('afterbegin', template);
  document.getElementById('hide-welcome-text').addEventListener('click', () => {
    document.querySelector('.chatbot__welcome__text').style.display = 'none';
  });
  
  var socket = io('http://localhost:5000', {transports: ['websocket']}); // Connect to the server using Socket.IO
  
  const chatbotToggle = document.querySelector('.chatbot__button');
  const sendChatBtn = document.querySelector('#send-btn');
  const chatInput = document.querySelector('.chatbot__textarea');
  const charCountDisplay = document.getElementById('charCount');
  const chatBox = document.querySelector('.chatbot__box');
  const chatbotCloseBtn = document.querySelector('.chatbot__header span');
  const welcomeText = document.querySelector('.chatbot__welcome__text');
  const inputInitHeight = chatInput.scrollHeight;

  let userMessage = '';
  
  const createChatLi = (message, className) => {
    const chatLi = document.createElement('li');
    chatLi.classList.add('chatbot__chat', className);
    const iconImg = className === 'incoming' ? `<img src="chatbot.png">` : '';
    chatLi.innerHTML = `${iconImg} <p>${message}</p>`;
    return chatLi;
  };
  
  // Define linkify function to convert all found URLs into clickable links
  function linkify(text) {
    var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, function(url) {
      return '<a href="' + url + '" target="_blank">' + url + '</a>';
    });
  }
  
  const handleChat = () => {
    userMessage = chatInput.value.trim();
    if (!userMessage) return;
    chatInput.value = '';
    charCountDisplay.textContent = '0 / 200';
    chatInput.style.height = `${inputInitHeight}px`;
  
    chatBox.appendChild(createChatLi(userMessage, 'outgoing'));
    chatBox.appendChild(createChatLi('Thinking...', 'incoming'));
    chatBox.scrollTo(0, chatBox.scrollHeight);
  
    socket.emit('user_query', {userInput: userMessage});
  };

  // Receive messages from server
  socket.on('chat_response', function(data) {
    const incomingChatLi = createChatLi(data.reply, 'incoming');
    const messageElement = incomingChatLi.querySelector('p');
    // Remove all occurrences of "**" from the text
    const nonstarMessage = data.reply.replace(/\*\*/g, '');
    // Remove all occurrences of parentheses
    const cleanedMessage = nonstarMessage.replace(/[()]/g, '');
    // Replace "[Link]" with ":"
    const linkReplacedMessage = cleanedMessage.replace(/\[Link\]/g, '');
    // Split message into lines and bold the first line after a numeral
    const lines = linkReplacedMessage.split('\n');
    const formattedLines = lines.map(line => {
        // Insert a new line before each URL
        line = line.replace(/(https?:\/\/\S+)/gi, '<br>$1');
        // Bold from start to the first occurrence of an URL or end of line
        return line.replace(/^(\d+\.\s+)(.*?)(?=<br>|$)/, '$1<b>$2</b>');
    });
    const formattedMessage = formattedLines.join('<br>');  // Using <br> to replace \n to preserve the line breaks

    // Use the linkify function to convert URLs in the text to clickable links
    messageElement.innerHTML = linkify(formattedMessage);
    chatBox.removeChild(chatBox.lastChild);
    chatBox.appendChild(incomingChatLi);
    chatBox.scrollTop = chatBox.scrollHeight;
  });
  
  chatInput.addEventListener('input', () => {
    const charCount = chatInput.value.length;
    charCountDisplay.textContent = `${charCount} / 200`;
    chatInput.style.height = `${inputInitHeight}px`;
    chatInput.style.height = `${chatInput.scrollHeight}px`;
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 800) {
      e.preventDefault();
      handleChat();
    }
  });

  chatbotToggle.addEventListener('click', () => {
    document.body.classList.toggle('show-chatbot');
    chatbotToggle.classList.toggle('close');
    if (document.body.classList.contains('show-chatbot')) {
      welcomeText.style.display = 'none'; // Hide welcome text when chatbot is shown
    } else {
      welcomeText.style.display = 'block'; // Show welcome text when chatbot is hidden
    }
  });

  chatbotCloseBtn.addEventListener('click', () =>
    document.body.classList.remove('show-chatbot')
  );
  
  sendChatBtn.addEventListener('click', handleChat);
  })();
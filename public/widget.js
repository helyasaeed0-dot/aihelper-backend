(function () {
  // ===== Script tag se settings uthao =====
  // Business apni website mein aisa likhega:
  // <script src="http://localhost:5000/widget.js" data-business-id="xxxx"></script>
  var currentScript = document.currentScript;
  var businessId = currentScript.getAttribute("data-business-id");
  var apiUrl = currentScript.getAttribute("data-api-url") || "http://localhost:5000";

  if (!businessId) {
    console.error("AIHelper widget: data-business-id zaroori hai script tag mein");
    return;
  }

  // Conversation history yahan yaad rakhenge (taake AI ko context mile)
  var history = [];

  // Har baar jab page load ho, ek naya session ID banao
  // (taake backend har conversation ko alag track kar sake)
  var sessionId = "session-" + Date.now() + "-" + Math.random().toString(36).slice(2);

  // ===== CSS inject karo (widget ki styling) =====
  var style = document.createElement("style");
  style.textContent = `
    .aih-bubble-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #2563eb;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 28px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .aih-chat-window {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 340px;
      height: 460px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.25);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      font-family: Arial, sans-serif;
    }
    .aih-chat-window.aih-open {
      display: flex;
    }
    .aih-header {
      background: #2563eb;
      color: white;
      padding: 14px;
      font-weight: bold;
      font-size: 14px;
    }
    .aih-messages {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      background: #f3f4f6;
    }
    .aih-msg {
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 10px;
      margin-bottom: 8px;
      font-size: 13px;
      line-height: 1.4;
      white-space: pre-wrap;
    }
    .aih-msg-user {
      background: #2563eb;
      color: white;
      margin-left: auto;
    }
    .aih-msg-bot {
      background: white;
      color: #111;
      border: 1px solid #e5e7eb;
    }
    .aih-input-area {
      display: flex;
      border-top: 1px solid #e5e7eb;
      padding: 8px;
    }
    .aih-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 8px;
      font-size: 13px;
      outline: none;
    }
    .aih-send-btn {
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 14px;
      margin-left: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .aih-typing {
      font-size: 12px;
      color: #6b7280;
      padding: 4px 12px;
    }
  `;
  document.head.appendChild(style);

  // ===== HTML elements banao =====
  var bubbleBtn = document.createElement("button");
  bubbleBtn.className = "aih-bubble-btn";
  bubbleBtn.innerHTML = "💬";

  var chatWindow = document.createElement("div");
  chatWindow.className = "aih-chat-window";
  chatWindow.innerHTML = `
    <div class="aih-header">AI Assistant</div>
    <div class="aih-messages" id="aih-messages"></div>
    <div class="aih-typing" id="aih-typing" style="display:none;">Typing...</div>
    <div class="aih-input-area">
      <input type="text" class="aih-input" id="aih-input" placeholder="Type a message..." />
      <button class="aih-send-btn" id="aih-send">Send</button>
    </div>
  `;

  document.body.appendChild(bubbleBtn);
  document.body.appendChild(chatWindow);

  var messagesDiv = chatWindow.querySelector("#aih-messages");
  var typingDiv = chatWindow.querySelector("#aih-typing");
  var inputEl = chatWindow.querySelector("#aih-input");
  var sendBtn = chatWindow.querySelector("#aih-send");

  // Shuru mein ek welcome message dikhao
  // Shuru mein business ka custom welcome message fetch karo
  // (agar fail ho jaye to default message dikha do)
  fetch(apiUrl + "/api/business/public/" + businessId)
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      addMessage("bot", data.welcomeMessage || "Hi! How can I help you today?");
    })
    .catch(function () {
      addMessage("bot", "Hi! How can I help you today?");
    });

  // ===== Bubble click - chat window kholo/band karo =====
  bubbleBtn.addEventListener("click", function () {
    chatWindow.classList.toggle("aih-open");
  });

  // ===== Message bhejne ka function =====
  function sendMessage() {
    var text = inputEl.value.trim();
    if (!text) return;

    addMessage("user", text);
    inputEl.value = "";
    typingDiv.style.display = "block";

    fetch(apiUrl + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: businessId,
        message: text,
        history: history,
        sessionId: sessionId,
      }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        typingDiv.style.display = "none";
        if (data.reply) {
          addMessage("bot", data.reply);
          // History update karo taake agla message context ke sath jaye
          history.push({ role: "user", text: text });
          history.push({ role: "assistant", text: data.reply });
        } else {
          addMessage("bot", "Sorry, kuch masla ho gaya. Dobara try karo.");
        }
      })
      .catch(function () {
        typingDiv.style.display = "none";
        addMessage("bot", "Connection error. Dobara try karo.");
      });
  }

  // Message ko chat window mein dikhane ka function
  function addMessage(sender, text) {
    var msgEl = document.createElement("div");
    msgEl.className = "aih-msg " + (sender === "user" ? "aih-msg-user" : "aih-msg-bot");
    msgEl.textContent = text;
    messagesDiv.appendChild(msgEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // hamesha neeche scroll rahe
  }

  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
  });
})();
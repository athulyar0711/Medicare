(function () {
  // Inject CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@48,400,0,0';
  document.head.appendChild(link);

  const cssLink = document.createElement('link');
  cssLink.rel = 'stylesheet';
  cssLink.href = '/css/chatbot-widget.css';
  document.head.appendChild(cssLink);

  // Inject HTML
  const widgetHtml = `
      <button class="chatbot-toggler">
        <span class="material-symbols-rounded icon-message">mode_comment</span>
        <span class="material-symbols-rounded icon-close">close</span>
      </button>
      <div class="chatbot-popup">
        <!-- chatbot Header -->
        <div class="chat-header">
          <div class="header-info">
            <svg class="chatbot-logo" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
              <path
                d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z">
              </path>
            </svg>
            <h2 class="logo-text">MEDICARE AI</h2>
          </div>
          <button id="close-chatbot" class="material-symbols-rounded">expand_more</button>
        </div>
        <!-- chatbot Body -->
        <div class="chat-body">
          <div class="message bot-message">
            <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
              <path
                d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z">
              </path>
            </svg>
            <div class="message-text">
              👋 Hello! I'm your Medicare AI Health Assistant.<br /><br />
              How can I help you today? You can also upload a health report for me to simplify.
            </div>
          </div>
        </div>
        <!-- chatbot Footer -->
        <div class="chat-footer">
          <form action="#" class="chat-form">
            <textarea placeholder="Message..." class="message-input" required></textarea>
            <div class="chat-controls">
              <div class="file-upload-wrapper">
                <input type="file" accept="images/*" id="file-input" hidden>
                <img src="#">
                <button type="button" id="file-upload" class="material-symbols-rounded">attach_file</button>
                <button type="button" id="file-cancel" class="material-symbols-rounded">close</button>
              </div>
              <button type="submit" id="send-message" class="material-symbols-rounded">arrow_upward</button>
            </div>
          </form>
        </div>
      </div>
    `;

  const widgetContainer = document.createElement('div');
  widgetContainer.innerHTML = widgetHtml;
  document.body.appendChild(widgetContainer);

  // Initialize logic
  const chatbotToggler = document.querySelector(".chatbot-toggler");
  const closeBtn = document.querySelector("#close-chatbot");
  const chatBody = document.querySelector(".chat-body");
  const messageInput = document.querySelector(".message-input");
  const sendMessageButton = document.querySelector("#send-message");
  const fileInput = document.querySelector("#file-input");
  const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
  const fileCancelButton = document.querySelector("#file-cancel");



  const userData = {
    message: null,
    file: {
      data: null,
      mime_type: null
    }
  };

  // Toggle Chatbot
  chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
  closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));

  const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
  };

  const loadChatHistory = async () => {
       try {
           // We fetch using a full URL or assuming apiFetch is global from auth.js
           if (typeof apiFetch !== 'function') return; 
           
           const response = await apiFetch('/chat');
           if (response && response.messages && response.messages.length > 0) {
                chatBody.innerHTML = ''; // clear initial hello message
                response.messages.forEach(msg => {
                     const content = `
                         <div class="message-text">${msg.text}</div>
                     `;
                     const msgClass = msg.role === 'user' ? 'user-message' : 'bot-message';
                     
                     let fullContent = content;
                     if (msg.role === 'model') {
                          fullContent = `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 1024 1024">
                              <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path>
                          </svg>
                          ${content}`;
                     } else if (msg.role === 'user' && msg.file_id) {
                          fullContent += `<img src="/api/files/${msg.file_id}" class="attachment" onerror="this.style.display='none'" />`;
                     }

                     const div = createMessageElement(fullContent, msgClass);
                     if (msg.role === 'model') {
                         div.querySelector(".message-text").innerHTML = msg.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/^#+\s?/gm, "").replace(/\n/g, "<br>");
                     }
                     
                     chatBody.appendChild(div);
                });
                chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
           }
       } catch (err) {
           console.error("Failed to load chat history", err);
       }
  };

  // Generate bot response using API
  const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text")
    try {
        let fileId = null;

        // 1. Upload File (if present)
        if (userData.file.data) {
            const uploadResp = await apiFetch('/files/upload', {
                method: 'POST',
                body: JSON.stringify({
                    filename: `img_${Date.now()}`,
                    mimeType: userData.file.mime_type,
                    data: userData.file.data
                })
            });
            fileId = uploadResp.fileId;
        }

        // 2. Transmit message directly to backend chat router
        const response = await apiFetch('/chat', {
            method: 'POST',
            body: JSON.stringify({
                text: userData.message,
                file_id: fileId
            })
        });

        if (response.error) throw new Error(response.error);

        const apiResponseText = response.reply
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/^#+\s?/gm, "")
            .trim();
        messageElement.innerHTML = apiResponseText.replace(/\n/g, "<br>");

    } catch (error) {
      // Handle error in API response
      console.log("Error:", error);
      messageElement.innerText = "Sorry, I am having trouble connecting right now.";
      messageElement.style.color = "#ff6b6b";
    }
    finally {
      // Reset user's file data, remove thinking indicator and scroll map
      userData.file = {};
      incomingMessageDiv.classList.remove("thinking");
      chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    }
  };

  // Handle outgoing user messages
  const handleOutgoingMessage = (e) => {
    e.preventDefault();
    userData.message = messageInput.value.trim();
    messageInput.value = "";
    fileUploadWrapper.classList.remove("file-uploaded");

    if (!userData.message && !userData.file.data) return;

    // Create and Display user message
    const messageContent = `
      <div class="message-text"></div>
      ${userData.file.data
        ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />`
        : ""
      }
      `;
    const outgoingMessageDiv = createMessageElement(
      messageContent,
      "user-message",
    );
    outgoingMessageDiv.querySelector(".message-text").textContent = userData.message;
    if (!userData.message) {
      outgoingMessageDiv.querySelector(".message-text").style.display = "none";
    }

    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Reset file upload UI inside the input toolbar
    fileUploadWrapper.classList.remove("file-uploaded");
    fileUploadWrapper.querySelector("img").src = "#";
    fileInput.value = "";

    // simulate bot response with thinking indicator after a delay
    setTimeout(() => {
      const messageContent = `<svg class="bot-avatar"
                xmlns="http://www.w3.org/2000/svg"
                width="50"
                height="50"
                viewBox="0 0 1024 1024"
              >
                <path
                  d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"
                ></path>
              </svg>
              <div class="message-text">
                <div class="thinking-indicator">
                  <div class="dot"></div>
                  <div class="dot"></div>
                  <div class="dot"></div>
                </div>
              </div>`;

      const incomingMessageDiv = createMessageElement(
        messageContent,
        "bot-message",
        "thinking"
      );

      chatBody.appendChild(incomingMessageDiv);
      chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
      generateBotResponse(incomingMessageDiv);
    }, 600);
  };

  // Handle Enter key press for sending messages
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleOutgoingMessage(e);
    }
  });

  // Handle file input change and preview the selected file
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      fileUploadWrapper.querySelector("img").src = e.target.result;
      fileUploadWrapper.classList.add("file-uploaded")
      const base64String = e.target.result.split(",")[1];

      // Store file data in userData
      userData.file = {
        data: base64String,
        mime_type: file.type
      }
      fileInput.value = "";
    }
    reader.readAsDataURL(file);

    // Focus on message input so they can type after uploading
    messageInput.focus();
  });

  fileCancelButton.addEventListener("click", () => {
    userData.file = {};
    fileInput.value = "";
    fileUploadWrapper.querySelector("img").src = "#";
    fileUploadWrapper.classList.remove("file-uploaded");
  });

  sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
  document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());

  // Wait briefly for auth.js to load apifetch (if the widget script completes slightly faster)
  setTimeout(() => loadChatHistory(), 500);
})();

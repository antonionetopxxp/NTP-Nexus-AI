const $ = (s) => document.querySelector(s);

const messagesEl = $("#messages");
const promptEl = $("#prompt");
const sendBtn = $("#sendBtn");
const fileInput = $("#fileInput");
const attachmentsEl = $("#attachments");
const webSearchEl = $("#webSearch");
const autoSpeakEl = $("#autoSpeak");

let selectedFiles = [];
let activeChatId = null;
let currentMode = "chat";

let chats = JSON.parse(
  localStorage.getItem("nexus_chats") || "[]"
);

let settings = JSON.parse(
  localStorage.getItem("nexus_settings") ||
  '{"assistantName":"Nexus AI","systemPrompt":""}'
);


// ===============================
// SALVAR DADOS
// ===============================

function saveChats() {
  localStorage.setItem(
    "nexus_chats",
    JSON.stringify(chats)
  );
}

function saveSettings() {
  localStorage.setItem(
    "nexus_settings",
    JSON.stringify(settings)
  );
}


// ===============================
// NOVA CONVERSA
// ===============================

function newChat() {

  activeChatId = crypto.randomUUID();

  chats.unshift({
    id: activeChatId,
    title: "Nova conversa",
    messages: [],
    createdAt: Date.now()
  });

  saveChats();
  renderChatList();
  renderMessages();
}


// ===============================
// CHAT ATUAL
// ===============================

function currentChat() {
  return chats.find(
    c => c.id === activeChatId
  );
}


// ===============================
// LISTA DE CONVERSAS
// ===============================

function renderChatList() {

  $("#chatList").innerHTML = chats.map(c => `
    <button
      class="chat-item ${c.id === activeChatId ? "active" : ""}"
      data-id="${c.id}"
    >
      ${escapeHtml(c.title)}
    </button>
  `).join("");

  document
    .querySelectorAll(".chat-item")
    .forEach(btn => {

      btn.onclick = () => {

        activeChatId = btn.dataset.id;

        renderChatList();
        renderMessages();

        $("#sidebar")
          .classList
          .remove("open");
      };

    });
}


// ===============================
// SEGURANÇA HTML
// ===============================

function escapeHtml(s = "") {

  return String(s).replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );

}


// ===============================
// RENDERIZAR MENSAGENS
// ===============================

function renderMessages() {

  const chat = currentChat();

  if (!chat || chat.messages.length === 0) {

    messagesEl.innerHTML = `
      <div class="welcome" id="welcome">

        <div class="orb">
          ✦
        </div>

        <h1>
          Como posso ajudar?
        </h1>

        <p>
          Converse, crie imagens, gere vídeos,
          envie arquivos ou use sua voz.
        </p>

        <div class="ai-modes">

          <button
            class="mode-btn ${currentMode === "chat" ? "active" : ""}"
            data-mode="chat"
            type="button"
          >
            💬
            <span>Chat</span>
          </button>

          <button
            class="mode-btn ${currentMode === "image" ? "active" : ""}"
            data-mode="image"
            type="button"
          >
            🖼️
            <span>Imagem</span>
          </button>

          <button
            class="mode-btn ${currentMode === "video" ? "active" : ""}"
            data-mode="video"
            type="button"
          >
            🎬
            <span>Vídeo</span>
          </button>

        </div>

        <div class="suggestions">

          <button
            data-prompt="Crie um plano de negócios simples para minha ideia."
          >
            Plano de negócios
          </button>

          <button
            data-prompt="Explique este assunto de forma simples e com exemplos."
          >
            Explicar um assunto
          </button>

          <button
            data-prompt="Crie um site moderno em HTML, CSS e JavaScript."
          >
            Criar um site
          </button>

          <button
            data-prompt="Analise o arquivo que vou enviar e faça um resumo."
          >
            Analisar arquivo
          </button>

        </div>

      </div>
    `;

    bindSuggestions();
    bindModes();

    return;
  }

  messagesEl.innerHTML =
    chat.messages
      .map(m => messageHTML(m))
      .join("");

  messagesEl.scrollTop =
    messagesEl.scrollHeight;
}


// ===============================
// HTML DA MENSAGEM
// ===============================

function messageHTML(m) {

  const who =
    m.role === "user"
      ? "Você"
      : settings.assistantName;

  return `
    <div class="message-row ${m.role}">

      <div class="avatar">
        ${m.role === "user" ? "U" : "✦"}
      </div>

      <div>

        <div class="message">
          ${escapeHtml(m.content)}
        </div>

        <div class="message-meta">
          ${escapeHtml(who)}
        </div>

      </div>

    </div>
  `;
}


// ===============================
// ADICIONAR MENSAGEM
// ===============================

function addMessage(role, content) {

  const chat = currentChat();

  if (!chat) return;

  chat.messages.push({
    role,
    content
  });

  if (
    role === "user" &&
    chat.messages.filter(
      x => x.role === "user"
    ).length === 1
  ) {

    chat.title =
      content.slice(0, 42) ||
      "Nova conversa";
  }

  saveChats();
  renderChatList();
  renderMessages();
}


// ===============================
// PENSANDO
// ===============================

function setThinking(on) {

  $("#thinking")?.remove();

  if (!on) return;

  messagesEl.insertAdjacentHTML(
    "beforeend",
    `
      <div
        class="message-row assistant"
        id="thinking"
      >

        <div class="avatar">
          ✦
        </div>

        <div>

          <div class="message thinking">
            Pensando...
          </div>

        </div>

      </div>
    `
  );

  messagesEl.scrollTop =
    messagesEl.scrollHeight;
}


// ===============================
// MUDAR MODO
// ===============================

function setMode(mode) {

  currentMode = mode;

  document
    .querySelectorAll(".mode-btn")
    .forEach(btn => {

      btn.classList.toggle(
        "active",
        btn.dataset.mode === mode
      );

    });

  const indicator =
    $("#modeIndicator");

  const placeholder =
    promptEl;

  if (mode === "chat") {

    indicator.textContent =
      "💬 Modo Chat";

    placeholder.placeholder =
      "Mensagem para Nexus AI...";

  }

  else if (mode === "image") {

    indicator.textContent =
      "🖼️ Criador de Imagens";

    placeholder.placeholder =
      "Descreva a imagem que você quer criar...";

  }

  else if (mode === "video") {

    indicator.textContent =
      "🎬 Criador de Vídeos";

    placeholder.placeholder =
      "Descreva o vídeo que você quer criar...";

  }

}


// ===============================
// BOTÕES DE MODO
// ===============================

function bindModes() {

  document
    .querySelectorAll(".mode-btn")
    .forEach(btn => {

      btn.onclick = () => {

        setMode(
          btn.dataset.mode
        );

        promptEl.focus();

      };

    });

}


// ===============================
// ENVIAR
// ===============================

async function send() {

  const message =
    promptEl.value.trim();

  if (
    !message &&
    selectedFiles.length === 0
  ) {
    return;
  }


  // ============================
  // MODO IMAGEM
  // ============================

  if (currentMode === "image") {

    await createImage(message);

    return;
  }


  // ============================
  // MODO VÍDEO
  // ============================

  if (currentMode === "video") {

    await createVideo(message);

    return;
  }


  // ============================
  // MODO CHAT
  // ============================

  if (!activeChatId) {
    newChat();
  }

  const chat =
    currentChat();

  const history =
    chat.messages.slice(-20);

  addMessage(
    "user",
    message ||
    `Enviei ${selectedFiles.length} arquivo(s) para análise.`
  );

  promptEl.value = "";

  autoResize();

  setThinking(true);

  sendBtn.disabled = true;


  const fd =
    new FormData();

  fd.append(
    "message",
    message
  );

  fd.append(
    "history",
    JSON.stringify(history)
  );

  fd.append(
    "webSearch",
    String(webSearchEl.checked)
  );

  fd.append(
    "systemPrompt",
    settings.systemPrompt || ""
  );


  selectedFiles.forEach(file => {

    fd.append(
      "files",
      file
    );

  });


  try {

    const response =
      await fetch(
        "/.netlify/functions/chat",
        {
          method: "POST",
          body: fd
        }
      );


    const raw =
      await response.text();

    let data = {};


    if (raw.trim()) {

      try {

        data =
          JSON.parse(raw);

      }

      catch (parseError) {

        console.error(
          "Resposta não-JSON:",
          raw
        );

        throw new Error(
          `Servidor retornou uma resposta inválida (HTTP ${response.status}).`
        );

      }

    }


    if (!response.ok) {

      throw new Error(
        data.error ||
        data.message ||
        `Erro HTTP ${response.status}`
      );

    }


    if (!data.text) {

      console.error(
        "Resposta do servidor:",
        data
      );

      throw new Error(
        "A IA não retornou nenhum texto."
      );

    }


    setThinking(false);

    addMessage(
      "assistant",
      data.text
    );


    if (autoSpeakEl.checked) {

      speak(data.text);

    }


  }

  catch (err) {

    console.error(
      "Erro Nexus AI:",
      err
    );

    setThinking(false);

    addMessage(
      "assistant",
      "Erro: " +
      (
        err.message ||
        "Não foi possível conectar ao servidor."
      )
    );

  }

  finally {

    selectedFiles = [];

    renderAttachments();

    sendBtn.disabled = false;

  }

}


// ===============================
// CRIADOR DE IMAGEM
// ===============================

async function createImage(prompt) {

  if (!prompt) {

    alert(
      "Digite uma descrição para criar a imagem."
    );

    return;
  }


  addMessage(
    "user",
    "🖼️ " + prompt
  );

  promptEl.value = "";

  autoResize();

  setThinking(true);

  sendBtn.disabled = true;


  try {

    const response =
      await fetch(
        "/.netlify/functions/image",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            prompt
          })

        }
      );


    const raw =
      await response.text();

    let data = {};


    if (raw.trim()) {

      try {

        data =
          JSON.parse(raw);

      }

      catch {

        throw new Error(
          `Resposta inválida do servidor (HTTP ${response.status}).`
        );

      }

    }


    if (!response.ok) {

      throw new Error(
        data.error ||
        `Erro HTTP ${response.status}`
      );

    }


    setThinking(false);


    if (data.image) {

      addImageMessage(
        data.image,
        prompt
      );

    }

    else {

      throw new Error(
        "O gerador não retornou uma imagem."
      );

    }

  }

  catch (err) {

    console.error(
      "Erro ao criar imagem:",
      err
    );

    setThinking(false);

    addMessage(
      "assistant",
      "🖼️ Erro ao criar imagem: " +
      (
        err.message ||
        "Não foi possível gerar a imagem."
      )
    );

  }

  finally {

    sendBtn.disabled = false;

  }

}


// ===============================
// MOSTRAR IMAGEM
// ===============================

function addImageMessage(
  image,
  prompt
) {

  const chat =
    currentChat();

  if (!chat) return;


  chat.messages.push({
    role: "assistant",
    content:
      `🖼️ Imagem criada para: ${prompt}`,
    image
  });


  saveChats();

  renderChatList();

  renderMessagesWithImages();

}


// ===============================
// RENDER COM IMAGENS
// ===============================

function renderMessagesWithImages() {

  const chat =
    currentChat();

  if (!chat) return;


  messagesEl.innerHTML =
    chat.messages.map(m => {

      const who =
        m.role === "user"
          ? "Você"
          : settings.assistantName;


      if (m.image) {

        return `
          <div class="message-row assistant">

            <div class="avatar">
              ✦
            </div>

            <div>

              <div class="message">
                ${escapeHtml(m.content)}

                <br><br>

                <img
                  src="data:image/png;base64,${m.image}"
                  alt="Imagem criada pelo Nexus AI"
                  style="
                    max-width:100%;
                    border-radius:16px;
                    display:block;
                  "
                />

              </div>

              <div class="message-meta">
                ${escapeHtml(who)}
              </div>

            </div>

          </div>
        `;

      }


      return `
        <div class="message-row ${m.role}">

          <div class="avatar">
            ${m.role === "user" ? "U" : "✦"}
          </div>

          <div>

            <div class="message">
              ${escapeHtml(m.content)}
            </div>

            <div class="message-meta">
              ${escapeHtml(who)}
            </div>

          </div>

        </div>
      `;

    }).join("");


  messagesEl.scrollTop =
    messagesEl.scrollHeight;
}


// ===============================
// CRIADOR DE VÍDEO
// ===============================

async function createVideo(prompt) {

  if (!prompt) {

    alert(
      "Digite uma descrição para criar o vídeo."
    );

    return;
  }


  addMessage(
    "user",
    "🎬 " + prompt
  );

  promptEl.value = "";

  autoResize();

  setThinking(true);

  sendBtn.disabled = true;


  try {

    const response =
      await fetch(
        "/.netlify/functions/video",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            prompt
          })

        }
      );


    const raw =
      await response.text();

    let data = {};


    if (raw.trim()) {

      try {

        data =
          JSON.parse(raw);

      }

      catch {

        throw new Error(
          `Resposta inválida do servidor (HTTP ${response.status}).`
        );

      }

    }


    if (!response.ok) {

      throw new Error(
        data.error ||
        `Erro HTTP ${response.status}`
      );

    }


    setThinking(false);


    if (data.video) {

      addVideoMessage(
        data.video,
        prompt
      );

    }

    else {

      throw new Error(
        "O gerador não retornou um vídeo."
      );

    }
async function createVideo(prompt) {
  try {
    addMessage(
      "assistant",
      "🎬 Iniciando geração do vídeo..."
    );

    const response = await fetch(
      "/.netlify/functions/video",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          prompt,

          duration: 5,

          ratio: "1280:768"
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Erro ao iniciar o vídeo."
      );
    }

    if (!data.taskId) {
      throw new Error(
        "O Runway não retornou o ID da tarefa."
      );
    }

    const taskId =
      data.taskId;

    addMessage(
      "assistant",
      "⏳ O vídeo está sendo criado pelo Runway..."
    );

    await waitForVideo(taskId);

  } catch (error) {
    console.error(
      "Erro createVideo:",
      error
    );

    addMessage(
      "assistant",
      "❌ Erro ao gerar vídeo: " +
        error.message
    );
  }
}

  }

  finally {

    sendBtn.disabled = false;

  }

}


// ===============================
// MOSTRAR VÍDEO
// ===============================

function addVideoMessage(
  video,
  prompt
) {

  const chat =
    currentChat();

  if (!chat) return;


  chat.messages.push({
    role: "assistant",
    content:
      `🎬 Vídeo criado para: ${prompt}`,
    video
  });


  saveChats();

  renderChatList();

  renderMessagesWithMedia();
}


// ===============================
// RENDER VÍDEOS
// ===============================

function renderMessagesWithMedia() {

  const chat =
    currentChat();

  if (!chat) return;


  messagesEl.innerHTML =
    chat.messages.map(m => {

      const who =
        m.role === "user"
          ? "Você"
          : settings.assistantName;


      if (m.video) {

        return `
          <div class="message-row assistant">

            <div class="avatar">
              ✦
            </div>

            <div>

              <div class="message">

                ${escapeHtml(m.content)}

                <br><br>

                <video
                  controls
                  playsinline
                  style="
                    max-width:100%;
                    border-radius:16px;
                    display:block;
                  "
                >
                  <source
                    src="${m.video}"
                    type="video/mp4"
                  />
                </video>

              </div>

              <div class="message-meta">
                ${escapeHtml(who)}
              </div>

            </div>

          </div>
        `;

      }


      if (m.image) {

        return `
          <div class="message-row assistant">

            <div class="avatar">
              ✦
            </div>

            <div>

              <div class="message">

                ${escapeHtml(m.content)}

                <br><br>

                <img
                  src="data:image/png;base64,${m.image}"
                  alt="Imagem criada"
                  style="
                    max-width:100%;
                    border-radius:16px;
                  "
                />

              </div>

              <div class="message-meta">
                ${escapeHtml(who)}
              </div>

            </div>

          </div>
        `;

      }


      return `
        <div class="message-row ${m.role}">

          <div class="avatar">
            ${m.role === "user" ? "U" : "✦"}
          </div>

          <div>

            <div class="message">
              ${escapeHtml(m.content)}
            </div>

            <div class="message-meta">
              ${escapeHtml(who)}
            </div>

          </div>

        </div>
      `;

    }).join("");


  messagesEl.scrollTop =
    messagesEl.scrollHeight;
}


// ===============================
// ANEXOS
// ===============================

function renderAttachments() {

  attachmentsEl.innerHTML =
    selectedFiles.map((f, i) => `

      <div class="attachment">

        ${escapeHtml(f.name)}

        <button
          data-i="${i}"
          type="button"
        >
          ×
        </button>

      </div>

    `).join("");


  attachmentsEl
    .querySelectorAll("button")
    .forEach(b => {

      b.onclick = () => {

        selectedFiles.splice(
          Number(b.dataset.i),
          1
        );

        renderAttachments();

      };

    });

}


// ===============================
// TAMANHO DO CAMPO
// ===============================

function autoResize() {

  promptEl.style.height =
    "auto";

  promptEl.style.height =
    Math.min(
      promptEl.scrollHeight,
      180
    ) + "px";
}


// ===============================
// VOZ
// ===============================

function speak(text) {

  if (
    !("speechSynthesis" in window)
  ) {
    return;
  }

  speechSynthesis.cancel();

  const u =
    new SpeechSynthesisUtterance(
      text
    );

  u.lang = "pt-BR";

  speechSynthesis.speak(u);
}


// ===============================
// MICROFONE
// ===============================

function startVoice() {

  const Recognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


  if (!Recognition) {

    alert(
      "Seu navegador não oferece reconhecimento de voz. Tente Chrome/Edge."
    );

    return;
  }


  const r =
    new Recognition();

  r.lang =
    "pt-BR";

  r.interimResults =
    false;


  $("#micBtn").textContent =
    "●";


  r.onresult = e => {

    promptEl.value +=
      (
        promptEl.value
          ? " "
          : ""
      ) +
      e.results[0][0]
        .transcript;

    autoResize();

  };


  r.onend = () =>
    $("#micBtn").textContent =
      "🎙";


  r.onerror = () =>
    $("#micBtn").textContent =
      "🎙";


  r.start();
}


// ===============================
// SUGESTÕES
// ===============================

function bindSuggestions() {

  document
    .querySelectorAll("[data-prompt]")
    .forEach(b => {

      b.onclick = () => {

        promptEl.value =
          b.dataset.prompt;

        autoResize();

        promptEl.focus();

      };

    });
}


// ===============================
// STATUS
// ===============================

async function checkHealth() {

  $("#status").textContent =
    "Pronto para conversar";

}


// ===============================
// EVENTOS
// ===============================

$("#newChat").onclick =
  newChat;


$("#attachBtn").onclick =
  () => fileInput.click();


fileInput.onchange = () => {

  selectedFiles = [
    ...selectedFiles,
    ...fileInput.files
  ].slice(0, 6);

  fileInput.value = "";

  renderAttachments();

};


sendBtn.onclick =
  send;


promptEl.oninput =
  autoResize;


promptEl.onkeydown = e => {

  if (
    e.key === "Enter" &&
    !e.shiftKey
  ) {

    e.preventDefault();

    send();

  }

};


$("#micBtn").onclick =
  startVoice;


$("#themeBtn").onclick = () => {

  document.body.classList.toggle(
    "light"
  );

  localStorage.setItem(
    "nexus_theme",
    document.body.classList.contains(
      "light"
    )
      ? "light"
      : "dark"
  );

};


$("#menuBtn").onclick = () => {

  $("#sidebar")
    .classList
    .toggle("open");

};


$("#settingsBtn").onclick = () => {

  $("#systemPrompt").value =
    settings.systemPrompt || "";

  $("#assistantName").value =
    settings.assistantName ||
    "Nexus AI";

  $("#settingsDialog")
    .showModal();

};


$("#saveSettings").onclick = () => {

  settings.systemPrompt =
    $("#systemPrompt")
      .value
      .trim();

  settings.assistantName =
    $("#assistantName")
      .value
      .trim() ||
    "Nexus AI";

  saveSettings();

  renderMessages();

};


$("#clearAllBtn").onclick = () => {

  if (
    confirm(
      "Apagar todas as conversas salvas neste navegador?"
    )
  ) {

    chats = [];

    activeChatId = null;

    saveChats();

    newChat();

  }

};


// ===============================
// INICIALIZAÇÃO
// ===============================

if (
  localStorage.getItem(
    "nexus_theme"
  ) === "light"
) {

  document.body.classList.add(
    "light"
  );

}


if (chats.length) {

  activeChatId =
    chats[0].id;

}

else {

  newChat();

}


renderChatList();

renderMessages();

bindSuggestions();

bindModes();

setMode("chat");

checkHealth();

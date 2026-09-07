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
let chats = JSON.parse(localStorage.getItem("nexus_chats") || "[]");
let settings = JSON.parse(localStorage.getItem("nexus_settings") || '{"assistantName":"Nexus AI","systemPrompt":""}');

function saveChats(){ localStorage.setItem("nexus_chats", JSON.stringify(chats)); }
function saveSettings(){ localStorage.setItem("nexus_settings", JSON.stringify(settings)); }

function newChat(){
  activeChatId = crypto.randomUUID();
  chats.unshift({id:activeChatId,title:"Nova conversa",messages:[],createdAt:Date.now()});
  saveChats(); renderChatList(); renderMessages();
}

function currentChat(){ return chats.find(c => c.id === activeChatId); }

function renderChatList(){
  $("#chatList").innerHTML = chats.map(c => `
    <button class="chat-item ${c.id===activeChatId?'active':''}" data-id="${c.id}">
      ${escapeHtml(c.title)}
    </button>`).join("");
  document.querySelectorAll(".chat-item").forEach(btn=>{
    btn.onclick=()=>{activeChatId=btn.dataset.id;renderChatList();renderMessages();$("#sidebar").classList.remove("open")};
  });
}

function escapeHtml(s=""){
  return s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function renderMessages(){
  const chat=currentChat();
  if(!chat || chat.messages.length===0){
    messagesEl.innerHTML = `
      <div class="welcome" id="welcome">
        <div class="orb">✦</div>
        <h1>Como posso ajudar?</h1>
        <p>Converse, envie imagens e documentos, use sua voz ou ative a busca na web.</p>
        <div class="suggestions">
          <button data-prompt="Crie um plano de negócios simples para minha ideia.">Plano de negócios</button>
          <button data-prompt="Explique este assunto de forma simples e com exemplos.">Explicar um assunto</button>
          <button data-prompt="Crie um site moderno em HTML, CSS e JavaScript.">Criar um site</button>
          <button data-prompt="Analise o arquivo que vou enviar e faça um resumo.">Analisar arquivo</button>
        </div>
      </div>`;
    bindSuggestions();
    return;
  }
  messagesEl.innerHTML = chat.messages.map(m=>messageHTML(m)).join("");
  messagesEl.scrollTop=messagesEl.scrollHeight;
}

function messageHTML(m){
  const who=m.role==="user"?"Você":settings.assistantName;
  return `
  <div class="message-row ${m.role}">
    <div class="avatar">${m.role==="user"?"U":"✦"}</div>
    <div>
      <div class="message">${escapeHtml(m.content)}</div>
      <div class="message-meta">${who}</div>
    </div>
  </div>`;
}

function addMessage(role, content){
  const chat=currentChat();
  chat.messages.push({role,content});
  if(role==="user" && chat.messages.filter(x=>x.role==="user").length===1){
    chat.title=content.slice(0,42) || "Arquivo enviado";
  }
  saveChats(); renderChatList(); renderMessages();
}

function setThinking(on){
  $("#thinking")?.remove();
  if(on){
    messagesEl.insertAdjacentHTML("beforeend",`
      <div class="message-row assistant" id="thinking">
        <div class="avatar">✦</div><div><div class="message thinking">Pensando...</div></div>
      </div>`);
    messagesEl.scrollTop=messagesEl.scrollHeight;
  }
}

async function send(){
  const message=promptEl.value.trim();
  if(!message && selectedFiles.length===0)return;
  if(!activeChatId)newChat();

  const chat=currentChat();
  const history=chat.messages.slice(-20);
  addMessage("user", message || `Enviei ${selectedFiles.length} arquivo(s) para análise.`);
  promptEl.value=""; autoResize(); setThinking(true); sendBtn.disabled=true;

  const fd=new FormData();
  fd.append("message",message);
  fd.append("history",JSON.stringify(history));
  fd.append("webSearch",String(webSearchEl.checked));
  fd.append("systemPrompt",settings.systemPrompt || "");
  selectedFiles.forEach(f=>fd.append("files",f));

  try{
    const r=await fetch("/.netlify/functions/chat",{method:"POST",body:fd});
    const data=await r.json();
    if(!r.ok) throw new Error(data.error||"Erro na requisição");
    setThinking(false);
    addMessage("assistant",data.text);
    if(autoSpeakEl.checked)speak(data.text);
  }catch(err){
    setThinking(false);
    addMessage("assistant","Erro: "+err.message);
  }finally{
    selectedFiles=[];renderAttachments();sendBtn.disabled=false;
  }
}

function renderAttachments(){
  attachmentsEl.innerHTML=selectedFiles.map((f,i)=>`
    <div class="attachment">${escapeHtml(f.name)} <button data-i="${i}">×</button></div>`).join("");
  attachmentsEl.querySelectorAll("button").forEach(b=>b.onclick=()=>{
    selectedFiles.splice(Number(b.dataset.i),1);renderAttachments();
  });
}

function autoResize(){
  promptEl.style.height="auto";
  promptEl.style.height=Math.min(promptEl.scrollHeight,180)+"px";
}

function speak(text){
  if(!("speechSynthesis" in window))return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="pt-BR";
  speechSynthesis.speak(u);
}

function startVoice(){
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){alert("Seu navegador não oferece reconhecimento de voz. Tente Chrome/Edge.");return}
  const r=new Recognition();
  r.lang="pt-BR";r.interimResults=false;
  $("#micBtn").textContent="●";
  r.onresult=e=>{promptEl.value+=(promptEl.value?" ":"")+e.results[0][0].transcript;autoResize()};
  r.onend=()=>$("#micBtn").textContent="🎙";
  r.onerror=()=>$("#micBtn").textContent="🎙";
  r.start();
}

function bindSuggestions(){
  document.querySelectorAll("[data-prompt]").forEach(b=>b.onclick=()=>{
    promptEl.value=b.dataset.prompt;autoResize();promptEl.focus();
  });
}

async function checkHealth(){
  $("#status").textContent="Pronto para conversar";
}

$("#newChat").onclick=newChat;
$("#attachBtn").onclick=()=>fileInput.click();
fileInput.onchange=()=>{selectedFiles=[...selectedFiles,...fileInput.files].slice(0,6);fileInput.value="";renderAttachments()};
sendBtn.onclick=send;
promptEl.oninput=autoResize;
promptEl.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}};
$("#micBtn").onclick=startVoice;
$("#themeBtn").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("nexus_theme",document.body.classList.contains("light")?"light":"dark")};
$("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
$("#settingsBtn").onclick=()=>{
  $("#systemPrompt").value=settings.systemPrompt||"";
  $("#assistantName").value=settings.assistantName||"Nexus AI";
  $("#settingsDialog").showModal();
};
$("#saveSettings").onclick=()=>{
  settings.systemPrompt=$("#systemPrompt").value.trim();
  settings.assistantName=$("#assistantName").value.trim()||"Nexus AI";
  saveSettings();renderMessages();
};
$("#clearAllBtn").onclick=()=>{
  if(confirm("Apagar todas as conversas salvas neste navegador?")){
    chats=[];activeChatId=null;saveChats();newChat();
  }
};

if(localStorage.getItem("nexus_theme")==="light")document.body.classList.add("light");
if(chats.length)activeChatId=chats[0].id;else newChat();
renderChatList();renderMessages();bindSuggestions();checkHealth();

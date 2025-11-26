const socket = io();

let lobbyId;
let questions = [];
let players = [];
let qIndex = 0;
let myPseudo = "";
let timerInterval = null;
let timeLeft = 30;

function createLobby(){
    myPseudo = document.getElementById("pseudo").value;
    if(!myPseudo) return alert("Pseudo obligatoire !");
    socket.emit("createLobby", myPseudo);
}

socket.on("lobbyCreated", (id,q)=>{
    lobbyId = id;
    questions = q;
    document.getElementById("login").classList.add("hidden");
    document.getElementById("lobby").classList.remove("hidden");
    document.getElementById("lobbyCode").textContent = id;
    document.getElementById("playersList").textContent = myPseudo;
});

function joinLobby(){
    myPseudo = document.getElementById("pseudo").value;
    const code = document.getElementById("joinCode").value;
    if(!myPseudo || !code) return alert("Pseudo et code obligatoires !");
    socket.emit("joinLobby",{lobbyId:code,pseudo:myPseudo});
}

socket.on("playerJoined",(list)=>{
    document.getElementById("playersList").textContent = list.join(", ");
});

socket.on("errorMsg", (msg) => {
    alert(msg);
});

socket.on("joinedLobby", (data) => {
    lobbyId = data.lobbyId;
    questions = data.questions;
    document.getElementById("login").classList.add("hidden");
    document.getElementById("lobby").classList.remove("hidden");
    document.getElementById("lobbyCode").textContent = data.lobbyId;
    document.getElementById("playersList").textContent = data.players.join(", ");
});

function startQuiz(){
    socket.emit("startQuiz", lobbyId);
}

socket.on("startQuiz",(q)=>{
    questions = q;
    document.getElementById("lobby").classList.add("hidden");
    document.getElementById("quiz").classList.remove("hidden");
    showQuestion();
});

function showQuestion(){
    if(timerInterval) clearInterval(timerInterval);
    
    if(qIndex>=questions.length){
        socket.emit("startCorrection", lobbyId);
        document.getElementById("quiz").classList.add("hidden");
        return;
    }
    const q = questions[qIndex];
    document.getElementById("question").textContent = q.q;
    const media = document.getElementById("media");
    media.innerHTML = "";
    if(q.type==="image") media.innerHTML = `<img src="${q.src}" style="max-width:100%">`;
    else if(q.type==="video") media.innerHTML = `<iframe src="${q.src}" width="100%" height="315"></iframe>`;
    else if(q.type==="audio") media.innerHTML = `<audio controls autoplay><source src="${q.src}"></audio>`;
    
    timeLeft = 30;
    document.getElementById("timer").textContent = timeLeft + "s";
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById("timer").textContent = timeLeft + "s";
        if(timeLeft <= 0) {
            clearInterval(timerInterval);
            submitAnswer();
        }
    }, 1000);
}

function submitAnswer(){
    if(timerInterval) clearInterval(timerInterval);
    const ans = document.getElementById("answer").value.trim().toLowerCase();
    socket.emit("submitAnswer",{lobbyId,qIndex,answer:ans});
    qIndex++;
    document.getElementById("answer").value = "";
    showQuestion();
}

/* CORRECTION */
socket.on("correctionStep",(data)=>{
    questions = data.questions;
    players = data.players;
    qIndex = 0;
    startCorrection();
});

let corrQ = 0;
let corrP = 0;
function startCorrection(){
    if(corrQ>=questions.length){
        document.getElementById("correction").classList.add("hidden");
        showWinner();
        return;
    }
    const q = questions[corrQ];
    const p = players[corrP];

    document.getElementById("correction").classList.remove("hidden");
    document.getElementById("corrQuestion").textContent = q.q;
    document.getElementById("corrAnswer").textContent = q.a;
    document.getElementById("corrPlayer").textContent = p.pseudo;
    document.getElementById("playerAnswer").textContent = p.answers[corrQ] || "(aucune réponse)";
}

function mark(isCorrect){
    if(isCorrect) players[corrP].score++;
    corrP++;
    if(corrP>=players.length){
        corrP=0;
        corrQ++;
    }
    startCorrection();
}

function showWinner(){
    const winner = players.reduce((a,b)=>a.score>b.score?a:b);
    document.getElementById("winner").textContent = `Gagnant : ${winner.pseudo} (${winner.score})`;
    document.getElementById("result").classList.remove("hidden");
}

function restart(){
    location.reload();
}

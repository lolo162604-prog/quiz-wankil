const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = 5000;

app.use(express.static(__dirname));

// Banques de questions
const questionBank = [
    { q: "Quel est la date d'activité de la chaîne youtube Wankil ?", a: "15 octobre 2008", type:"text" },
    { q: "Quel est la date d'activité de la chaîne youtube Wankil-VOD ?", a: "17 juin 2006", type:"text" },
    { q: "Quel est la date d'anniversaire de Laink ?", a: "8 janvier 1992", type:"text" },
    { q: "Quel est la date d'anniversaire de Terracid ?", a:"7 août 1992", type:"text" },
    { q: "Quel est ce Wankul ?", a:"soldat WWII Laink", type:"image", src:"https://w7.pngwing.com/pngs/107/109/png-transparent-wankil-studio-laink-et-terracid-graphy-library-wankul-face-hat-photography.png" },
    { q: "Quel est la date d'activité de la chaîne youtube Wankil ?", a: "15 octobre 2008", type:"text" },
    { q: "Quel est la date d'activité de la chaîne youtube Wankil ?", a: "15 octobre 2008", type:"text" },
    { q: "Quel est la date d'activité de la chaîne youtube Wankil ?", a: "15 octobre 2008", type:"text" },
    { q: "Quel est la date d'activité de la chaîne youtube Wankil ?", a: "15 octobre 2008", type:"text" },
    { q: "Quel est la date d'activité de la chaîne youtube Wankil ?", a: "15 octobre 2008", type:"text" },
];

// Parties en mémoire
let lobbies = {};

io.on("connection", socket => {
    console.log("Un joueur s'est connecté:", socket.id);

    // Créer une partie
    socket.on("createLobby", (pseudo) => {
        const lobbyId = Math.floor(10000 + Math.random()*90000).toString();
        const questions = questionBank.sort(() => 0.5 - Math.random()).slice(0,20);
        lobbies[lobbyId] = {
            host: socket.id,
            players: [{id: socket.id, pseudo, answers: [], score:0}],
            questions,
            status:"waiting"
        };
        socket.join(lobbyId);
        const questionsWithoutAnswers = questions.map(q => ({ q: q.q, type: q.type, src: q.src }));
        socket.emit("lobbyCreated", lobbyId, questionsWithoutAnswers);
        console.log(`Lobby ${lobbyId} créé par ${pseudo}`);
    });

    // Rejoindre une partie
    socket.on("joinLobby", (data) => {
        const { lobbyId, pseudo } = data;
        const lobby = lobbies[lobbyId];
        if(!lobby) {
            socket.emit("errorMsg","Lobby introuvable !");
            return;
        }
        if(lobby.players.length>=3){
            socket.emit("errorMsg","Lobby plein !");
            return;
        }
        lobby.players.push({id: socket.id, pseudo, answers:[], score:0});
        socket.join(lobbyId);
        const questionsWithoutAnswers = lobby.questions.map(q => ({ q: q.q, type: q.type, src: q.src }));
        socket.emit("joinedLobby", { lobbyId, questions: questionsWithoutAnswers, players: lobby.players.map(p=>p.pseudo) });
        io.to(lobbyId).emit("playerJoined", lobby.players.map(p=>p.pseudo));
    });

    // Début du quiz
    socket.on("startQuiz", (lobbyId)=>{
        const lobby = lobbies[lobbyId];
        if(!lobby) return;
        lobby.status="playing";
        const questionsWithoutAnswers = lobby.questions.map(q => ({ q: q.q, type: q.type, src: q.src }));
        io.to(lobbyId).emit("startQuiz", questionsWithoutAnswers);
    });

    // Réception réponse
    socket.on("submitAnswer", (data)=>{
        const { lobbyId, qIndex, answer } = data;
        const lobby = lobbies[lobbyId];
        if(!lobby) return;
        const player = lobby.players.find(p=>p.id===socket.id);
        if(player){
            player.answers[qIndex] = answer;
        }
    });

    // Demander correction
    socket.on("startCorrection", (lobbyId)=>{
        const lobby = lobbies[lobbyId];
        if(!lobby) return;
        io.to(lobbyId).emit("correctionStep", {questions:lobby.questions, players:lobby.players});
    });

    // Fin de la partie
    socket.on("endGame", (lobbyId)=>{
        delete lobbies[lobbyId];
    });

    socket.on("disconnect", ()=>{
        console.log("Joueur déconnecté:", socket.id);
        // Supprimer des lobbies si nécessaire
        for(const lId in lobbies){
            lobbies[lId].players = lobbies[lId].players.filter(p=>p.id!==socket.id);
            if(lobbies[lId].players.length===0){
                delete lobbies[lId];
            }
        }
    });
});

http.listen(PORT, "0.0.0.0", ()=>console.log("Serveur lancé sur port",PORT));

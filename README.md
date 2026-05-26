# Pacman VR FPS - Roadmap & To-Do

## Concept e Panoramica

Il gioco è uno sparatutto in prima persona (FPS) a tema dark-horror basato su Pacman. È sviluppato in VR utilizzando WebXR e Three.js, mantenendo però la retrocompatibilità con i controlli "flat" tradizionali (tramite WASD e mouse).

---

## 📋 Stato di Sviluppo (To-Do List)

### 🚀 Core & Inizio Partita

- [x] Setup dell'ambiente VR (WebXR) e della camera rig.
- [x] Controlli Flat PC (PointerLock, WASD + mouse).
- [x] Mappe Procedurali: Generazione del livello stile labirinto con algoritmo Recursive Backtracking.

### 🔫 Arsenale & Gameplay

- [x] **Arma Base (Pistola):** Rateo di fuoco lento, munizioni infinite.
- [x] **Armi Speciali (Fucili):** Generati proceduralmente sulla mappa. Sparano in automatico, hanno un solo caricatore, dopodiché si torna alla pistola.
- [x] Gestione dello shooting (Raycasting) funzionante sia da controller VR che da cursore (Flat).
- [x] Raccolta monete: Generazione sulla mappa e logica di raccolta alla vicinanza.

### 👻 Intelligenza Artificiale (I Fantasmi)

- [x] **Pathfinding A*:** Navigazione della mappa calcolata dinamicamente.
- [x] **Stato Normale (Pattugliamento):** Camminata casuale con cono di vista bianco e audio di base.
- [x] **Stato di Allerta (Indagine):** Il fantasma sente un rumore (es. raccolta moneta o spari), l'espressione diventa "curiosa" e la luce gialla. Va verso l'origine del rumore.
- [x] **Stato di Caccia:** Se il fantasma vede il giocatore, la luce diventa rossa, l'espressione "cattiva" e parte l'inseguimento.
- [x] **Stato Sconfitto (Stun):** Se colpito, diventa inoffensivo/blu e corre verso il centro del labirinto per rigenerarsi.

### 🎵 Meccaniche Sonore (Stealth)

- [x] Spazializzazione audio 3D (AudioListener su camera).
- [x] **Rumore Basso:** Raccogliere monete allerta solo i fantasmi vicini.
- [x] **Rumore Alto:** Sparare o raccogliere armi allerta i fantasmi su scala più ampia.
- [x] Musiche dinamiche (passaggio da tema di esplorazione a tema di inseguimento).

### 🎨 Grafica & Ottimizzazione

- [x] Stile visivo low-poly cel-shaded con colori uniformi.
- [x] Sistema di illuminazione custom (ShaderMaterial): zero luci dinamiche native per garantire i 90+ fps in VR.
- [x] Projective texturing: le luci dei fantasmi (Cono visivo) e delle armi calcolano dinamicamente gli ostacoli in un custom Fragment Shader per simulare le ombre.

### 🖥️ Interfaccia ed End-Game (Work In Progress)

- [ ] **DA FARE - UI / HUD (User Interface):** Aggiungere a schermo (o attaccato al polso in VR) il conteggio delle monete rimanenti e delle munizioni dell'arma speciale.
- [x] **VITTORIA:** Implementato il trigger di vittoria e la gestione della musica/stato quando tutte le monete vengono raccolte.
- [x] **GAME OVER:** Implementata la collisione letale con i fantasmi e la gestione della musica/stato di sconfitta.

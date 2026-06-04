import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { generateMaze } from './maze.js';
import { Ghost } from './Ghost.js';
import { CONFIG, CURRENT_SETTINGS, updateOffset, resetStats, OFFSET } from './config.js';
import { Environment } from './Environment.js';
import { CoinManager } from './CoinManager.js';
import { Player } from './Player.js';
import { Weapon } from './Weapon.js';
import { WeaponManager } from './WeaponManager.js';
import { AudioManager } from './AudioManager.js';
import { GameManager } from './GameManager.js';
import { DustManager } from './DustManager.js';

// --- VARIABILI GLOBALI E STATO DEL GIOCO ---
let scene, camera, renderer, playerRig, audioManager, clock;
let levelMap, environment, player, weapon, ghosts = [];
let coinManager, weaponManager, gameManager, dustManager;

// --- RIFERIMENTI UI (HTML) ---
const uiLayer = document.getElementById('ui-layer');
const mainPanel = document.getElementById('main-panel');
const btnStart = document.getElementById('btn-start');

// Avviamo il setup di base
initBase();
initUI();

function initBase() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.COLORS.BG); 

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    playerRig = new THREE.Group();
    scene.add(playerRig);
    playerRig.add(camera);

    audioManager = new AudioManager(camera);
    clock = new THREE.Clock();

    renderer.setAnimationLoop(animate);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Estraiamo la logica di lettura e avvio in una funzione indipendente
function applySettingsAndStart() {
    // 1. Leggi i valori dall'HTML e aggiorna i settaggi correnti
    CURRENT_SETTINGS.mapSize = parseInt(document.getElementById('set-mapSize').value);
    CURRENT_SETTINGS.ghostCount = parseInt(document.getElementById('set-ghostCount').value);
    CURRENT_SETTINGS.weaponCount = parseInt(document.getElementById('set-weaponCount').value);
    CURRENT_SETTINGS.leftHanded = document.getElementById('set-leftHanded').checked;

    // Assicuriamoci che la mappa sia sempre dispari
    if (CURRENT_SETTINGS.mapSize % 2 === 0) CURRENT_SETTINGS.mapSize += 1;

    // 2. Costruisci il livello di gioco
    buildGameScene();

    // 3. Nascondi l'interfaccia HTML
    uiLayer.style.display = 'none';
}

function initUI() {
    // A. Avvio per PC Flat (Clic su "Gioca")
    btnStart.addEventListener('click', () => {
        applySettingsAndStart();
        if (!renderer.xr.isPresenting && player && player.input) {
            player.input.controls.lock();
        }
    });

    // B. Avvio per VR (Clic sul pulsante "ENTER VR" di Three.js)
    renderer.xr.addEventListener('sessionstart', () => {
        // Se entriamo in VR ma il gioco non è ancora partito (siamo nel menu principale)
        if (!gameManager || gameManager.isGameOver) {
            applySettingsAndStart();
        }
    });
}

function cleanUpScene() {
    // Se esiste un vecchio player, distruggiamo il suo riferimento all'arma
    if (player) {
        player.weapon = null;
    }

    // Rimuoviamo forzatamente il modello dell'arma precedente ovunque si trovi
    if (weapon && weapon.mesh && weapon.mesh.parent) {
        weapon.mesh.parent.remove(weapon.mesh);
    }

    // Svuotiamo brutalmente la scena per evitare memory leak tra una partita e l'altra
    scene.clear();
    scene.background = new THREE.Color(CONFIG.COLORS.BG);
    scene.add(playerRig);
    
    // Rimuoviamo eventuali elementi o pannelli di game over attaccati alla telecamera
    // (Facendo attenzione a NON rimuovere l'AudioListener)
    for (let i = camera.children.length - 1; i >= 0; i--) {
        const child = camera.children[i];
        if (!(child instanceof THREE.AudioListener)) {
            camera.remove(child);
        }
    }

    ghosts = [];
    resetStats();
}

function buildGameScene() {
    cleanUpScene();
    updateOffset();

    // --- GENERAZIONE AMBIENTE ---
    levelMap = generateMaze(CURRENT_SETTINGS.mapSize, CURRENT_SETTINGS.mapSize);
    environment = new Environment(scene, levelMap);

    // -- PARTICELLARE --
    if (dustManager) dustManager.dispose();
    dustManager = new DustManager(scene, CURRENT_SETTINGS.mapSize);

    // --- INIZIALIZZAZIONE PLAYER E ARMI ---
    player = new Player(camera, playerRig, renderer, levelMap, scene);
    weapon = new Weapon(camera, audioManager); 
    player.weapon = weapon;

    // Posizionamento casuale del Player in una cella vuota
    const emptyCells = [];
    for (let z = 0; z < levelMap.length; z++) {
        for (let x = 0; x < levelMap[z].length; x++) {
            if (levelMap[z][x] === 0) emptyCells.push({ x: x, z: z });
        }
    }

    if (emptyCells.length > 0) {
        const randomSpawn = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        playerRig.position.set(
            (randomSpawn.x + OFFSET.X) * CONFIG.CELL_SIZE, 0, (randomSpawn.z + OFFSET.Z) * CONFIG.CELL_SIZE
        );
        camera.position.set(0, 1.6, 0);
        playerRig.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2);
    }

    playerRig.updateMatrixWorld(true);
    const playerWorldPos = new THREE.Vector3();
    camera.getWorldPosition(playerWorldPos);

    // --- SPAWN FANTASMI (Usando il parametro dinamico ghostCount) ---
    for (let z = 0; z < levelMap.length; z++) {
        for (let x = 0; x < levelMap[z].length; x++) {
            if (levelMap[z][x] === 2 && ghosts.length < CURRENT_SETTINGS.ghostCount) {
                const worldX = (x + OFFSET.X) * CONFIG.CELL_SIZE;
                const worldZ = (z + OFFSET.Z) * CONFIG.CELL_SIZE;
                ghosts.push(new Ghost(scene, worldX, worldZ, CONFIG.CELL_SIZE, OFFSET.X, OFFSET.Z, levelMap, audioManager));
            }
        }
    }

    // --- INIZIALIZZAZIONE MANAGER ---
    coinManager = new CoinManager(scene, levelMap, audioManager, ghosts, playerWorldPos);
    weaponManager = new WeaponManager(scene, levelMap, audioManager, ghosts, weapon);
    gameManager = new GameManager(audioManager, ghosts, clock, camera, renderer);

    // Avviamo forzatamente il game loop logico
    gameManager.startGame();
}

// --- GAME LOOP VISIVO ---
function animate() {
    const delta = clock.getDelta();

    // Aggiorniamo la logica solo se il gioco è attivo e generato
    if (gameManager && gameManager.gameStarted && !gameManager.isGameOver) {
        player.update(delta, ghosts);
        
        const playerWorldPos = new THREE.Vector3();
        camera.getWorldPosition(playerWorldPos);

        coinManager.update(delta, playerWorldPos);
        weaponManager.update(delta, playerWorldPos);

        for (let i = 0; i < ghosts.length; i++) {
            ghosts[i].update(delta, playerWorldPos);
        }

        gameManager.update(playerWorldPos);

        // --- GESTIONE DELLA TORCIA E AGGIORNAMENTO LUCI ---
        let flashlightPos = null;
        let flashlightDir = null;

        if (weapon && weapon.mesh) {
            flashlightPos = new THREE.Vector3();
            flashlightDir = new THREE.Vector3(0, 0, -1);
            
            // Otteniamo la posizione globale e la direzione dell'arma
            weapon.mesh.getWorldPosition(flashlightPos);
            flashlightDir.transformDirection(weapon.mesh.matrixWorld).normalize();
            
            // Spostiamo la luce leggermente in avanti
            flashlightPos.addScaledVector(flashlightDir, 0.3);

            if (dustManager) {
                dustManager.update(clock.getElapsedTime(), flashlightPos, flashlightDir);
            }
        }

        // Deleghiamo tutti i calcoli grafici pesanti e l'aggiornamento degli shader all'ambiente
        environment.updateLighting(
            playerWorldPos, 
            flashlightPos, 
            flashlightDir, 
            ghosts, 
            weaponManager.pickups
        );
    } // <-- Fine dell'if (gameManager && gameManager.gameStarted && !gameManager.isGameOver)

    renderer.render(scene, camera);
}
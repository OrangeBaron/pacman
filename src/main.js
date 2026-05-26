import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { generateMaze } from './maze.js';
import { Ghost } from './Ghost.js';
import { CONFIG, OFFSET, STATS } from './config.js';
import { Environment } from './Environment.js';
import { CoinManager } from './CoinManager.js';
import { Player } from './Player.js';
import { Weapon } from './Weapon.js';
import { WeaponManager } from './WeaponManager.js';

// --- SETUP BASE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.COLORS.BG); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// --- SETUP CAMERA RIG PER VR ---
const playerRig = new THREE.Group();
scene.add(playerRig);
playerRig.add(camera);

// --- SETUP AUDIO GLOBALE ---
const audioListener = new THREE.AudioListener();
camera.add(audioListener);
const audioLoader = new THREE.AudioLoader();

const explorationMusic = new THREE.Audio(audioListener);
audioLoader.load('./assets/exploration.mp3', (buffer) => {
    explorationMusic.setBuffer(buffer);
    explorationMusic.setLoop(true);
    explorationMusic.setVolume(0.1);
});

const chaseMusic = new THREE.Audio(audioListener);
audioLoader.load('./assets/chase.mp3', (buffer) => {
    chaseMusic.setBuffer(buffer);
    chaseMusic.setLoop(true);
    chaseMusic.setVolume(0.1);
});

const winMusic = new THREE.Audio(audioListener);
audioLoader.load('./assets/win.mp3', (buffer) => {
    winMusic.setBuffer(buffer);
    winMusic.setLoop(false);
    winMusic.setVolume(0.4);
});

const loseMusic = new THREE.Audio(audioListener);
audioLoader.load('./assets/lose.mp3', (buffer) => {
    loseMusic.setBuffer(buffer);
    loseMusic.setLoop(false);
    loseMusic.setVolume(0.4);
});

// --- GENERAZIONE MONDO ---
const levelMap = generateMaze(CONFIG.MAP_SIZE, CONFIG.MAP_SIZE);
const environment = new Environment(scene, levelMap);

// --- SPAWN GIOCATORE ---
const player = new Player(camera, playerRig, renderer, levelMap, scene);
const weapon = new Weapon(camera, audioListener); 
player.weapon = weapon;

const emptyCells = [];
for (let z = 0; z < levelMap.length; z++) {
    for (let x = 0; x < levelMap[z].length; x++) {
        if (levelMap[z][x] === 0) {
            emptyCells.push({ x: x, z: z });
        }
    }
}

if (emptyCells.length > 0) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const randomSpawn = emptyCells[randomIndex];
    
    playerRig.position.set(
        (randomSpawn.x + OFFSET.X) * CONFIG.CELL_SIZE, 
        0, 
        (randomSpawn.z + OFFSET.Z) * CONFIG.CELL_SIZE
    );
    camera.position.set(0, 1.6, 0);
    
    const randomRotation = Math.floor(Math.random() * 4) * (Math.PI / 2);
    playerRig.rotation.y = randomRotation;
}

playerRig.updateMatrixWorld(true);
const playerWorldPos = new THREE.Vector3();
camera.getWorldPosition(playerWorldPos);

// --- SPAWN FANTASMI ---
const ghosts = [];
for (let z = 0; z < levelMap.length; z++) {
    for (let x = 0; x < levelMap[z].length; x++) {
        if (levelMap[z][x] === 2 && ghosts.length < 4) {
            const worldX = (x + OFFSET.X) * CONFIG.CELL_SIZE;
            const worldZ = (z + OFFSET.Z) * CONFIG.CELL_SIZE;
            ghosts.push(new Ghost(scene, worldX, worldZ, CONFIG.CELL_SIZE, OFFSET.X, OFFSET.Z, levelMap, audioListener));
        }
    }
}

// --- INIZIALIZZAZIONE MANAGER ---
const coinManager = new CoinManager(scene, levelMap, audioListener, ghosts, playerWorldPos);
const weaponManager = new WeaponManager(scene, levelMap, audioListener, ghosts, weapon);

// --- GESTIONE AVVIO PARTITA ---
let gameStarted = false;
let isGameOver = false;
const clock = new THREE.Clock();

// Funzione richiamata per la Vittoria
function triggerWin() {
    if (isGameOver) return;
    isGameOver = true;
    
    if (explorationMusic.isPlaying) explorationMusic.pause();
    if (chaseMusic.isPlaying) chaseMusic.pause();
    ghosts.forEach(ghost => ghost.stopAllAudio());
    
    if (winMusic.buffer && !winMusic.isPlaying) winMusic.play();
    
    console.log("VITTORIA! Tutte le monete raccolte!");
    showEndGameBoard(true); 
}

// Funzione richiamata per la Sconfitta
function triggerGameOver() {
    if (isGameOver) return;
    isGameOver = true;
    
    if (explorationMusic.isPlaying) explorationMusic.pause();
    if (chaseMusic.isPlaying) chaseMusic.pause();
    ghosts.forEach(ghost => ghost.stopAllAudio());
    
    if (loseMusic.buffer && !loseMusic.isPlaying) loseMusic.play();
    
    console.log("SCONFITTA! Preso da un fantasma!");
    showEndGameBoard(false); 
}

// Placeholder per la Fase 3
function showEndGameBoard(isVictory) {
    console.log(`--- STATISTICHE PARTITA ---`);
    console.log(`Esito: ${isVictory ? "VITTORIA" : "GAME OVER"}`);
    console.log(`Monete: ${STATS.coinsCollected} / ${STATS.totalCoins}`);
    console.log(`Volte scoperto: ${STATS.timesDiscovered}`);
    console.log(`Fantasmi storditi: ${STATS.ghostsDefeated}`);
    
    const accuracy = STATS.shotsFired > 0 
        ? Math.round((STATS.shotsHit / STATS.shotsFired) * 100) 
        : 0;
    console.log(`Proiettili sparati: ${STATS.shotsFired} (Precisione: ${accuracy}%)`);
}

function startGame() {
    if (gameStarted) return;
    gameStarted = true;
    
    if (audioListener.context.state === 'suspended') {
        audioListener.context.resume();
    }
    
    if (explorationMusic.buffer && !explorationMusic.isPlaying) {
        explorationMusic.play();
    }
    
    ghosts.forEach(ghost => ghost.onGameStart());
    
    clock.start(); 
}

player.controls.addEventListener('lock', startGame);

renderer.xr.addEventListener('sessionstart', startGame);


// --- GAME LOOP ---
function animate() {
    const delta = clock.getDelta();

    if (gameStarted && !isGameOver) {
        player.update(delta, ghosts);
        camera.getWorldPosition(playerWorldPos);

        coinManager.update(delta, playerWorldPos);
        weaponManager.update(delta, playerWorldPos);

        // --- CONTROLLO VITTORIA ---
        if (STATS.totalCoins > 0 && STATS.coinsCollected >= STATS.totalCoins) {
            triggerWin();
        }

        let isAnyGhostHunting = false;

        for (let i = 0; i < ghosts.length; i++) {
            ghosts[i].update(delta, playerWorldPos);
            
            // --- CONTROLLO SCONFITTA ---
            if (ghosts[i].state !== 'STUNNED') {
                const dist = Math.hypot(
                    playerWorldPos.x - ghosts[i].mesh.position.x,
                    playerWorldPos.z - ghosts[i].mesh.position.z
                );
                
                if (dist < 1.0) {
                    triggerGameOver();
                }
            }

            if (ghosts[i].state === 'HUNT') isAnyGhostHunting = true;
        }

        if (!isGameOver) {
            if (isAnyGhostHunting) {
                if (explorationMusic.isPlaying) explorationMusic.pause();
                if (chaseMusic.buffer && !chaseMusic.isPlaying) chaseMusic.play();
            } else {
                if (chaseMusic.isPlaying) chaseMusic.pause();
                if (explorationMusic.buffer && !explorationMusic.isPlaying) explorationMusic.play();
            }
        }
    }

    environment.shaderUniforms.u_playerPosition.value.copy(playerWorldPos);

    for (let i = 0; i < 4; i++) {
        if (i < weaponManager.pickups.length) {
            environment.shaderUniforms.u_weaponPositions.value[i].copy(weaponManager.pickups[i].position);
        } else {
            environment.shaderUniforms.u_weaponPositions.value[i].set(0, -100, 0); 
        }
    }

    for (let i = 0; i < ghosts.length; i++) {
        environment.shaderUniforms.u_ghostPositions.value[i].copy(ghosts[i].mesh.position);
        environment.shaderUniforms.u_ghostPositions.value[i].y += 0.2; 
        environment.shaderUniforms.u_ghostDirections.value[i].copy(ghosts[i].getFacingDirection());
        environment.shaderUniforms.u_ghostColors.value[i].copy(ghosts[i].lightColor);
    }

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
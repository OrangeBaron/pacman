import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { generateMaze } from './maze.js';
import { Ghost } from './Ghost.js';
import { CONFIG, OFFSET } from './config.js';
import { Environment } from './Environment.js';
import { CoinManager } from './CoinManager.js';
import { Player } from './Player.js';
import { Weapon } from './Weapon.js';

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
audioLoader.load('../assets/exploration.mp3', (buffer) => {
    explorationMusic.setBuffer(buffer);
    explorationMusic.setLoop(true);
    explorationMusic.setVolume(0.1);
    explorationMusic.play(); 
});

const chaseMusic = new THREE.Audio(audioListener);
audioLoader.load('../assets/chase.mp3', (buffer) => {
    chaseMusic.setBuffer(buffer);
    chaseMusic.setLoop(true);
    chaseMusic.setVolume(0.1);
});

// --- GENERAZIONE MONDO ---
const levelMap = generateMaze(CONFIG.MAP_SIZE, CONFIG.MAP_SIZE);
const environment = new Environment(scene, levelMap);

// --- SPAWN GIOCATORE ---
const player = new Player(camera, playerRig, renderer, levelMap, scene);
const weapon = new Weapon(camera, audioListener); 
player.weapon = weapon;

let spawned = false;
for (let z = levelMap.length - 2; z > 0; z--) {
    for (let x = 1; x < levelMap[z].length; x++) {
        if (levelMap[z][x] === 0 && !spawned) {
            playerRig.position.set((x + OFFSET.X) * CONFIG.CELL_SIZE, 0, (z + OFFSET.Z) * CONFIG.CELL_SIZE);
            camera.position.set(0, 1.6, 0);
            camera.lookAt(0, 1.6, 0); 
            spawned = true;
        }
    }
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

// --- GAME LOOP ---
const clock = new THREE.Clock();

function animate() {
    const delta = clock.getDelta();

    player.update(delta, ghosts);
    
    camera.getWorldPosition(playerWorldPos);

    coinManager.update(delta, playerWorldPos);
    environment.shaderUniforms.u_playerPosition.value.copy(playerWorldPos);

    let isAnyGhostHunting = false;

    for (let i = 0; i < ghosts.length; i++) {
        ghosts[i].update(delta, playerWorldPos);
        
        if (ghosts[i].state === 'HUNT') isAnyGhostHunting = true;
        
        environment.shaderUniforms.u_ghostPositions.value[i].copy(ghosts[i].mesh.position);
        environment.shaderUniforms.u_ghostPositions.value[i].y += 0.2; 
        environment.shaderUniforms.u_ghostDirections.value[i].copy(ghosts[i].getFacingDirection());
        environment.shaderUniforms.u_ghostColors.value[i].copy(ghosts[i].lightColor);
    }

    // Gestione transizione audio dinamica
    if (isAnyGhostHunting) {
        if (explorationMusic.isPlaying) explorationMusic.pause();
        if (chaseMusic.buffer && !chaseMusic.isPlaying) chaseMusic.play();
    } else {
        if (chaseMusic.isPlaying) chaseMusic.pause();
        if (explorationMusic.buffer && !explorationMusic.isPlaying) explorationMusic.play();
    }

    renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { generateMaze } from './maze.js';
import { Ghost } from './Ghost.js';
import { CONFIG, OFFSET } from './config.js';
import { Environment } from './Environment.js';
import { CoinManager } from './CoinManager.js';

// --- SETUP BASE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.COLORS.BG); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

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

// --- SPAWN DEL GIOCATORE ---
let spawned = false;
for (let z = levelMap.length - 2; z > 0; z--) {
    for (let x = 1; x < levelMap[z].length; x++) {
        if (levelMap[z][x] === 0 && !spawned) {
            camera.position.set((x + OFFSET.X) * CONFIG.CELL_SIZE, 1.6, (z + OFFSET.Z) * CONFIG.CELL_SIZE);
            camera.lookAt(0, 1.6, 0); 
            spawned = true;
        }
    }
}

// --- INITIALIZZAZIONE COIN MANAGER ---
const coinManager = new CoinManager(scene, levelMap, audioListener, ghosts, camera.position);

// --- CONTROLLI E INPUT ---
const controls = new PointerLockControls(camera, document.body);
const instructions = document.getElementById('instructions');

document.body.addEventListener('click', () => { if (!renderer.xr.isPresenting) controls.lock(); });
controls.addEventListener('lock', () => instructions.style.display = 'none');
controls.addEventListener('unlock', () => instructions.style.display = '');

const moveState = { forward: false, backward: false, left: false, right: false };
const handleKey = (code, isDown) => {
    if (code === 'KeyW') moveState.forward = isDown;
    if (code === 'KeyA') moveState.left = isDown;
    if (code === 'KeyS') moveState.backward = isDown;
    if (code === 'KeyD') moveState.right = isDown;
};
document.addEventListener('keydown', (e) => handleKey(e.code, true));
document.addEventListener('keyup', (e) => handleKey(e.code, false));

// --- SISTEMA DI COLLISIONE MAPPA ---
function isColliding(x, z, radius = CONFIG.PLAYER_RADIUS) {
    const points = [
        { cx: x - radius, cz: z - radius },
        { cx: x + radius, cz: z - radius },
        { cx: x - radius, cz: z + radius },
        { cx: x + radius, cz: z + radius }
    ];

    for (let p of points) {
        const gridX = Math.round((p.cx / CONFIG.CELL_SIZE) - OFFSET.X);
        const gridZ = Math.round((p.cz / CONFIG.CELL_SIZE) - OFFSET.Z);

        if (gridZ < 0 || gridZ >= levelMap.length || gridX < 0 || gridX >= levelMap[0].length) return true;
        if (levelMap[gridZ][gridX] === 1) return true;
    }
    return false;
}

// --- GAME LOOP ---
const clock = new THREE.Clock();
const direction = new THREE.Vector3();

function animate() {
    const delta = clock.getDelta();

    // 1. Logica di Movimento del Giocatore (Flat)
    if (!renderer.xr.isPresenting && controls.isLocked) {
        direction.z = Number(moveState.forward) - Number(moveState.backward);
        direction.x = Number(moveState.right) - Number(moveState.left);
        direction.normalize();

        if (direction.length() > 0) {
            const forward = new THREE.Vector3();
            camera.getWorldDirection(forward);
            forward.y = 0; forward.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(forward, camera.up).normalize();

            const moveX = (forward.x * direction.z + right.x * direction.x) * CONFIG.PLAYER_SPEED * delta;
            const moveZ = (forward.z * direction.z + right.z * direction.x) * CONFIG.PLAYER_SPEED * delta;

            if (!isColliding(camera.position.x + moveX, camera.position.z)) camera.position.x += moveX;
            if (!isColliding(camera.position.x, camera.position.z + moveZ)) camera.position.z += moveZ;
        }
    }

    // 2. AGGIORNAMENTO LOGICA MONETE
    coinManager.update(delta, camera.position);

    // 3. Aggiornamento Uniformi per gli Shader e Logica Fantasmi
    environment.shaderUniforms.u_playerPosition.value.copy(camera.position);

    let isAnyGhostHunting = false;

    for (let i = 0; i < ghosts.length; i++) {
        ghosts[i].update(delta, camera.position);
        
        // Verifica se almeno un fantasma è in modalità HUNT
        if (ghosts[i].state === 'HUNT') {
            isAnyGhostHunting = true;
        }
        
        environment.shaderUniforms.u_ghostPositions.value[i].copy(ghosts[i].mesh.position);
        environment.shaderUniforms.u_ghostPositions.value[i].y += 0.2; 
        environment.shaderUniforms.u_ghostDirections.value[i].copy(ghosts[i].getFacingDirection());
        environment.shaderUniforms.u_ghostColors.value[i].copy(ghosts[i].lightColor);
    }

    // 4. GESTIONE MUSICA AMBIENTALE
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
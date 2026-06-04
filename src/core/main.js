import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
// Core
import { CONFIG, CURRENT_SETTINGS, updateOffset, resetStats, OFFSET } from './config.js';
import { GameManager } from './GameManager.js';
// World
import { generateMaze } from '../world/maze.js';
import { Environment } from '../world/Environment.js';
import { CoinManager } from '../world/CoinManager.js';
import { WeaponManager } from '../world/WeaponManager.js';
import { DustManager } from '../world/DustManager.js';
// Entities
import { Player } from '../entities/Player.js';
import { Ghost } from '../entities/Ghost.js';
import { Weapon } from '../entities/Weapon.js';
// Systems
import { AudioManager } from '../systems/AudioManager.js';
import { UIManager } from '../systems/UIManager.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { LightManager } from '../systems/LightManager.js';

// --- VARIABILI GLOBALI E STATO DEL GIOCO ---
let scene, camera, renderer, playerRig, audioManager, clock;
let levelMap, environment, player, weapon, ghosts = [];
let coinManager, weaponManager, gameManager, dustManager, uiManager, lightManager;

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

function applySettings(settings) {
    CURRENT_SETTINGS.mapSize = settings.mapSize;
    if (CURRENT_SETTINGS.mapSize % 2 === 0) CURRENT_SETTINGS.mapSize += 1;
    CURRENT_SETTINGS.ghostCount = settings.ghostCount;
    CURRENT_SETTINGS.weaponCount = settings.weaponCount;
    CURRENT_SETTINGS.leftHanded = settings.leftHanded;
}

function initUI() {
    uiManager = new UIManager(
        (settings) => {
            applySettings(settings);
            buildGameScene();
            uiManager.hideUI();
            
            if (!renderer.xr.isPresenting && player && player.input) {
                player.input.controls.lock();
            }
        },
        () => {
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            uiManager.showMainMenu();
        }
    );

    // Avvio per VR (Clic sul pulsante "ENTER VR" di Three.js)
    renderer.xr.addEventListener('sessionstart', () => {
        if (!gameManager || gameManager.isGameOver) {
            const settings = uiManager.readSettings();
            applySettings(settings);
            buildGameScene();
            uiManager.hideUI();
        }
    });
}

function cleanUpScene() {
    if (player) {
        player.weapon = null;
    }

    if (weapon && weapon.mesh && weapon.mesh.parent) {
        weapon.mesh.parent.remove(weapon.mesh);
    }

    scene.clear();
    scene.background = new THREE.Color(CONFIG.COLORS.BG);
    scene.add(playerRig);
    
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

    // --- GENERAZIONE AMBIENTE E LUCI ---
    levelMap = generateMaze(CURRENT_SETTINGS.mapSize, CURRENT_SETTINGS.mapSize);
    environment = new Environment(scene, levelMap);
    lightManager = new LightManager(environment.shaderUniforms);

    // -- PARTICELLARE --
    if (dustManager) dustManager.dispose();
    dustManager = new DustManager(scene, CURRENT_SETTINGS.mapSize);

    // --- SISTEMA FISICO / COLLISIONI ---
    const collisionSystem = new CollisionSystem(levelMap, scene);

    // --- INIZIALIZZAZIONE PLAYER E ARMI ---
    player = new Player(camera, playerRig, renderer, collisionSystem);
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

    // --- SPAWN FANTASMI ---
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
    gameManager = new GameManager(audioManager, ghosts, clock, camera, renderer, uiManager);

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

        // Deleghiamo tutti i calcoli grafici pesanti al LightManager
        lightManager.update(
            playerWorldPos, 
            flashlightPos, 
            flashlightDir, 
            ghosts, 
            weaponManager.pickups
        );
    } // <-- Fine dell'if (gameManager && gameManager.gameStarted && !gameManager.isGameOver)

    renderer.render(scene, camera);
}
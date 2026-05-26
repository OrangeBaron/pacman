import * as THREE from 'three';
import { CONFIG, OFFSET, STATS } from './config.js';

export class CoinManager {
    constructor(scene, levelMap, audioListener, ghosts, playerInitialPos) {
        this.scene = scene;
        this.levelMap = levelMap;
        this.ghosts = ghosts;
        this.coins = [];
        
        // --- SETUP AUDIO DELLA MONETA ---
        this.coinSound = new THREE.Audio(audioListener);
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('./assets/coin.mp3', (buffer) => {
            this.coinSound.setBuffer(buffer);
            this.coinSound.setVolume(0.4);
        });

        // --- GEOMETRIA E MATERIALE BASE ---
        const coinGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.04, 16);
        coinGeometry.rotateX(Math.PI / 2);
        const coinMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });

        const playerGridX = Math.round((playerInitialPos.x / CONFIG.CELL_SIZE) - OFFSET.X);
        const playerGridZ = Math.round((playerInitialPos.z / CONFIG.CELL_SIZE) - OFFSET.Z);

        // --- GENERAZIONE MONETE SULLA MAPPA ---
        for (let z = 0; z < levelMap.length; z++) {
            for (let x = 0; x < levelMap[z].length; x++) {
                if (levelMap[z][x] === 0 && !(x === playerGridX && z === playerGridZ)) {
                    const coinMesh = new THREE.Mesh(coinGeometry, coinMaterial);
                    const worldX = (x + OFFSET.X) * CONFIG.CELL_SIZE;
                    const worldZ = (z + OFFSET.Z) * CONFIG.CELL_SIZE;
                    
                    coinMesh.position.set(worldX, 1.2, worldZ);
                    this.scene.add(coinMesh);
                    this.coins.push(coinMesh);
                }
            }
        }

        // --- FASE 1: REGISTRA IL TOTALE DELLE MONETE ---
        STATS.totalCoins = this.coins.length;
    }

    update(delta, playerPosition) {
        // Raggio d'azione del rumore basso (es. 12 unità spaziali, circa 6 blocchi)
        const NOISE_RADIUS = 12.0; 

        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            
            coin.rotation.y += 2.5 * delta;

            const dist = playerPosition.distanceTo(coin.position);
            if (dist < 0.8) { 
                this.collectCoin(i, coin, NOISE_RADIUS);
            }
        }
    }

    collectCoin(index, coin, noiseRadius) {
        // 1. Rimuovi visivamente e logicamente la moneta
        this.scene.remove(coin);
        this.coins.splice(index, 1);

        // --- FASE 1: REGISTRA LA RACCOLTA ---
        STATS.coinsCollected++;

        // 2. Riproduci il suono di raccolta
        if (this.coinSound.isPlaying) this.coinSound.stop();
        if (this.coinSound.buffer) this.coinSound.play();

        // 3. PROPAGAZIONE DEL RUMORE
        this.ghosts.forEach(ghost => {
            ghost.hearNoise(coin.position.x, coin.position.z, noiseRadius);
        });
    }
}
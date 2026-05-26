import * as THREE from 'three';
import { CONFIG, OFFSET } from './config.js';

export class WeaponManager {
    constructor(scene, levelMap, audioListener, ghosts, playerWeapon) {
        this.scene = scene;
        this.ghosts = ghosts;
        this.playerWeapon = playerWeapon;
        this.pickups = [];

        // --- SETUP AUDIO RACCOLTA ---
        this.pickupSound = new THREE.Audio(audioListener);
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('../assets/pickup.mp3', (buffer) => {
            this.pickupSound.setBuffer(buffer);
            this.pickupSound.setVolume(0.6);
        });

        // --- GENERAZIONE ARMI SULLA MAPPA ---
        for (let z = 0; z < levelMap.length; z++) {
            for (let x = 0; x < levelMap[z].length; x++) {
                if (levelMap[z][x] === 3) {
                    const pickupMesh = this.createPickupModel();
                    const worldX = (x + OFFSET.X) * CONFIG.CELL_SIZE;
                    const worldZ = (z + OFFSET.Z) * CONFIG.CELL_SIZE;
                    
                    pickupMesh.position.set(worldX, 1.0, worldZ); 
                    this.scene.add(pickupMesh);
                    this.pickups.push(pickupMesh);
                }
            }
        }
    }

    createPickupModel() {
        const group = new THREE.Group();
        
        const darkMetalMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const sightMat = new THREE.MeshBasicMaterial({ color: 0x33ff33 }); 

        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.6), bodyMat);
        group.add(body);
        
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.6), darkMetalMat);
        barrel.position.set(0, 0.02, -0.6);
        group.add(barrel);
        
        const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.03), sightMat);
        sight.position.set(0, 0.09, -0.8);
        group.add(sight);

        group.scale.set(1.2, 1.2, 1.2);
        
        return group;
    }

    update(delta, playerPosition) {
        // Rumore Altissimo (copre tutta la mappa)
        const HIGH_NOISE_RADIUS = 100.0;

        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pickup = this.pickups[i];
            
            // Animazione rotazione e fluttuazione
            pickup.rotation.y += 1.5 * delta;
            pickup.position.y = 1.0 + Math.sin(Date.now() * 0.003) * 0.1;

            const dist = playerPosition.distanceTo(pickup.position);
            
            // Se il giocatore è vicino, raccogli l'arma
            if (dist < 1.0) { 
                // 1. Rimuovi visivamente
                this.scene.remove(pickup);
                this.pickups.splice(i, 1);

                // 2. Audio
                if (this.pickupSound.isPlaying) this.pickupSound.stop();
                if (this.pickupSound.buffer) this.pickupSound.play();

                // 3. Equipaggia il fucile e ripristina munizioni
                this.playerWeapon.equip('rifle');

                // 4. PROPAGAZIONE DEL RUMORE: Allerta tutti i fantasmi
                this.ghosts.forEach(ghost => {
                    ghost.hearNoise(pickup.position.x, pickup.position.z, HIGH_NOISE_RADIUS);
                });
            }
        }
    }
}
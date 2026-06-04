import * as THREE from 'three';
import { STATS, CURRENT_SETTINGS } from '../core/config.js';
import { Pathfinding } from '../systems/Pathfinding.js';
import { createGhostMesh } from '../components/GhostModel.js';
import { GhostAudio } from '../components/GhostAudio.js';
import { GhostVision } from '../components/GhostVision.js';
import { GhostBrain } from '../components/GhostBrain.js';

export class Ghost {
    constructor(scene, startX, startZ, cellSize, offsetX, offsetZ, levelMap, audioManager) {
        // 1. Inizializzazione Modello 3D
        const model = createGhostMesh();
        this.mesh = model.mesh;
        this.faceMat = model.faceMat;
        this.textures = model.textures;
        this.ghostMat = model.ghostMat;
        
        this.mesh.position.set(startX, 1.0, startZ);
        scene.add(this.mesh);

        this.mesh.userData = { type: 'ghost', entity: this };
        this.mesh.children.forEach(child => {
            child.userData = { type: 'ghost', entity: this };
        });

        // 2. Variabili di Stato
        this.state = 'PATROL'; 
        this.baseSpeed = CURRENT_SETTINGS.ghostBaseSpeed;
        this.huntSpeed = CURRENT_SETTINGS.ghostHuntSpeed; 
        this.speed = this.baseSpeed;
        this.lightColor = new THREE.Color(0x00ffff);
        this.targetQuaternion = new THREE.Quaternion();

        // 3. Inizializzazione Sottosistemi (Componenti)
        this.pathfinder = new Pathfinding(levelMap, cellSize, offsetX, offsetZ);
        this.audio = new GhostAudio(audioManager, this.mesh);
        this.brain = new GhostBrain(this, this.pathfinder, levelMap, cellSize, offsetX, offsetZ);
    }

    stopAllAudio() {
        this.audio.stopAll();
    }

    onGameStart() {
        this.audio.onGameStart(this.state);
    }

    takeDamage() {
        if (this.state !== 'STUNNED') {
            STATS.ghostsDefeated++;
            this.changeState('STUNNED');
        }
    }

    changeState(newState) {
        if (this.state === newState) return; 
        
        if (newState === 'HUNT' && this.state !== 'HUNT') {
            STATS.timesDiscovered++;
        }

        this.state = newState;
        this.audio.handleStateChange(newState);

        this.ghostMat.color.setHex(0xffffff);
        this.ghostMat.opacity = 1.0;

        // Gestione espressioni facciali e colori
        if (this.state === 'STUNNED') {
            this.faceMat.map = this.textures.stunned;
            this.lightColor.setHex(0x000000);
            this.ghostMat.color.setHex(0x3366ff);
            this.ghostMat.opacity = 0.5;
            this.speed = this.huntSpeed;
        } else if (this.state === 'HUNT') {
            this.faceMat.map = this.textures.angry;
            this.lightColor.setHex(0xff0000); 
            this.speed = this.huntSpeed;
        } else if (this.state === 'INVESTIGATE') {
            this.faceMat.map = this.textures.curious;
            this.lightColor.setHex(0xffaa00); 
            this.speed = this.baseSpeed;
        } else { 
            this.faceMat.map = this.textures.normal;
            this.lightColor.setHex(0xaaffff); 
            this.speed = this.baseSpeed;
        }
    }

    hearNoise(worldX, worldZ, noiseRadius) {
        if (this.state === 'HUNT' || this.state === 'STUNNED') return; 
        
        const dist = Math.hypot(this.mesh.position.x - worldX, this.mesh.position.z - worldZ);
        if (dist <= noiseRadius) {
            const gridPos = this.pathfinder.getGridPos(worldX, worldZ);
            this.brain.setInvestigateTarget(gridPos);
            this.changeState('INVESTIGATE');
        }
    }
    
    getFacingDirection() { 
        return new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion).normalize(); 
    }

    update(delta, playerPos) {
        const currentX = this.mesh.position.x;
        const currentZ = this.mesh.position.z;
        const gridPos = this.pathfinder.getGridPos(currentX, currentZ);
        const playerGridPos = this.pathfinder.getGridPos(playerPos.x, playerPos.z);
        
        const hasLineOfSight = this.pathfinder.checkLineOfSight(gridPos.x, gridPos.z, playerGridPos.x, playerGridPos.z);
        
        // 1. Audio
        this.audio.updateFilters(delta, hasLineOfSight);
        
        // 2. Vista (Aggro)
        if (this.state !== 'STUNNED' && GhostVision.canSeePlayer(this.mesh, playerPos, hasLineOfSight)) {
            this.brain.setHuntTarget(playerGridPos);
            this.changeState('HUNT');
        }

        // 3. Navigazione e Decisioni
        this.brain.updateNavigation(gridPos, currentX, currentZ, this.state);

        // 4. Movimento fisico e fluttuazione
        this.brain.moveAndAnimate(delta, this.speed);
    }
}
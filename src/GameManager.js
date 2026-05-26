import * as THREE from 'three';
import { STATS } from './config.js';

export class GameManager {
    constructor(audioManager, ghosts, clock, camera) {
        this.audioManager = audioManager;
        this.ghosts = ghosts;
        this.clock = clock;
        this.camera = camera;
        
        this.gameStarted = false;
        this.isGameOver = false;
    }

    startGame() {
        if (this.gameStarted) return;
        this.gameStarted = true;
        
        this.audioManager.resumeContext();
        this.audioManager.play('exploration');
        
        this.ghosts.forEach(ghost => ghost.onGameStart());
        
        this.clock.start(); 
    }

    triggerWin() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        
        this.audioManager.pause('exploration');
        this.audioManager.pause('chase');
        this.ghosts.forEach(ghost => ghost.stopAllAudio());
        
        this.audioManager.play('win');
        
        console.log("VITTORIA! Tutte le monete raccolte!");
        this.showEndGameBoard(true); 
    }

    triggerGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        
        this.audioManager.pause('exploration');
        this.audioManager.pause('chase');
        this.ghosts.forEach(ghost => ghost.stopAllAudio());
        
        this.audioManager.play('lose');
        
        console.log("SCONFITTA! Preso da un fantasma!");
        this.showEndGameBoard(false); 
    }

    showEndGameBoard(isVictory) {
        const accuracy = STATS.shotsFired > 0 ? Math.round((STATS.shotsHit / STATS.shotsFired) * 100) : 0;

        // --- CREAZIONE TABELLONE 3D TRAMITE CANVAS ---
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Sfondo dinamico: verde per la vittoria, rosso per la sconfitta
        ctx.fillStyle = isVictory ? 'rgba(10, 80, 10, 0.85)' : 'rgba(80, 10, 10, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Bordo
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 15;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Stile base per il testo
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';

        // Titolo
        ctx.font = 'bold 100px sans-serif';
        ctx.fillText(isVictory ? "VITTORIA!" : "SEI MORTO!", canvas.width / 2, 200);

        // Statistiche
        ctx.font = '55px sans-serif';
        ctx.fillText(`Monete raccolte: ${STATS.coinsCollected} / ${STATS.totalCoins}`, canvas.width / 2, 400);
        ctx.fillText(`Fantasmi storditi: ${STATS.ghostsDefeated}`, canvas.width / 2, 500);
        ctx.fillText(`Volte scoperto: ${STATS.timesDiscovered}`, canvas.width / 2, 600);
        ctx.fillText(`Proiettili sparati: ${STATS.shotsFired}`, canvas.width / 2, 700);
        ctx.fillText(`Precisione di tiro: ${accuracy}%`, canvas.width / 2, 800);

        // Istruzione finale
        ctx.fillStyle = '#aaaaaa';
        ctx.font = 'italic 45px sans-serif';
        ctx.fillText("Ricarica la pagina per giocare di nuovo", canvas.width / 2, 950);

        const texture = new THREE.CanvasTexture(canvas);
        
        const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true,
            depthTest: false 
        });
        
        const geometry = new THREE.PlaneGeometry(1.5, 1.5);
        const panel = new THREE.Mesh(geometry, material);
        panel.renderOrder = 999;

        panel.position.set(0, 0, -2);
        this.camera.add(panel);
    }

    update(playerWorldPos) {
        if (!this.gameStarted || this.isGameOver) return;

        // --- CONTROLLO VITTORIA ---
        if (STATS.totalCoins > 0 && STATS.coinsCollected >= STATS.totalCoins) {
            this.triggerWin();
            return;
        }

        let isAnyGhostHunting = false;

        // --- CONTROLLO SCONFITTA E STATO FANTASMI ---
        for (let i = 0; i < this.ghosts.length; i++) {
            const ghost = this.ghosts[i];
            
            if (ghost.state !== 'STUNNED') {
                const dist = Math.hypot(
                    playerWorldPos.x - ghost.mesh.position.x,
                    playerWorldPos.z - ghost.mesh.position.z
                );
                
                if (dist < 1.0) {
                    this.triggerGameOver();
                    return;
                }
            }

            if (ghost.state === 'HUNT') isAnyGhostHunting = true;
        }

        // --- GESTIONE MUSICA DINAMICA ---
        if (isAnyGhostHunting) {
            this.audioManager.pause('exploration');
            this.audioManager.play('chase');
        } else {
            this.audioManager.pause('chase');
            this.audioManager.play('exploration');
        }
    }
}
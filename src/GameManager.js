import { STATS } from './config.js';

export class GameManager {
    constructor(audioManager, ghosts, clock) {
        this.audioManager = audioManager;
        this.ghosts = ghosts;
        this.clock = clock;
        
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
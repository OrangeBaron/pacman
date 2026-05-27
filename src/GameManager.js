import { STATS } from './config.js';

export class GameManager {
    constructor(audioManager, ghosts, clock, camera, renderer) {
        this.audioManager = audioManager;
        this.ghosts = ghosts;
        this.clock = clock;
        this.camera = camera;
        this.renderer = renderer; 
        
        this.gameStarted = false;
        this.isGameOver = false;

        this.uiLayer = document.getElementById('ui-layer');
        this.mainPanel = document.getElementById('main-panel');
        this.endPanel = document.getElementById('end-panel');
        this.endTitle = document.getElementById('end-title');
        this.endStats = document.getElementById('end-stats');
        this.btnMenu = document.getElementById('btn-menu');

        this.btnMenu.onclick = () => {
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }

            this.endPanel.classList.remove('active', 'victory', 'defeat');
            this.mainPanel.classList.add('active');
            this.uiLayer.style.display = 'flex';
        };
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

        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        if (this.renderer.xr.isPresenting) {
            this.renderer.xr.getSession().end();
        }

        if (isVictory) {
            this.endTitle.innerText = "VITTORIA!";
            this.endPanel.classList.add('victory');
        } else {
            this.endTitle.innerText = "SEI MORTO!";
            this.endPanel.classList.add('defeat');
        }

        this.endStats.innerHTML = `
            <p><strong>Monete raccolte:</strong> ${STATS.coinsCollected} / ${STATS.totalCoins}</p>
            <p><strong>Fantasmi storditi:</strong> ${STATS.ghostsDefeated}</p>
            <p><strong>Volte scoperto:</strong> ${STATS.timesDiscovered}</p>
            <p><strong>Proiettili sparati:</strong> ${STATS.shotsFired}</p>
            <p><strong>Precisione di tiro:</strong> ${accuracy}%</p>
        `;

        this.mainPanel.classList.remove('active');
        this.endPanel.classList.add('active');
        this.uiLayer.style.display = 'flex';
    }

    update(playerWorldPos) {
        if (!this.gameStarted || this.isGameOver) return;

        if (STATS.totalCoins > 0 && STATS.coinsCollected >= STATS.totalCoins) {
            this.triggerWin();
            return;
        }

        let isAnyGhostHunting = false;

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

        if (isAnyGhostHunting) {
            this.audioManager.pause('exploration');
            this.audioManager.play('chase');
        } else {
            this.audioManager.pause('chase');
            this.audioManager.play('exploration');
        }
    }
}
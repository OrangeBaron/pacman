import { STATS } from '../core/config.js';

export class UIManager {
    constructor(onStartGame, onReturnToMenu) {
        // Recupero tutti gli elementi del DOM
        this.uiLayer = document.getElementById('ui-layer');
        this.mainPanel = document.getElementById('main-panel');
        this.endPanel = document.getElementById('end-panel');
        this.endTitle = document.getElementById('end-title');
        this.endStats = document.getElementById('end-stats');
        this.btnStart = document.getElementById('btn-start');
        this.btnMenu = document.getElementById('btn-menu');

        // Ascolto il click sul pulsante "Gioca"
        this.btnStart.addEventListener('click', () => {
            const settings = this.readSettings();
            if (onStartGame) onStartGame(settings);
        });

        // Ascolto il click sul pulsante "Torna al Menu"
        this.btnMenu.addEventListener('click', () => {
            if (onReturnToMenu) onReturnToMenu();
        });
    }

    // Estrae i valori dall'interfaccia
    readSettings() {
        return {
            mapSize: parseInt(document.getElementById('set-mapSize').value),
            ghostCount: parseInt(document.getElementById('set-ghostCount').value),
            weaponCount: parseInt(document.getElementById('set-weaponCount').value),
            leftHanded: document.getElementById('set-leftHanded').checked
        };
    }

    hideUI() {
        this.uiLayer.style.display = 'none';
    }

    showMainMenu() {
        this.endPanel.classList.remove('active', 'victory', 'defeat');
        this.mainPanel.classList.add('active');
        this.uiLayer.style.display = 'flex';
    }

    showEndScreen(isVictory) {
        const accuracy = STATS.shotsFired > 0 ? Math.round((STATS.shotsHit / STATS.shotsFired) * 100) : 0;

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
}
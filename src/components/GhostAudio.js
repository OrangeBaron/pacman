export class GhostAudio {
    constructor(audioManager, ghostMesh) {
        this.mesh = ghostMesh;
        this.gameStarted = false;
        
        const audioCtx = audioManager.listener.context;

        // Inizializzazione filtri
        this.filterNormal = audioCtx.createBiquadFilter();
        this.filterNormal.type = 'lowpass';
        this.filterNormal.frequency.value = 22050;

        this.filterFast = audioCtx.createBiquadFilter();
        this.filterFast.type = 'lowpass';
        this.filterFast.frequency.value = 22050;

        // Inizializzazione suoni
        this.audioNormal = audioManager.createPositionalSound('./assets/normal.mp3', 3, true, () => {
            if (this.gameStarted && this.currentState !== 'HUNT' && this.currentState !== 'STUNNED') {
                this.audioNormal.play();
            }
        });
        this.audioNormal.setFilter(this.filterNormal);

        this.audioFast = audioManager.createPositionalSound('./assets/fast.mp3', 5, true);
        this.audioFast.setFilter(this.filterFast);
        
        this.audioAlert = audioManager.createPositionalSound('./assets/alert.mp3', 5, false);

        this.mesh.add(this.audioNormal);
        this.mesh.add(this.audioFast);
        this.mesh.add(this.audioAlert);
    }

    onGameStart(currentState) {
        this.gameStarted = true;
        this.currentState = currentState;
        if (this.audioNormal.buffer && !this.audioNormal.isPlaying && currentState !== 'HUNT' && currentState !== 'STUNNED') {
            this.audioNormal.play();
        }
    }

    stopAll() {
        if (this.audioNormal && this.audioNormal.isPlaying) this.audioNormal.pause();
        if (this.audioFast && this.audioFast.isPlaying) this.audioFast.pause();
        if (this.audioAlert && this.audioAlert.isPlaying) this.audioAlert.pause();
    }

    handleStateChange(newState) {
        this.currentState = newState;
        if (newState === 'STUNNED') {
            this.stopAll();
        } else if (newState === 'HUNT') {
            if (this.audioNormal.isPlaying) this.audioNormal.pause();
            if (this.audioFast.buffer && !this.audioFast.isPlaying) this.audioFast.play();
            if (this.audioAlert.buffer && !this.audioAlert.isPlaying) this.audioAlert.play();
        } else if (newState === 'INVESTIGATE' || newState === 'PATROL') {
            if (this.audioFast.isPlaying) this.audioFast.pause();
            if (this.audioNormal.buffer && !this.audioNormal.isPlaying) this.audioNormal.play();
        }
    }

    updateFilters(delta, hasLineOfSight) {
        const targetFreq = hasLineOfSight ? 22050 : 600;
        this.filterNormal.frequency.value += (targetFreq - this.filterNormal.frequency.value) * 10 * delta;
        this.filterFast.frequency.value += (targetFreq - this.filterFast.frequency.value) * 10 * delta;
    }
}
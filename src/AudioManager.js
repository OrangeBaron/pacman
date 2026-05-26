import * as THREE from 'three';

export class AudioManager {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
        this.audioLoader = new THREE.AudioLoader();

        // Contenitore per i suoni globali non posizionali
        this.sounds = {
            exploration: new THREE.Audio(this.listener),
            chase: new THREE.Audio(this.listener),
            win: new THREE.Audio(this.listener),
            lose: new THREE.Audio(this.listener),
            shoot: new THREE.Audio(this.listener),
            coin: new THREE.Audio(this.listener),
            pickup: new THREE.Audio(this.listener)
        };

        this.initGlobalSounds();
    }

    initGlobalSounds() {
        this.loadSound('./assets/exploration.mp3', this.sounds.exploration, { loop: true, volume: 0.1 });
        this.loadSound('./assets/chase.mp3', this.sounds.chase, { loop: true, volume: 0.1 });
        this.loadSound('./assets/win.mp3', this.sounds.win, { loop: false, volume: 0.4 });
        this.loadSound('./assets/lose.mp3', this.sounds.lose, { loop: false, volume: 0.4 });
        this.loadSound('./assets/shoot.mp3', this.sounds.shoot, { loop: false, volume: 0.5 });
        this.loadSound('./assets/coin.mp3', this.sounds.coin, { loop: false, volume: 0.4 });
        this.loadSound('./assets/pickup.mp3', this.sounds.pickup, { loop: false, volume: 0.6 });
    }

    loadSound(path, audioObject, options) {
        this.audioLoader.load(path, (buffer) => {
            audioObject.setBuffer(buffer);
            if (options.loop !== undefined) audioObject.setLoop(options.loop);
            if (options.volume !== undefined) audioObject.setVolume(options.volume);
            if (options.refDistance !== undefined) audioObject.setRefDistance(options.refDistance);
            if (options.onLoad) options.onLoad();
        });
    }

    // Metodo esposto per creare suoni 3D attaccati alle mesh (usato dai Fantasmi)
    createPositionalSound(path, refDistance = 3, loop = false, onLoadCallback = null) {
        const sound = new THREE.PositionalAudio(this.listener);
        this.loadSound(path, sound, { refDistance, loop, onLoad: onLoadCallback });
        return sound;
    }

    play(soundName) {
        const sound = this.sounds[soundName];
        if (sound && sound.buffer && !sound.isPlaying) {
            sound.play();
        }
    }

    // Ferma e fa ripartire istantaneamente il suono (utile per spari e monete a ripetizione)
    playForce(soundName) {
        const sound = this.sounds[soundName];
        if (sound && sound.buffer) {
            if (sound.isPlaying) sound.stop();
            sound.play();
        }
    }

    pause(soundName) {
        const sound = this.sounds[soundName];
        if (sound && sound.isPlaying) {
            sound.pause();
        }
    }

    resumeContext() {
        if (this.listener.context.state === 'suspended') {
            this.listener.context.resume();
        }
    }
}
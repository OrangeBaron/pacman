import * as THREE from 'three';

export class Weapon {
    constructor(camera, audioListener) {
        this.camera = camera;
        this.mesh = this.createModel();
        this.camera.add(this.mesh);
        this.mesh.position.set(0.3, -0.3, -0.6);

        // -- Setup Raycaster per mirare --
        this.raycaster = new THREE.Raycaster();
        // Il centro dello schermo in coordinate normalizzate
        this.centerScreen = new THREE.Vector2(0, 0); 

        // -- Setup Audio --
        this.shootSound = new THREE.Audio(audioListener);
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('../assets/shoot.mp3', (buffer) => {
            this.shootSound.setBuffer(buffer);
            this.shootSound.setVolume(0.5);
        });

        // -- Gestione Rateo di Fuoco --
        this.canShoot = true;
        this.fireRate = 1000; // 1 secondo tra un colpo e l'altro (rateo lento)
    }

    createModel() {
        const group = new THREE.Group();

        // Definiamo diversi materiali per dare contrasto all'arma
        const darkMetalMat = new THREE.MeshBasicMaterial({ color: 0x2b2b2b });
        const lightMetalMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4a });
        const gripMat = new THREE.MeshBasicMaterial({ color: 0x3e2723 });
        const sightMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });

        // 1. Canna / Corpo principale (Grigio scuro)
        const barrelGeo = new THREE.BoxGeometry(0.07, 0.08, 0.4);
        const barrel = new THREE.Mesh(barrelGeo, darkMetalMat);
        barrel.position.set(0, 0, -0.1);
        group.add(barrel);

        // 2. Carrello superiore (Grigio più chiaro e leggermente più largo)
        const slideGeo = new THREE.BoxGeometry(0.08, 0.04, 0.42);
        const slide = new THREE.Mesh(slideGeo, lightMetalMat);
        slide.position.set(0, 0.06, -0.11);
        group.add(slide);

        // 3. Impugnatura / Grip (Marrone)
        const handleGeo = new THREE.BoxGeometry(0.06, 0.2, 0.1);
        const handle = new THREE.Mesh(handleGeo, gripMat);
        handle.position.set(0, -0.14, 0.05);
        handle.rotation.x = Math.PI / 8;
        group.add(handle);

        // 4. Guardia del grilletto (Sotto la canna, davanti all'impugnatura)
        const guardGeo = new THREE.BoxGeometry(0.01, 0.08, 0.1);
        const guard = new THREE.Mesh(guardGeo, darkMetalMat);
        guard.position.set(0, -0.06, -0.03);
        group.add(guard);

        // 5. Mirino (Piccolo punto rosso sulla punta della canna)
        const sightGeo = new THREE.BoxGeometry(0.015, 0.03, 0.02);
        const sight = new THREE.Mesh(sightGeo, sightMat);
        sight.position.set(0, 0.09, -0.3);
        group.add(sight);

        return group;
    }

    shoot(ghosts, vrController = null) {
        if (!this.canShoot) return;

        // 1. Riproduci audio e applica cooldown
        if (this.shootSound.isPlaying) this.shootSound.stop();
        if (this.shootSound.buffer) this.shootSound.play();
        
        this.canShoot = false;
        setTimeout(() => { this.canShoot = true; }, this.fireRate);

        // 2. Anima leggermente l'arma per il rinculo
        this.mesh.position.z += 0.1;
        this.mesh.rotation.x += 0.1;
        setTimeout(() => { 
            this.mesh.position.z -= 0.1; 
            this.mesh.rotation.x -= 0.1; 
        }, 100);

        // 3. Raycasting: Controlla da dove spariamo
        if (vrController) {
            // Modalità VR: estrai posizione e direzione dal controller VR
            const position = new THREE.Vector3();
            const direction = new THREE.Vector3(0, 0, -1);
            
            position.setFromMatrixPosition(vrController.matrixWorld);
            direction.transformDirection(vrController.matrixWorld).normalize();
            
            this.raycaster.set(position, direction);
        } else {
            // Modalità Flat: spara dal centro della telecamera
            this.raycaster.setFromCamera(this.centerScreen, this.camera);
        }
        
        // Estraiamo le mesh dei fantasmi per il raycaster
        const ghostMeshes = ghosts.map(g => g.mesh);
        const intersects = this.raycaster.intersectObjects(ghostMeshes, true);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const hitGhost = ghosts.find(g => g.mesh === hitMesh || g.mesh.children.includes(hitMesh));
            
            if (hitGhost) {
                console.log("Fantasma colpito e stordito!");
                hitGhost.takeDamage();
            }
        }

        // 4. PROPAGAZIONE DEL RUMORE
        const worldPos = new THREE.Vector3();
        this.camera.getWorldPosition(worldPos);

        ghosts.forEach(ghost => {
            ghost.hearNoise(worldPos.x, worldPos.z, 100.0);
        });
    }
}
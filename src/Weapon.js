import * as THREE from 'three';

export class Weapon {
    constructor(camera, audioListener) {
        this.camera = camera;
        
        // Contenitore vuoto che ospiterà la mesh dell'arma attiva
        this.mesh = new THREE.Group();
        this.camera.add(this.mesh);
        this.mesh.position.set(0.3, -0.3, -0.6);

        // -- Setup Raycaster per mirare --
        this.raycaster = new THREE.Raycaster();
        this.centerScreen = new THREE.Vector2(0, 0); 

        // -- Setup Audio --
        this.shootSound = new THREE.Audio(audioListener);
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('./assets/shoot.mp3', (buffer) => {
            this.shootSound.setBuffer(buffer);
            this.shootSound.setVolume(0.5);
        });

        // -- Statistiche e Modelli delle armi --
        this.models = {
            pistol: this.createPistolModel(),
            rifle: this.createRifleModel()
        };

        this.stats = {
            pistol: { fireRate: 1000, ammo: Infinity, automatic: false },
            rifle: { fireRate: 150, ammo: 30, automatic: true }
        };

        this.canShoot = true;
        this.currentType = null;
        this.currentAmmo = 0;

        // Equipaggia l'arma di base all'avvio
        this.equip('pistol');
    }

    equip(weaponType) {
        if (!this.models[weaponType]) return;

        this.currentType = weaponType;
        this.currentAmmo = this.stats[weaponType].ammo;

        // Rimuove il modello dell'arma precedente
        while(this.mesh.children.length > 0){ 
            this.mesh.remove(this.mesh.children[0]); 
        }

        // Aggiunge il nuovo modello
        this.mesh.add(this.models[weaponType]);
    }

    createPistolModel() {
        const group = new THREE.Group();
        const darkMetalMat = new THREE.MeshBasicMaterial({ color: 0x2b2b2b });
        const lightMetalMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4a });
        const gripMat = new THREE.MeshBasicMaterial({ color: 0x3e2723 });
        const sightMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });

        const barrelGeo = new THREE.BoxGeometry(0.07, 0.08, 0.4);
        const barrel = new THREE.Mesh(barrelGeo, darkMetalMat);
        barrel.position.set(0, 0, -0.1);
        group.add(barrel);

        const slideGeo = new THREE.BoxGeometry(0.08, 0.04, 0.42);
        const slide = new THREE.Mesh(slideGeo, lightMetalMat);
        slide.position.set(0, 0.06, -0.11);
        group.add(slide);

        const handleGeo = new THREE.BoxGeometry(0.06, 0.2, 0.1);
        const handle = new THREE.Mesh(handleGeo, gripMat);
        handle.position.set(0, -0.14, 0.05);
        handle.rotation.x = -Math.PI / 8;
        group.add(handle);

        const guardGeo = new THREE.BoxGeometry(0.01, 0.08, 0.1);
        const guard = new THREE.Mesh(guardGeo, darkMetalMat);
        guard.position.set(0, -0.06, -0.03);
        group.add(guard);

        const sightGeo = new THREE.BoxGeometry(0.015, 0.03, 0.02);
        const sight = new THREE.Mesh(sightGeo, sightMat);
        sight.position.set(0, 0.09, -0.3);
        group.add(sight);

        return group;
    }

    createRifleModel() {
        const group = new THREE.Group();
        const darkMetalMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
        const bodyMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const stockMat = new THREE.MeshBasicMaterial({ color: 0x2a1b12 });
        const sightMat = new THREE.MeshBasicMaterial({ color: 0x33ff33 });

        const bodyGeo = new THREE.BoxGeometry(0.08, 0.12, 0.5);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.set(0, 0, -0.1);
        group.add(body);

        const barrelGeo = new THREE.BoxGeometry(0.04, 0.04, 0.5);
        const barrel = new THREE.Mesh(barrelGeo, darkMetalMat);
        barrel.position.set(0, 0.02, -0.6);
        group.add(barrel);

        const stockGeo = new THREE.BoxGeometry(0.06, 0.15, 0.3);
        const stock = new THREE.Mesh(stockGeo, stockMat);
        stock.position.set(0, -0.05, 0.3);
        group.add(stock);

        const handleGeo = new THREE.BoxGeometry(0.05, 0.2, 0.08);
        const handle = new THREE.Mesh(handleGeo, stockMat);
        handle.position.set(0, -0.15, 0.1);
        handle.rotation.x = -Math.PI / 8;
        group.add(handle);

        const magGeo = new THREE.BoxGeometry(0.06, 0.25, 0.12);
        const mag = new THREE.Mesh(magGeo, darkMetalMat);
        mag.position.set(0, -0.2, -0.1);
        mag.rotation.x = Math.PI / 16;
        group.add(mag);

        const sightGeo = new THREE.BoxGeometry(0.015, 0.03, 0.02);
        const sight = new THREE.Mesh(sightGeo, sightMat);
        sight.position.set(0, 0.075, -0.8);
        group.add(sight);

        return group;
    }

    shoot(ghosts, scene, vrController = null) {
        if (!this.canShoot) return;

        if (this.currentAmmo <= 0 && this.currentType !== 'pistol') {
            this.equip('pistol');
            return;
        }

        // 1. Riproduci audio e applica cooldown
        if (this.shootSound.isPlaying) this.shootSound.stop();
        if (this.shootSound.buffer) this.shootSound.play();
        
        this.canShoot = false;
        setTimeout(() => { this.canShoot = true; }, this.stats[this.currentType].fireRate);

        if (this.currentType !== 'pistol') {
            this.currentAmmo--;
        }

        // 2. Anima leggermente l'arma per il rinculo
        const recoilZ = this.currentType === 'rifle' ? 0.05 : 0.1;
        const recoilX = this.currentType === 'rifle' ? 0.05 : 0.1;
        
        this.mesh.position.z += recoilZ;
        this.mesh.rotation.x += recoilX;
        setTimeout(() => { 
            this.mesh.position.z -= recoilZ; 
            this.mesh.rotation.x -= recoilX; 
        }, 100);

        // 3. Raycasting
        if (vrController) {
            const position = new THREE.Vector3();
            const direction = new THREE.Vector3(0, 0, -1);
            position.setFromMatrixPosition(vrController.matrixWorld);
            direction.transformDirection(vrController.matrixWorld).normalize();
            this.raycaster.set(position, direction);
        } else {
            this.raycaster.setFromCamera(this.centerScreen, this.camera);
        }
        
        const intersects = this.raycaster.intersectObject(scene, true);

        const hitGhosts = new Set();
        
        for (let i = 0; i < intersects.length; i++) {
            const hitMesh = intersects[i].object;
            
            let isWeapon = false;
            let obj = hitMesh;
            while(obj) {
                if (obj === this.mesh) { isWeapon = true; break; }
                obj = obj.parent;
            }
            if (isWeapon) continue;

            const hitGhost = ghosts.find(g => g.mesh === hitMesh || g.mesh.children.includes(hitMesh));
            
            if (hitGhost) {
                if (!hitGhosts.has(hitGhost)) {
                    console.log("Bersaglio colpito con:", this.currentType);
                    hitGhost.takeDamage();
                    hitGhosts.add(hitGhost);
                }
            } else if (hitMesh.material && hitMesh.material.type === 'ShaderMaterial') {
                break;
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
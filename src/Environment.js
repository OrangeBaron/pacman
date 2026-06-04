import * as THREE from 'three';
import { CONFIG, OFFSET, CURRENT_SETTINGS } from './config.js';
import { vertexShader, fragmentShader } from './shaders.js';

export class Environment {
    constructor(scene, levelMap) {
        this.scene = scene;
        this.levelMap = levelMap;
        this.shaderUniforms = this.initUniforms();
        
        this.buildMapTexture();
        this.buildMeshes();
    }

    initUniforms() {
        return {
            u_ghostPositions: { value: Array(4).fill(null).map(() => new THREE.Vector3(0, -100, 0)) },
            u_ghostDirections: { value: Array(4).fill(null).map(() => new THREE.Vector3(0, 0, 1)) },
            u_ghostColors: { value: Array(4).fill(null).map(() => new THREE.Color(0x00ffff)) },
            u_weaponPositions: { value: Array(2).fill(null).map(() => new THREE.Vector3(0, -100, 0)) },
            u_playerPosition: { value: new THREE.Vector3(0, 0, 0) },
            u_flashlightPos: { value: new THREE.Vector3(0, 0, 0) },
            u_flashlightDir: { value: new THREE.Vector3(0, 0, -1) },
            u_mapTexture: { value: null }, 
            u_mapSize: { value: CURRENT_SETTINGS.mapSize },
            u_cellSize: { value: CONFIG.CELL_SIZE },
            u_gridOffset: { value: new THREE.Vector2(OFFSET.X, OFFSET.Z) }
        };
    }

    buildMapTexture() {
        const mapDataRGBA = new Uint8Array(CURRENT_SETTINGS.mapSize * CURRENT_SETTINGS.mapSize * 4);
        for (let z = 0; z < CURRENT_SETTINGS.mapSize; z++) {
            for (let x = 0; x < CURRENT_SETTINGS.mapSize; x++) {
                let isWall = this.levelMap[z][x] === 1 ? 255 : 0;
                let index = (z * CURRENT_SETTINGS.mapSize + x) * 4;
                mapDataRGBA[index] = isWall;     
                mapDataRGBA[index + 1] = 0;      
                mapDataRGBA[index + 2] = 0;      
                mapDataRGBA[index + 3] = 255;    
            }
        }
        const mapTexture = new THREE.DataTexture(mapDataRGBA, CURRENT_SETTINGS.mapSize, CURRENT_SETTINGS.mapSize, THREE.RGBAFormat);
        mapTexture.magFilter = THREE.NearestFilter;
        mapTexture.minFilter = THREE.NearestFilter;
        mapTexture.needsUpdate = true;
        this.shaderUniforms.u_mapTexture.value = mapTexture;
    }

    createLevelMaterial(hexColor) {
        return new THREE.ShaderMaterial({
            uniforms: {
                u_baseColor: { value: new THREE.Color(hexColor) },
                ...this.shaderUniforms
            },
            vertexShader,
            fragmentShader
        });
    }

    buildMeshes() {
        const wallGeometry = new THREE.BoxGeometry(CONFIG.CELL_SIZE, 2.5, CONFIG.CELL_SIZE);
        const floorGeometry = new THREE.PlaneGeometry(CONFIG.CELL_SIZE, CONFIG.CELL_SIZE);

        for (let z = 0; z < this.levelMap.length; z++) {
            for (let x = 0; x < this.levelMap[z].length; x++) {
                const type = this.levelMap[z][x];
                const worldX = (x + OFFSET.X) * CONFIG.CELL_SIZE;
                const worldZ = (z + OFFSET.Z) * CONFIG.CELL_SIZE;

                if (type === 1) {
                    const wallMat = this.createLevelMaterial(CONFIG.COLORS.WALL);
                    const wall = new THREE.Mesh(wallGeometry, wallMat);
                    wall.position.set(worldX, 1.25, worldZ);
                    this.scene.add(wall);
                } else {
                    let floorColor = CONFIG.COLORS.FLOOR_NORMAL;
                    if (type === 2) floorColor = CONFIG.COLORS.FLOOR_GHOST_BASE;
                    if (type === 3) floorColor = CONFIG.COLORS.FLOOR_WEAPON;

                    const floorMat = this.createLevelMaterial(floorColor);
                    const floor = new THREE.Mesh(floorGeometry, floorMat);
                    floor.rotation.x = -Math.PI / 2;
                    floor.position.set(worldX, 0, worldZ);
                    this.scene.add(floor);
                }
            }
        }

        const ceilingGeometry = new THREE.PlaneGeometry(CURRENT_SETTINGS.mapSize * CONFIG.CELL_SIZE, CURRENT_SETTINGS.mapSize * CONFIG.CELL_SIZE);
        const ceilingMaterial = this.createLevelMaterial(CONFIG.COLORS.BG);
        const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(0, 2.5, 0);
        this.scene.add(ceiling);
    }
}
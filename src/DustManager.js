import * as THREE from 'three';
import { CONFIG } from './config.js';

export class DustManager {
    constructor(scene, mapSize) {
        this.scene = scene;
        
        // Circa 4 particelle per ogni cella della mappa
        const particleCount = mapSize * mapSize * 4; 
        
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const phases = new Float32Array(particleCount);

        // Distribuiamo le particelle su tutta la mappa
        const extent = (mapSize * CONFIG.CELL_SIZE) / 2.0;

        for (let i = 0; i < particleCount; i++) {
            // X e Z casuali nell'area del labirinto
            positions[i * 3] = (Math.random() - 0.5) * mapSize * CONFIG.CELL_SIZE;
            // Y casuale tra il pavimento (0) e il soffitto (2.5)
            positions[i * 3 + 1] = Math.random() * 2.5; 
            positions[i * 3 + 2] = (Math.random() - 0.5) * mapSize * CONFIG.CELL_SIZE;
            
            // Una fase casuale per sfalsare il movimento fluttuante
            phases[i] = Math.random() * Math.PI * 2;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('a_phase', new THREE.BufferAttribute(phases, 1));

        // Uniforms per passare i dati del tempo e della torcia allo shader
        this.uniforms = {
            u_time: { value: 0.0 },
            u_flashlightPos: { value: new THREE.Vector3() },
            u_flashlightDir: { value: new THREE.Vector3(0, 0, -1) }
        };

        const material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            transparent: true,
            depthWrite: false, // Evita bug visivi con altre trasparenze
            blending: THREE.AdditiveBlending, // Effetto luce
            vertexShader: `
                uniform float u_time;
                varying vec3 vWorldPosition;
                attribute float a_phase;

                void main() {
                    // Movimento fluttuante organico calcolato interamente dalla GPU
                    vec3 pos = position;
                    pos.y += sin(u_time * 0.5 + a_phase) * 0.1;
                    pos.x += cos(u_time * 0.3 + a_phase) * 0.05;
                    pos.z += sin(u_time * 0.4 + a_phase) * 0.05;

                    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    
                    gl_Position = projectionMatrix * viewMatrix * worldPosition;
                    
                    // Dimensione fissa del punto a schermo (puoi regolarla)
                    gl_PointSize = 3.0; 
                }
            `,
            fragmentShader: `
                uniform vec3 u_flashlightPos;
                uniform vec3 u_flashlightDir;
                varying vec3 vWorldPosition;

                void main() {
                    // Calcola distanza e direzione dalla torcia
                    vec3 toPixel = vWorldPosition - u_flashlightPos;
                    float dist = length(toPixel);
                    
                    float alpha = 0.0;
                    
                    // Se la particella è nel raggio d'azione della torcia
                    if (dist < 15.0) {
                        vec3 toPixelNorm = normalize(toPixel);
                        float angle = dot(toPixelNorm, u_flashlightDir);
                        
                        // Se è dentro il cono della torcia (allineato con il tuo shader principale)
                        if (angle > 0.75) {
                            float intensity = smoothstep(15.0, 0.0, dist);
                            float angularIntensity = smoothstep(0.75, 0.85, angle);
                            
                            // Opacità massima a 0.6 per non accecare
                            alpha = intensity * angularIntensity * 0.6; 
                        }
                    }
                    
                    // Ottimizzazione estrema: se la particella è invisibile, smetti di calcolarla
                    if (alpha <= 0.01) discard;

                    // Arrotonda il punto (che di default è un quadrato in WebGL)
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    if (length(coord) > 0.5) discard;

                    // Colore del pulviscolo (bianco/giallognolo caldo)
                    gl_FragColor = vec4(1.0, 0.95, 0.8, alpha);
                }
            `
        });

        this.mesh = new THREE.Points(geometry, material);
        scene.add(this.mesh);
    }

    update(time, flashlightPos, flashlightDir) {
        this.uniforms.u_time.value = time;
        if (flashlightPos && flashlightDir) {
            this.uniforms.u_flashlightPos.value.copy(flashlightPos);
            this.uniforms.u_flashlightDir.value.copy(flashlightDir);
        }
    }
    
    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
export const vertexShader = `
    varying vec3 vWorldPosition;
    varying vec3 vNormal; // AGGIUNTO: Passiamo la normale della superficie

    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        // Calcoliamo verso dove "guarda" la faccia del modello nel mondo 3D
        vNormal = normalize(mat3(modelMatrix) * normal);
        
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

export const fragmentShader = `
    uniform vec3 u_baseColor;
    uniform vec3 u_ghostPositions[4];
    uniform vec3 u_ghostDirections[4];
    uniform vec3 u_ghostColors[4];
    uniform vec3 u_playerPosition;
    
    uniform sampler2D u_mapTexture;
    uniform float u_mapSize;
    uniform float u_cellSize;
    uniform vec2 u_gridOffset;
    
    varying vec3 vWorldPosition;
    varying vec3 vNormal; // AGGIUNTO: Riceviamo la normale

    float random(vec3 st) {
        return fract(sin(dot(st.xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453123);
    }

    bool isOccluded(vec3 pixelPos, vec3 lightPos) {
        vec2 start = pixelPos.xz;
        vec2 end = lightPos.xz;
        vec2 dir = end - start;
        float dist = length(dir);
        vec2 dirNorm = dir / dist;
        
        float rayProgress = 0.2; 
        float stepSize = 0.5; 
        
        for(int i = 0; i < 50; i++) {
            if(rayProgress >= dist) break;
            
            vec2 currentPos = start + dirNorm * rayProgress;
            vec2 gridPos = (currentPos / u_cellSize) - u_gridOffset;
            vec2 uv = (gridPos + vec2(0.5)) / u_mapSize;
            
            if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
                float isWall = texture2D(u_mapTexture, uv).r;
                if (isWall > 0.5) return true; 
            }
            
            rayProgress += stepSize;
        }
        return false;
    }

    void main() {
        vec3 albedo;
        
        // Determiniamo se la superficie è un pavimento/soffitto (normale verticale) o un muro (normale orizzontale)
        float isFloorOrCeiling = step(0.5, abs(vNormal.y));

        // Creiamo una "porosità" globale per la pietra (grana)
        float rockGrain = (random(vWorldPosition * 15.0) - 0.5) * 0.15;

        if (isFloorOrCeiling > 0.0) {
            // --- PATTERN PAVIMENTO E SOFFITTO ---
            // Grosse lastre quadrate
            vec2 pos2D = vWorldPosition.xz * 0.6; // Più grandi dei mattoni
            vec2 localPos = fract(pos2D);
            vec2 blockId = floor(pos2D);

            float isMortarX = step(localPos.x, 0.04);
            float isMortarY = step(localPos.y, 0.04);
            float mortar = clamp(isMortarX + isMortarY, 0.0, 1.0);

            // Colore della singola lastra
            float noiseVal = random(vec3(blockId, 0.0));
            vec3 stoneColor = mix(u_baseColor * 0.8, u_baseColor * 1.2, noiseVal) + rockGrain;
            vec3 mortarColor = u_baseColor * 0.15;

            albedo = mix(stoneColor, mortarColor, mortar);

        } else {
            // --- PATTERN PARETI ---
            // Mattoni rettangolari sfalsati
            vec2 pos2D;
            
            // Usiamo gli assi giusti a seconda che il muro guardi su X o su Z
            if (abs(vNormal.x) > 0.5) {
                pos2D = vWorldPosition.zy; 
            } else {
                pos2D = vWorldPosition.xy;
            }
            
            pos2D *= vec2(1.2, 2.0); // Scaliamo per renderli rettangolari

            // Sfalsiamo le righe
            float stagger = step(0.5, fract(pos2D.y));
            pos2D.x += stagger * 0.5;

            vec2 localPos = fract(pos2D);
            vec2 blockId = floor(pos2D);

            float isMortarX = step(localPos.x, 0.05);
            float isMortarY = step(localPos.y, 0.05);
            float mortar = clamp(isMortarX + isMortarY, 0.0, 1.0);

            // Colore del singolo mattone
            float noiseVal = random(vec3(blockId, 1.0)); // Seed diverso dal pavimento
            vec3 stoneColor = mix(u_baseColor * 0.6, u_baseColor * 1.4, noiseVal) + rockGrain;
            vec3 mortarColor = u_baseColor * 0.1;

            albedo = mix(stoneColor, mortarColor, mortar);
        }

        // --- CALCOLO LUCI (Identico alla versione precedente) ---
        float distToPlayer = length(vWorldPosition - u_playerPosition);
        float playerAura = smoothstep(10.0, 0.0, distToPlayer) * 1.2; 
        vec3 baseLight = vec3(0.02) + vec3(playerAura);
        
        vec3 baseIllumination = albedo * baseLight;

        vec3 ghostIllumination = vec3(0.0);
        for(int i = 0; i < 4; i++) {
            vec3 ghostPos = u_ghostPositions[i];
            vec3 ghostDir = u_ghostDirections[i];
            vec3 ghostColor = u_ghostColors[i];
            
            vec3 toPixel = vWorldPosition - ghostPos;
            float dist = length(toPixel);
            
            if (dist < 25.0) {
                vec3 toPixelNorm = normalize(toPixel);
                float angle = dot(toPixelNorm, ghostDir);
                
                if (angle > 0.707) {
                    if (!isOccluded(vWorldPosition, ghostPos)) {
                        float intensity = smoothstep(25.0, 0.0, dist);
                        float angularIntensity = smoothstep(0.707, 0.75, angle);
                        ghostIllumination += ghostColor * intensity * angularIntensity; 
                    }
                }
            }
        }

        vec3 finalColor = baseIllumination + (albedo * ghostIllumination * 5.0);

        gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
    }
`;
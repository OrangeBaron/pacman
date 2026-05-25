export const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
`;

export const fragmentShader = `
    uniform vec3 u_baseColor;
    uniform vec3 u_ghostPositions[4];
    uniform vec3 u_ghostDirections[4];
    uniform vec3 u_ghostColors[4]; // AGGIUNTO IL COLORE
    uniform vec3 u_playerPosition;
    
    uniform sampler2D u_mapTexture;
    uniform float u_mapSize;
    uniform float u_cellSize;
    uniform vec2 u_gridOffset;
    
    varying vec3 vWorldPosition;

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
        vec3 finalColor = u_baseColor;
        vec3 addedLight = vec3(0.0); // Ora addedLight è un vec3 (colore) e non un float

        float distToPlayer = length(vWorldPosition - u_playerPosition);
        // La luce del giocatore resta bianca
        float playerAura = smoothstep(6.0, 0.0, distToPlayer) * 0.4; 
        addedLight += vec3(playerAura); 

        for(int i = 0; i < 4; i++) {
            vec3 ghostPos = u_ghostPositions[i];
            vec3 ghostDir = u_ghostDirections[i];
            vec3 ghostColor = u_ghostColors[i]; // Prendi il colore specifico
            
            vec3 toPixel = vWorldPosition - ghostPos;
            float dist = length(toPixel);
            
            if (dist < 25.0) {
                vec3 toPixelNorm = normalize(toPixel);
                float angle = dot(toPixelNorm, ghostDir);
                
                if (angle > 0.707) {
                    if (!isOccluded(vWorldPosition, ghostPos)) {
                        float intensity = smoothstep(25.0, 0.0, dist);
                        float angularIntensity = smoothstep(0.707, 0.75, angle);
                        // Somma il colore del fantasma moltiplicato per l'intensità
                        addedLight += ghostColor * intensity * angularIntensity * 0.8; 
                    }
                }
            }
        }

        finalColor = clamp(finalColor + addedLight, 0.0, 1.0);
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;
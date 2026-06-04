export class LightManager {
    constructor(shaderUniforms) {
        // Salviamo il riferimento agli uniform dello shader
        this.uniforms = shaderUniforms;
    }

    update(playerPos, flashlightPos, flashlightDir, ghosts, weaponPickups) {
        // Aggiorna posizione giocatore
        this.uniforms.u_playerPosition.value.copy(playerPos);

        // Aggiorna torcia
        if (flashlightPos && flashlightDir) {
            this.uniforms.u_flashlightPos.value.copy(flashlightPos);
            this.uniforms.u_flashlightDir.value.copy(flashlightDir);
        }

        // --- GESTIONE DINAMICA LUCI ARMI (Le 2 più vicine) ---
        if (weaponPickups) {
            const weaponsWithDistance = weaponPickups.map(pickup => ({
                pickup: pickup,
                sqDistance: pickup.position.distanceToSquared(playerPos)
            })).sort((a, b) => a.sqDistance - b.sqDistance);

            for (let i = 0; i < 2; i++) {
                if (i < weaponsWithDistance.length) {
                    this.uniforms.u_weaponPositions.value[i].copy(weaponsWithDistance[i].pickup.position);
                } else {
                    this.uniforms.u_weaponPositions.value[i].set(0, -100, 0); // Nascondi
                }
            }
        }

        // --- GESTIONE DINAMICA LUCI FANTASMI (I 4 più vicini) ---
        if (ghosts) {
            const ghostsWithDistance = ghosts.map(ghost => ({
                ghost: ghost,
                sqDistance: ghost.mesh.position.distanceToSquared(playerPos)
            })).sort((a, b) => a.sqDistance - b.sqDistance);

            for (let i = 0; i < 4; i++) {
                if (i < ghostsWithDistance.length) {
                    const closestGhost = ghostsWithDistance[i].ghost;
                    this.uniforms.u_ghostPositions.value[i].copy(closestGhost.mesh.position);
                    this.uniforms.u_ghostPositions.value[i].y += 0.2; 
                    this.uniforms.u_ghostDirections.value[i].copy(closestGhost.getFacingDirection());
                    this.uniforms.u_ghostColors.value[i].copy(closestGhost.lightColor);
                } else {
                    this.uniforms.u_ghostPositions.value[i].set(0, -100, 0); // Nascondi
                }
            }
        }
    }
}
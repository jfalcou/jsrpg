/**
 * @fileoverview Système gérant la physique de combat, la mort et l'XP.
 */

import { defineQuery, removeEntity, hasComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Collider, Enemy, Wall, Health, HitFlash, Player, PlayerStats, EnemyStats } from '../utils/components.js';
import { buildWallHash, checkAABB } from '../utils/physics.js';

const enemyQuery = defineQuery([Enemy, Position, Collider, Health]);
const wallQuery  = defineQuery([Wall, Position, Collider]);
const playerQuery = defineQuery([Player, PlayerStats, Health]);
const playerBodyQuery = defineQuery([Player, Position, Collider, Health]);
const hitFlashQuery = defineQuery([HitFlash]);

// Tableau partagé avec render.js pour les chiffres flottants
export const damageNumbers = [];

export function spawnDamageNumber(x, y, damage, color = '#ffffff', fontSize = 18) {
    damageNumbers.push({
        x, y,
        damage: Math.floor(damage),
        color,
        fontSize,
        alpha: 1.0,
        vy: -80,
        timer: 0.8
    });
}

export function createCombatSystem() {
    return function combatSystem(world, delta) {
        const enemies = enemyQuery(world);
        const players = playerQuery(world);

        buildWallHash(world);

        // ====================================================================
        // CORRECTIF : GESTION GLOBALE DES HITFLASH (JOUEUR ET ENNEMIS CORRIGÉS)
        // ====================================================================
        const flashEntities = hitFlashQuery(world);
        for (let i = 0; i < flashEntities.length; i++) {
            const eid = flashEntities[i];
            if (HitFlash.timer[eid] > 0) {
                HitFlash.timer[eid] -= delta;
            }
        }

        // 1. IMPACTS DES ENNEMIS SUR LE JOUEUR
        const playerBodies = playerBodyQuery(world);
        if (playerBodies.length > 0) {
            const pid = playerBodies[0];

            for (let i = 0; i < enemies.length; i++) {
                const eid = enemies[i];
                if (checkAABB(
                    Position.x[pid], Position.y[pid], Collider.width[pid], Collider.height[pid],
                    Position.x[eid], Position.y[eid], Collider.width[eid], Collider.height[eid]
                )) {
                    // Lecture dynamique des dégâts depuis le composant EnemyStats
                    const dps = hasComponent(world, EnemyStats, eid) ? EnemyStats.damage[eid] : 10;
                    Health.current[pid] -= dps * delta;
                }
            }
            if (Health.current[pid] < 0) Health.current[pid] = 0;
        }

        // 2. DEATH SWEEP + DISTRIBUTION DE L'XP DYNAMIQUE
        for (let j = 0; j < enemies.length; j++) {
            const eid = enemies[j];

            if (Health.current[eid] <= 0) {

                // Calcul de l'XP dynamique avant suppression
                let xpGain = 0;
                if (hasComponent(world, EnemyStats, eid)) {
                    xpGain = EnemyStats.xpReward[eid];
                }

                removeEntity(world, eid);

                if (players.length > 0) {
                    const pid = players[0];
                    PlayerStats.xp[pid] += xpGain;

                    if (PlayerStats.xp[pid] >= PlayerStats.xpToNext[pid]) {
                        PlayerStats.xp[pid] -= PlayerStats.xpToNext[pid];
                        PlayerStats.level[pid] += 1;
                        PlayerStats.xpToNext[pid] *= 1.5;
                        Health.current[pid] = Health.max[pid];
                    }
                }
            }
        }

        return world;
    };
}
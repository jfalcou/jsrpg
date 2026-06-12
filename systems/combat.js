/**
 * @fileoverview Système gérant la physique de combat, la mort et l'XP.
 */

import { defineQuery, removeEntity, hasComponent, addEntity, addComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
// AJOUT : Import du composant Dash pour lire l'état d'esquive
import { Position, Collider, Enemy, Wall, Health, HitFlash, Player, PlayerStats, EnemyStats, Loot, Renderable, droppedItems, Dash } from '../utils/components.js';
import { buildWallHash, checkAABB } from '../utils/physics.js';
import { generateItem } from '../items/index.js';

const enemyQuery = defineQuery([Enemy, Position, Collider, Health]);
const wallQuery  = defineQuery([Wall, Position, Collider]);
const playerQuery = defineQuery([Player, PlayerStats, Health]);
const playerBodyQuery = defineQuery([Player, Position, Collider, Health]);
const hitFlashQuery = defineQuery([HitFlash]);

export const damageNumbers = [];

export function spawnDamageNumber(x, y, damage, color = '#ffffff', fontSize = 18) {
    const displayVal = typeof damage === 'string' ? damage : Math.floor(damage);
    damageNumbers.push({ x, y, damage: displayVal, color, fontSize, alpha: 1.0, vy: -80, timer: 0.8 });
}

export function createCombatSystem() {
    return function combatSystem(world, delta) {
        const enemies = enemyQuery(world);
        const players = playerQuery(world);

        buildWallHash(world);

        const flashEntities = hitFlashQuery(world);
        for (let i = 0; i < flashEntities.length; i++) {
            const eid = flashEntities[i];
            if (HitFlash.timer[eid] > 0) HitFlash.timer[eid] -= delta;
        }

        const playerBodies = playerBodyQuery(world);
        if (playerBodies.length > 0) {
            const pid = playerBodies[0];

            // AJOUT : Vérification de l'état d'invincibilité (i-frames) pendant le dash
            const isInvincible = hasComponent(world, Dash, pid) && Dash.active[pid] === 1;

            if (!isInvincible) {
                for (let i = 0; i < enemies.length; i++) {
                    const eid = enemies[i];
                    if (checkAABB(Position.x[pid], Position.y[pid], Collider.width[pid], Collider.height[pid], Position.x[eid], Position.y[eid], Collider.width[eid], Collider.height[eid])) {
                        const dps = hasComponent(world, EnemyStats, eid) ? EnemyStats.damage[eid] : 10;
                        Health.current[pid] -= dps * delta;
                    }
                }
                if (Health.current[pid] < 0) Health.current[pid] = 0;
            }
        }

        for (let j = 0; j < enemies.length; j++) {
            const eid = enemies[j];

            if (Health.current[eid] <= 0) {
                let xpGain = hasComponent(world, EnemyStats, eid) ? EnemyStats.xpReward[eid] : 25;

                // ==========================================================
                // DROPS AU SOL
                // ==========================================================
                if (Math.random() < 0.80) {
                    const dropEid = addEntity(world);
                    addComponent(world, Position, dropEid);
                    addComponent(world, Collider, dropEid);
                    addComponent(world, Renderable, dropEid);
                    addComponent(world, Loot, dropEid);

                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 50 + 40;

                    let dropX = Position.x[eid] + Math.cos(angle) * distance;
                    let dropY = Position.y[eid] + Math.sin(angle) * distance;

                    let inWall = false;
                    const walls = wallQuery(world);
                    for (let w = 0; w < walls.length; w++) {
                        const wid = walls[w];
                        if (checkAABB(dropX, dropY, 20, 20, Position.x[wid], Position.y[wid], Collider.width[wid], Collider.height[wid])) {
                            inWall = true;
                            break;
                        }
                    }

                    if (inWall) {
                        dropX = Position.x[eid];
                        dropY = Position.y[eid];
                    }

                    Position.x[dropEid] = dropX;
                    Position.y[dropEid] = dropY;
                    Collider.width[dropEid] = 20;
                    Collider.height[dropEid] = 20;
                    Renderable.type[dropEid] = 99;

                    try {
                        const pool = ['short_sword', 'health_potion'];
                        const randomBase = pool[Math.floor(Math.random() * pool.length)];
                        const itemInstance = generateItem(randomBase);
                        droppedItems.set(dropEid, itemInstance);
                    } catch (err) {
                        console.error("Erreur critique de génération du butin :", err);
                        removeEntity(world, dropEid);
                    }
                }

                removeEntity(world, eid);

                // ==========================================================
                // LOGIQUE DE LEVEL UP
                // ==========================================================
                if (players.length > 0) {
                    const pid = players[0];
                    PlayerStats.xp[pid] += xpGain;

                    while (PlayerStats.xp[pid] >= PlayerStats.xpToNext[pid]) {
                        PlayerStats.xp[pid] -= PlayerStats.xpToNext[pid];
                        PlayerStats.level[pid] += 1;

                        const nextXp = PlayerStats.xpToNext[pid] * 1.5;
                        PlayerStats.xpToNext[pid] = Math.floor(nextXp / 25) * 25;

                        Health.current[pid] = Health.max[pid]; // Soin complet

                        spawnDamageNumber(Position.x[pid], Position.y[pid] - 20, "NIVEAU SUPÉRIEUR !", "#FFD700", 24);
                    }
                }
            }
        }
        return world;
    };
}
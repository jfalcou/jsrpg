/**
 * @fileoverview Système gérant la physique de combat, la mort et l'XP.
 */

import { defineQuery, removeEntity, hasComponent, addEntity, addComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Collider, Enemy, Wall, Health, HitFlash, Player, PlayerStats, EnemyStats, Loot, Renderable, droppedItems } from '../utils/components.js';
import { buildWallHash, checkAABB } from '../utils/physics.js';
import { generateItem } from '../items/index.js';

const enemyQuery = defineQuery([Enemy, Position, Collider, Health]);
const wallQuery  = defineQuery([Wall, Position, Collider]);
const playerQuery = defineQuery([Player, PlayerStats, Health]);
const playerBodyQuery = defineQuery([Player, Position, Collider, Health]);
const hitFlashQuery = defineQuery([HitFlash]);

export const damageNumbers = [];

export function spawnDamageNumber(x, y, damage, color = '#ffffff', fontSize = 18) {
    damageNumbers.push({ x, y, damage: Math.floor(damage), color, fontSize, alpha: 1.0, vy: -80, timer: 0.8 });
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
            for (let i = 0; i < enemies.length; i++) {
                const eid = enemies[i];
                if (checkAABB(Position.x[pid], Position.y[pid], Collider.width[pid], Collider.height[pid], Position.x[eid], Position.y[eid], Collider.width[eid], Collider.height[eid])) {
                    const dps = hasComponent(world, EnemyStats, eid) ? EnemyStats.damage[eid] : 10;
                    Health.current[pid] -= dps * delta;
                }
            }
            if (Health.current[pid] < 0) Health.current[pid] = 0;
        }

        for (let j = 0; j < enemies.length; j++) {
            const eid = enemies[j];

            if (Health.current[eid] <= 0) {
                let xpGain = hasComponent(world, EnemyStats, eid) ? EnemyStats.xpReward[eid] : 0;

                // ==========================================================
                // DROPS AU SOL AVEC ANTI-COLLISION MURALE (80% drop rate)
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

                    // FIX : On vérifie si la zone d'impact prévue tape un mur
                    let inWall = false;
                    const walls = wallQuery(world);
                    for (let w = 0; w < walls.length; w++) {
                        const wid = walls[w];
                        if (checkAABB(dropX, dropY, 16, 16, Position.x[wid], Position.y[wid], Collider.width[wid], Collider.height[wid])) {
                            inWall = true;
                            break;
                        }
                    }

                    // Si l'objet tombe dans un mur, on le remet en sécurité là où le monstre est mort
                    if (inWall) {
                        dropX = Position.x[eid];
                        dropY = Position.y[eid];
                    }

                    Position.x[dropEid] = dropX;
                    Position.y[dropEid] = dropY;

                    Collider.width[dropEid] = 16;
                    Collider.height[dropEid] = 16;
                    Renderable.type[dropEid] = 99; // L'ID 99 n'écrase plus l'attaque de l'épée !

                    const pool = ['short_sword', 'health_potion'];
                    const randomBase = pool[Math.floor(Math.random() * pool.length)];
                    const itemInstance = generateItem(randomBase);

                    droppedItems.set(dropEid, itemInstance);
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
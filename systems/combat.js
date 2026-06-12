// Fichier : systems/combat.js
/**
 * @fileoverview Système gérant la physique de combat, la mort et l'XP.
 */

import { defineQuery, removeEntity, hasComponent, addEntity, addComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Collider, Enemy, Wall, Health, HitFlash, Player, PlayerStats, EnemyStats, Loot, Renderable, droppedItems, Dash, enemyTypeMap } from '../utils/components.js';
import { checkAABB } from '../utils/physics.js';
import { generateItem } from '../data/items/index.js';
import { enemyRegistry } from '../data/enemies/index.js';

const enemyQuery = defineQuery([Enemy, Position, Collider, Health]);
const wallQuery  = defineQuery([Wall, Position, Collider]);
const playerQuery = defineQuery([Player, PlayerStats, Health]);
const playerBodyQuery = defineQuery([Player, Position, Collider, Health]);
const hitFlashQuery = defineQuery([HitFlash]);

export const damageNumbers = [];

function resolveLootTable(lootTable) {
    if (!lootTable || !lootTable.items || lootTable.items.length === 0) return null;
    if (Math.random() > lootTable.dropChance) return null;

    const totalWeight = lootTable.items.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const item of lootTable.items) {
        roll -= item.weight;
        if (roll <= 0) return item;
    }
    return null;
}

export function spawnDamageNumber(x, y, damage, color = '#ffffff', fontSize = 18) {
    const displayVal = typeof damage === 'string' ? damage : Math.floor(damage);
    damageNumbers.push({ x, y, damage: displayVal, color, fontSize, alpha: 1.0, vy: -80, timer: 0.8 });
}

function spawnDropEntity(world, originX, originY, itemInstance) {
    const dropEid = addEntity(world);
    addComponent(world, Position, dropEid);
    addComponent(world, Collider, dropEid);
    addComponent(world, Renderable, dropEid);
    addComponent(world, Loot, dropEid);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 50 + 40;

    let dropX = originX + Math.cos(angle) * distance;
    let dropY = originY + Math.sin(angle) * distance;

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
        dropX = originX + (Math.random() * 16 - 8);
        dropY = originY + (Math.random() * 16 - 8);
    }

    Position.x[dropEid] = dropX;
    Position.y[dropEid] = dropY;
    Collider.width[dropEid] = 20;
    Collider.height[dropEid] = 20;
    Renderable.type[dropEid] = 99;

    droppedItems.set(dropEid, itemInstance);
}

export function createCombatSystem() {
    return function combatSystem(world, delta) {
        const enemies = enemyQuery(world);
        const players = playerQuery(world);

        const flashEntities = hitFlashQuery(world);
        for (let i = 0; i < flashEntities.length; i++) {
            const eid = flashEntities[i];
            if (HitFlash.timer[eid] > 0) HitFlash.timer[eid] -= delta;
        }

        const playerBodies = playerBodyQuery(world);
        if (playerBodies.length > 0) {
            const pid = playerBodies[0];
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
                const logicalEnemyId = enemyTypeMap.get(eid);
                const enemyDef = enemyRegistry[logicalEnemyId];

                const lootEntry = resolveLootTable(enemyDef?.lootTable);

                if (lootEntry) {
                    try {
                        const itemInstance = generateItem(lootEntry.id);
                        if (lootEntry.id === 'gold_coin' && lootEntry.goldRange) {
                            const [min, max] = lootEntry.goldRange;
                            itemInstance.amount = Math.floor(Math.random() * (max - min + 1)) + min;
                        }
                        spawnDropEntity(world, Position.x[eid], Position.y[eid], itemInstance);
                    } catch (err) {
                        console.error("Erreur loot :", err);
                    }
                }

                if (players.length > 0) {
                    const pid = players[0];
                    PlayerStats.xp[pid] += hasComponent(world, EnemyStats, eid) ? EnemyStats.xpReward[eid] : 25;

                    while (PlayerStats.xp[pid] >= PlayerStats.xpToNext[pid]) {
                        PlayerStats.xp[pid] -= PlayerStats.xpToNext[pid];
                        PlayerStats.level[pid] += 1;

                        const nextXp = PlayerStats.xpToNext[pid] * 1.5;
                        PlayerStats.xpToNext[pid] = Math.floor(nextXp / 25) * 25;

                        Health.current[pid] = Health.max[pid];

                        spawnDamageNumber(Position.x[pid], Position.y[pid] - 20, "NIVEAU SUPÉRIEUR !", "#FFD700", 24);
                    }
                }

                enemyTypeMap.delete(eid);
                removeEntity(world, eid);
            }
        }
        return world;
    };
}
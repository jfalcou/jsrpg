/**
 * @fileoverview Système gérant le ramassage des objets au sol et leur cycle de vie.
 */

import { defineQuery, exitQuery, removeEntity } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Collider, Player, Loot, droppedItems, PlayerStats } from '../utils/components.js';
import { checkAABB } from '../utils/physics.js';
import { attemptPickup } from './ui.js';
import { spawnDamageNumber } from './combat.js';
import { UI_CONFIG } from '../ui/config.js';

const playerQuery = defineQuery([Player, Position, Collider]);
const lootQuery = defineQuery([Loot, Position, Collider]);
const lootExitQuery = exitQuery(lootQuery); // Intercepte toute disparition d'entité Loot
const dropTimes = new Map();

export function createLootSystem() {
    return function lootSystem(world) {
        const exitedLoots = lootExitQuery(world);
        for (let i = 0; i < exitedLoots.length; i++) {
            const eid = exitedLoots[i];
            droppedItems.delete(eid);
            dropTimes.delete(eid);
        }

        const players = playerQuery(world);
        const loots = lootQuery(world);
        const now = Date.now();

        // 2. CYCLE DE VIE ET RAMASSAGE
        for (let i = 0; i < loots.length; i++) {
            const lid = loots[i];

            if (!dropTimes.has(lid)) {
                dropTimes.set(lid, now);
            }

            const itemAge = now - dropTimes.get(lid);

            // Expiration de l'objet
            if (itemAge > UI_CONFIG.lootExpiry) {
                removeEntity(world, lid);
                continue;
            }

            if (players.length === 0 || itemAge < 800) {
                continue;
            }

            const pid = players[0];

            if (checkAABB(
                Position.x[pid], Position.y[pid], Collider.width[pid], Collider.height[pid],
                Position.x[lid], Position.y[lid], Collider.width[lid], Collider.height[lid]
            )) {
                const itemData = droppedItems.get(lid);

                if (itemData && itemData.type === 'currency') {
                    PlayerStats.gold[pid] += itemData.amount;
                    spawnDamageNumber(Position.x[pid], Position.y[pid] - 30, `+${itemData.amount} Or`, '#FFD700', 22);
                    removeEntity(world, lid);
                }
                else if (attemptPickup(itemData)) {
                    removeEntity(world, lid);
                }
            }
        }

        return world;
    };
}
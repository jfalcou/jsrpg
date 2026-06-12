/**
 * @fileoverview Système gérant le ramassage des objets au sol et leur cycle de vie.
 */

import { defineQuery, removeEntity } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Collider, Player, Loot, droppedItems, PlayerStats } from '../utils/components.js';
import { checkAABB } from '../utils/physics.js';
import { attemptPickup } from './ui.js';
import { spawnDamageNumber } from './combat.js';
import { UI_CONFIG } from '../ui/config.js';

const playerQuery = defineQuery([Player, Position, Collider]);
const lootQuery = defineQuery([Loot, Position, Collider]);
const dropTimes = new Map();

export function createLootSystem() {
    return function lootSystem(world) {
        const players = playerQuery(world);
        const loots = lootQuery(world);
        const now = Date.now();

        for (let i = 0; i < loots.length; i++) {
            const lid = loots[i];

            if (!dropTimes.has(lid)) {
                dropTimes.set(lid, now);
            }

            const itemAge = now - dropTimes.get(lid);

            if (itemAge > UI_CONFIG.lootExpiry) {
                droppedItems.delete(lid);
                dropTimes.delete(lid);
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

                    droppedItems.delete(lid);
                    dropTimes.delete(lid);
                    removeEntity(world, lid);
                }
                else if (attemptPickup(itemData)) {
                    droppedItems.delete(lid);
                    dropTimes.delete(lid);
                    removeEntity(world, lid);
                }
            }
        }

        return world;
    };
}
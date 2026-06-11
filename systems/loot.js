/**
 * @fileoverview Système gérant le ramassage des objets au sol.
 */

import { defineQuery, removeEntity } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Collider, Player, Loot, droppedItems } from '../utils/components.js';
import { checkAABB } from '../utils/physics.js';
import { attemptPickup } from './ui.js';

const playerQuery = defineQuery([Player, Position, Collider]);
const lootQuery = defineQuery([Loot, Position, Collider]);

// NOUVEAU : Un dictionnaire pour mémoriser l'heure exacte où l'objet est tombé
const dropTimes = new Map();

export function createLootSystem() {
    return function lootSystem(world) {
        const players = playerQuery(world);
        const loots = lootQuery(world);

        if (players.length === 0) return world;
        const pid = players[0];
        const now = Date.now();

        for (let i = 0; i < loots.length; i++) {
            const lid = loots[i];

            // Enregistre l'heure d'apparition de l'objet s'il est nouveau
            if (!dropTimes.has(lid)) {
                dropTimes.set(lid, now);
            }

            // FIX MAJEUR : L'objet est intouchable pendant 0.8 seconde pour empêcher l'aspirateur
            if (now - dropTimes.get(lid) < 800) {
                continue;
            }

            if (checkAABB(
                Position.x[pid], Position.y[pid], Collider.width[pid], Collider.height[pid],
                Position.x[lid], Position.y[lid], Collider.width[lid], Collider.height[lid]
            )) {
                const itemData = droppedItems.get(lid);

                if (attemptPickup(itemData)) {
                    droppedItems.delete(lid);
                    dropTimes.delete(lid);
                    removeEntity(world, lid);
                }
            }
        }

        return world;
    };
}
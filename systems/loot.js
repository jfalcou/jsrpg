/**
 * @fileoverview Système gérant le ramassage des objets au sol.
 */

import { defineQuery, removeEntity } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Collider, Player, Loot, droppedItems } from '../utils/components.js';
import { checkAABB } from '../utils/physics.js';

const playerQuery = defineQuery([Player, Position, Collider]);
const lootQuery = defineQuery([Loot, Position, Collider]);

export function createLootSystem() {
    return function lootSystem(world) {
        const players = playerQuery(world);
        const loots = lootQuery(world);

        if (players.length === 0) return world;
        const pid = players[0];

        for (let i = 0; i < loots.length; i++) {
            const lid = loots[i];

            if (checkAABB(
                Position.x[pid], Position.y[pid], Collider.width[pid], Collider.height[pid],
                Position.x[lid], Position.y[lid], Collider.width[lid], Collider.height[lid]
            )) {
                // 1. Récupération des données JSON
                const itemData = droppedItems.get(lid);

                // 2. TEMPORAIRE : On l'affiche dans la console (bientôt on l'enverra à l'UI)
                console.log(`%c[LOOT] Tu as ramassé : ${itemData.name} (${itemData.uid})`, `color: ${itemData.color}; font-weight: bold;`);

                // 3. Nettoyage de la mémoire
                droppedItems.delete(lid);
                removeEntity(world, lid);
            }
        }

        return world;
    };
}
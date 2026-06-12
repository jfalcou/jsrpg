/**
 * @fileoverview Système global appelant les modules d'interface.
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Player, PlayerStats } from '../utils/components.js'; // Ajout de PlayerStats
import { uiState, resetUIState, getInventorySaveData } from '../ui/state.js';
import { initBagDOM, placeItemInBag, attemptPickup } from '../ui/bag.js';
import { initEquipDOM, placeItemInEquip } from '../ui/equipment.js';
import { initHudCache, initActionBar, updateHud } from '../ui/hud.js';
import { initDragDropHooks } from '../ui/dragDrop.js';

export { attemptPickup, getInventorySaveData };

const playerQuery = defineQuery([Player]);

export function createUiSystem(saveData) {
    const elName = document.getElementById('ui-char-name-title');
    if (elName && saveData.name) elName.innerText = saveData.name;

    const elRace = document.getElementById('ui-char-race');
    if (elRace && saveData.race) elRace.innerText = saveData.race;

    const elGold = document.querySelector('.gold-counter span');
    if (elGold) elGold.innerText = `Or: ${saveData.gold || 0}`;

    document.querySelectorAll('.inventory-item').forEach(el => el.remove());

    resetUIState();
    initBagDOM();
    initEquipDOM();
    initHudCache();
    initActionBar();

    initDragDropHooks(placeItemInBag, placeItemInEquip);

    if (saveData && saveData.bag) {
        saveData.bag.forEach(item => placeItemInBag(item.data, item.col, item.row));
    }
    if (saveData && saveData.equipment) {
        for (const slotId in saveData.equipment) {
            if (saveData.equipment[slotId]) placeItemInEquip(saveData.equipment[slotId], slotId);
        }
    }

    return function uiSystem(world) {
        const players = playerQuery(world);
        if (players.length === 0) return world;

        const pid = players[0];
        uiState.currentPlayerId = pid;

        updateHud(pid);

        // NOUVEAU : Mise à jour du compteur d'or
        if (elGold) {
            elGold.innerText = `Or: ${PlayerStats.gold[pid] || 0}`;
        }

        return world;
    };
}
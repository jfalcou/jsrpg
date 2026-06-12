/**
 * @fileoverview Système global appelant les modules d'interface.
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Player } from '../utils/components.js';
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
    if (elGold) elGold.innerText = 'Or: 0';

    document.querySelectorAll('.inventory-item').forEach(el => el.remove());

    // 1. Initialisation de l'état global et du DOM
    resetUIState();
    initBagDOM();
    initEquipDOM();
    initHudCache();
    initActionBar();

    // 2. Connexion du Drag&Drop pour éviter les imports circulaires
    initDragDropHooks(placeItemInBag, placeItemInEquip);

    // 3. Chargement de la sauvegarde
    if (saveData && saveData.bag) {
        saveData.bag.forEach(item => placeItemInBag(item.data, item.col, item.row));
    }
    if (saveData && saveData.equipment) {
        for (const slotId in saveData.equipment) {
            if (saveData.equipment[slotId]) placeItemInEquip(saveData.equipment[slotId], slotId);
        }
    }

    // 4. Retour de la boucle système ECS
    return function uiSystem(world) {
        const players = playerQuery(world);
        if (players.length === 0) return world;

        const pid = players[0];
        uiState.currentPlayerId = pid;

        updateHud(pid);

        return world;
    };
}
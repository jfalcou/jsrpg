import { UI_CONFIG } from './config.js';

export const uiState = {
    bagMatrix: [],
    equipmentState: {},
    itemsMap: new Map(),
    needsStatRecalc: true,
    currentPlayerId: null
};

export function resetUIState() {
    uiState.bagMatrix = Array(UI_CONFIG.bag.height).fill(null).map(() => Array(UI_CONFIG.bag.width).fill(null));
    UI_CONFIG.equipment.forEach(eq => uiState.equipmentState[eq.id] = null);
    uiState.itemsMap.clear();
    uiState.needsStatRecalc = true;
    uiState.currentPlayerId = null;
}

export function triggerStatRecalc() {
    uiState.needsStatRecalc = true;
}

export function getInventorySaveData() {
    const bagItems = [];
    uiState.itemsMap.forEach((state, uid) => {
        if (state.location === 'bag') {
            bagItems.push({ data: state.data, col: state.col, row: state.row });
        }
    });
    return { bag: bagItems, equipment: uiState.equipmentState };
}
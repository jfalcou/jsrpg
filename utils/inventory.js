/**
 * @fileoverview Fonctions utilitaires pures pour les calculs d'inventaire et de statistiques.
 */

export function canPlaceInBag(bagMatrix, bagWidth, bagHeight, col, row, itemWidth, itemHeight) {
    if (col < 0 || row < 0 || col + itemWidth > bagWidth || row + itemHeight > bagHeight) return false;
    for (let r = row; r < row + itemHeight; r++) {
        for (let c = col; c < col + itemWidth; c++) {
            if (bagMatrix[r][c] !== null) return false;
        }
    }
    return true;
}

export function findEmptySpot(bagMatrix, bagWidth, bagHeight, itemWidth, itemHeight) {
    for (let r = 0; r <= bagHeight - itemHeight; r++) {
        for (let c = 0; c <= bagWidth - itemWidth; c++) {
            if (canPlaceInBag(bagMatrix, bagWidth, bagHeight, c, r, itemWidth, itemHeight)) {
                return { col: c, row: r };
            }
        }
    }
    return null;
}

export function applyStatsCalculation(currentPlayerId, equipmentState, Attributes, BaseAttributes) {
    if (currentPlayerId === null) return;

    const statsList = ['strength', 'dexterity', 'vitality', 'energy', 'armor', 'speed', 'fireRes', 'coldRes', 'poisonRes', 'divineRes', 'darkRes'];

    statsList.forEach(stat => {
        Attributes[stat][currentPlayerId] = BaseAttributes[stat][currentPlayerId];
    });
    Attributes.bonusDps[currentPlayerId] = 0;

    for (const slotId in equipmentState) {
        const item = equipmentState[slotId];
        if (item && item.stats) {
            for (const statName in item.stats) {
                if (Attributes[statName] !== undefined) {
                    Attributes[statName][currentPlayerId] += item.stats[statName];
                }
            }
        }
    }
}
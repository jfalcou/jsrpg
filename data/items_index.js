/**
 * @fileoverview Instanciation des objets à partir des données JSON.
 */
import { GameData } from '../core/dataManager.js';

let itemCounter = 0; // Compteur pour garantir l'unicité absolue des UIDs

export function generateItem(baseId) {
    const base = GameData.items[baseId];
    if (!base) throw new Error(`Tentative de génération d'un objet inconnu : ${baseId}`);

    itemCounter++;

    return {
        uid: `item_${Date.now()}_${itemCounter}`,
        baseId: base.id,
        name: base.name,
        type: base.type,
        gridWidth: base.gridWidth,
        gridHeight: base.gridHeight,
        color: base.color,
        stats: { ...base.stats }
    };
}
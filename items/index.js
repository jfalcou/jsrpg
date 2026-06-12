/**
 * @fileoverview Registre des objets et Générateur d'instances.
 */

import short_sword from './short_sword.js';
import health_potion from './health_potion.js';
import gold_coin from './gold_coin.js';

export const itemRegistry = {
    'short_sword': short_sword,
    'health_potion': health_potion,
    'gold_coin': gold_coin
};

let itemCounter = 0; // Compteur pour garantir l'unicité absolue des UIDs

/**
 * Génère une instance unique d'un objet à partir de son fichier de base.
 * @param {string} baseId L'identifiant de la base (ex: 'short_sword')
 * @returns {Object} L'instance de l'objet prête à être glissée dans l'inventaire
 */
export function generateItem(baseId) {
    const base = itemRegistry[baseId];
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
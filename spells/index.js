/**
 * @fileoverview Registre central des sorts équipés.
 * Ajouter un sort ici suffit pour l'intégrer au jeu.
 */

import nova from './nova.js';
import sword from './sword.js';

/**
 * @type {Array<{spell: Object, cooldownRemaining: number, key: string, displayKey: string, slot: number}>}
 *
 * Chaque entrée représente un sort équipé et contient :
 * - spell : l'objet du sort (doit implémenter cast et éventuellement update, onTick, onExpire)
 * - cooldownRemaining : temps restant avant de pouvoir relancer le sort (en secondes)
 * - key : code de la touche pour lancer le sort (ex: 'KeyC' pour la touche C)
 * - displayKey : texte à afficher dans l'UI pour ce sort (ex: 'C')
 * - slot : numéro de slot (0 pour C, 1 pour V, etc.)
 */
export const equippedSpells = [
    { spell: sword, cooldownRemaining: 0, key: 'Space', displayKey: 'ESP', slot: 0 },
    { spell: nova, cooldownRemaining: 0, key: 'KeyC', displayKey: 'C', slot: 0 },
];


/**
 * Mappe les types d'effets visuels (fxType) aux définitions de sorts correspondants.
 * Utile pour le système de rendu qui doit savoir comment dessiner chaque type d'effet.
 * Seule les sorts avec un fxType défini sont inclus ici.
 */
export const fxRenderers = new Map(
    equippedSpells
        .filter(e => e.spell.fxType !== undefined)
        .map(e => [e.spell.fxType, e.spell])
);

/**
 * Récupère un sort équipé par sa touche.
 * @param {*} keyCode
 * @returns Le sort associé à la touche, ou null si aucune correspondance.
 */
export function getSpellByKey(keyCode) {
    return equippedSpells.find(s => s.key === keyCode);
}

/**
 * Met à jour les temps de recharge des sorts équipés.
 * @param {*} delta
 */
export function tickCooldowns(delta) {
    for (const entry of equippedSpells) {
        if (entry.cooldownRemaining > 0) {
            entry.cooldownRemaining -= delta;
            if (entry.cooldownRemaining < 0) entry.cooldownRemaining = 0;
        }
    }
}
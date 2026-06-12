/**
 * @fileoverview Registre central des sorts équipés.
 * Ajouter un sort ici suffit pour l'intégrer au jeu.
 */

// Les imports pointent maintenant vers le sous-dossier spells/
import nova from './nova.js';
import sword from './sword.js';

/**
 * @type {Array<{spell: Object, cooldownRemaining: number, key: string, displayKey: string, slot: number}>}
 */
export const equippedSpells = [
    { spell: sword, cooldownRemaining: 0, key: 'Space', displayKey: 'ESP', slot: 0 },
    { spell: nova, cooldownRemaining: 0, key: 'KeyC', displayKey: 'C', slot: 0 },
];

/**
 * Mappe les types d'effets visuels (fxType) aux définitions de sorts correspondants.
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

/**
 * NOUVEAU : Fonction de purge pour le Soft Reset (Game Over)
 * Remet tous les temps de recharge à zéro.
 */
export function resetCooldowns() {
    equippedSpells.forEach(s => s.cooldownRemaining = 0);
}
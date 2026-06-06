/**
 * @fileoverview Orchestrateur des sorts actifs.
 * Gère le cycle de vie complet de chaque instance de sort.
 */

const activeSpells = [];

export function castSpell(spell, world, casterId) {
    const spellState = { tickTimer: spell.tickRate || 0 };
    spell.cast(world, casterId, spellState);

    // Sorts sans update (instantanés purs) — pas besoin de tracker
    if (spell.update || spell.onTick) {
        activeSpells.push({ spell, casterId, spellState });
    }
}

export function createSpellSystem() {
    return function spellSystem(world, delta) {
        for (let i = activeSpells.length - 1; i >= 0; i--) {
            const { spell, casterId, spellState } = activeSpells[i];

            // Tick périodique (auras, poisons, buffs...)
            if (spell.onTick && spell.tickRate) {
                spellState.tickTimer -= delta;
                if (spellState.tickTimer <= 0) {
                    spell.onTick(world, casterId, spellState);
                    spellState.tickTimer = spell.tickRate;
                }
            }

            // Update frame par frame
            if (spell.update) {
                const done = spell.update(world, delta, spellState);
                if (done) {
                    if (spell.onExpire) spell.onExpire(world, casterId, spellState);
                    activeSpells.splice(i, 1);
                }
            }
        }
    }
}
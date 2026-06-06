/**
 * @fileoverview Système gérant le HUD et générant dynamiquement l'Inventaire.
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Player, Health, PlayerStats, Attributes } from '../utils/components.js';
import { equippedSpells } from '../spells/index.js';

const UI_CONFIG = {
    bag: { width: 5, height: 4 },
    equipGrid: { width: 3, height: 6 },
    equipment: [
        { id: 'helm'  , label: 'Helm'   , col: 2, row: 1, span: 1 },
        { id: 'amulet', label: 'Amulet' , col: 3, row: 1, span: 1 },
        { id: 'armor' , label: 'Torso'  , col: 2, row: 2, span: 2 },
        { id: 'belt'  , label: 'Belt'   , col: 2, row: 4, span: 1 },
        { id: 'weapon', label: 'Weapon' , col: 1, row: 2, span: 2 },
        { id: 'shield', label: 'Shield' , col: 3, row: 2, span: 2 },
        { id: 'hands',  label: 'Hands'  , col: 1, row: 4, span: 1 },
        { id: 'boots',  label: 'Feet'   , col: 3, row: 4, span: 1 },
        { id: 'ring1',  label: 'Trinket', col: 1, row: 5, span: 1 },
        { id: 'ring2',  label: 'Trinket', col: 3, row: 5, span: 1 }
    ]
};

const playerQuery = defineQuery([Player, Health, PlayerStats, Attributes]);

// CORRECTION : saveData est bien déclaré ici
export function createUiSystem(saveData) {

    // Injection du Nom et de la Race
    const nameTitle = document.getElementById('ui-char-name-title');
    const raceText = document.getElementById('ui-char-race');

    if (saveData) {
        if (nameTitle) nameTitle.innerText = saveData.name;
        if (raceText) raceText.innerText = saveData.race;
    }

    // --- 1. GÉNÉRATION DYNAMIQUE DU DOM ---
    const equipContainer = document.querySelector('.equipment');
    equipContainer.style.gridTemplateColumns = `repeat(${UI_CONFIG.equipGrid.width}, var(--grid-cell))`;

    UI_CONFIG.equipment.forEach(slot => {
        const div = document.createElement('div');
        div.className = `eq-slot ${slot.span === 2 ? 'eq-1x2' : ''}`;
        div.setAttribute('data-label', slot.label);
        div.style.gridColumn = slot.col;
        div.style.gridRow = `${slot.row} / span ${slot.span}`;
        equipContainer.appendChild(div);
    });

    const bagContainer = document.querySelector('.inventory-grid');
    bagContainer.style.gridTemplateColumns = `repeat(${UI_CONFIG.bag.width}, var(--grid-cell))`;

    const totalSlots = UI_CONFIG.bag.width * UI_CONFIG.bag.height;
    for (let i = 0; i < totalSlots; i++) {
        const div = document.createElement('div');
        div.className = 'inv-slot';
        if (i === 0) div.classList.add('has-item', 'border-legendary');
        if (i === 1) div.classList.add('has-item', 'border-rare');
        if (i === 2) div.classList.add('has-item', 'border-common');
        bagContainer.appendChild(div);
    }

    // --- 2. LIAISON AVEC LES DONNÉES DU JEU ---
    const hpBar = document.getElementById('ui-hp-bar');
    const hpText = document.getElementById('ui-hp-text');
    const xpBar = document.getElementById('ui-xp-bar');
    const xpText = document.getElementById('ui-xp-text');
    const lvlText = document.getElementById('ui-lvl');

    const strText = document.getElementById('ui-str');
    const dexText = document.getElementById('ui-dex');
    const vitText = document.getElementById('ui-vit');
    const eneText = document.getElementById('ui-ene');
    const armorText = document.getElementById('ui-armor');

    const fireResText = document.getElementById('ui-res-fire');
    const coldResText = document.getElementById('ui-res-cold');
    const poisonResText = document.getElementById('ui-res-poison');
    const divineResText = document.getElementById('ui-res-divine');
    const darkResText = document.getElementById('ui-res-dark');

    // --- 3. GÉNÉRATION DYNAMIQUE DE LA BARRE D'ACTION ---
    const actionBar = document.getElementById('action-bar');
    const cooldownOverlays = new Map();

    for (const entry of equippedSpells) {
        const slot = document.createElement('div');
        slot.className = 'skill-slot';

        const icon = document.createElement('div');
        icon.className = 'skill-icon';
        icon.style.cssText = 'display:flex; align-items:center; justify-content:center; font-size:28px;';
        icon.innerText = entry.spell.iconEmoji || '?';
        slot.appendChild(icon);

        const overlay = document.createElement('div');
        overlay.className = 'skill-cooldown hidden';
        overlay.id = `${entry.spell.id}-cd-overlay`;

        const cdText = document.createElement('span');
        cdText.id = `${entry.spell.id}-cd-text`;
        overlay.appendChild(cdText);
        slot.appendChild(overlay);

        const key = document.createElement('div');
        key.className = 'skill-key';
        key.innerText = entry.displayKey || entry.key.replace('Key', '');
        slot.appendChild(key);

        actionBar.appendChild(slot);
        cooldownOverlays.set(entry.spell.id, { overlay, text: cdText });
    }

    let lastHp = -1, lastMaxHp = -1, lastXp = -1, lastLevel = -1;

    return function uiSystem(world) {
        const players = playerQuery(world);
        if (players.length > 0) {
            const pid = players[0];

            const hp = Health.current[pid];
            const maxHp = Health.max[pid];
            if (hp !== lastHp || maxHp !== lastMaxHp) {
                const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
                hpBar.style.height = `${hpPct}%`;
                hpText.innerText = Math.floor(hp);
                lastHp = hp; lastMaxHp = maxHp;
            }

            const xp = PlayerStats.xp[pid];
            const nextXp = PlayerStats.xpToNext[pid];
            const level = PlayerStats.level[pid];
            if (xp !== lastXp || level !== lastLevel) {
                const xpPct = Math.max(0, Math.min(100, (xp / nextXp) * 100));
                xpBar.style.width = `${xpPct}%`;
                xpText.innerText = `${Math.floor(xp)}/${Math.floor(nextXp)}`;
                lvlText.innerText = level;
                lastXp = xp; lastLevel = level;
            }

            if (strText) strText.innerText = Math.floor(Attributes.strength[pid]);
            if (dexText) dexText.innerText = Math.floor(Attributes.dexterity[pid]);
            if (vitText) vitText.innerText = Math.floor(Attributes.vitality[pid]);
            if (eneText) eneText.innerText = Math.floor(Attributes.energy[pid]);
            if (armorText) armorText.innerText = Math.floor(Attributes.armor[pid]);

            if (fireResText) fireResText.innerText = `${Math.floor(Attributes.fireRes[pid])}%`;
            if (coldResText) coldResText.innerText = `${Math.floor(Attributes.coldRes[pid])}%`;
            if (poisonResText) poisonResText.innerText = `${Math.floor(Attributes.poisonRes[pid])}%`;
            if (divineResText) divineResText.innerText = `${Math.floor(Attributes.divineRes[pid])}%`;
            if (darkResText) darkResText.innerText = `${Math.floor(Attributes.darkRes[pid])}%`;

            for (const entry of equippedSpells) {
                const els = cooldownOverlays.get(entry.spell.id);
                if (!els) continue;
                if (entry.cooldownRemaining > 0) {
                    els.overlay.classList.remove('hidden');
                    els.text.innerText = entry.cooldownRemaining.toFixed(1);
                } else {
                    els.overlay.classList.add('hidden');
                }
            }
        }
        return world;
    };
}
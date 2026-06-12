import { Health, PlayerStats, Attributes, BaseAttributes } from '../utils/components.js';
import { equippedSpells } from '../data/spells/index.js';
import { uiState } from './state.js';
import { applyStatsCalculation } from '../utils/inventory.js';

// Cache des éléments du DOM
const domCache = {
    overlays: []
};

export function initHudCache() {
    domCache.hpText = document.getElementById('ui-hp-text');
    domCache.hpBar = document.getElementById('ui-hp-bar');
    domCache.xpText = document.getElementById('ui-xp-text');
    domCache.xpBar = document.getElementById('ui-xp-bar');
    domCache.lvl = document.getElementById('ui-lvl');
    domCache.str = document.getElementById('ui-str');
    domCache.dex = document.getElementById('ui-dex');
    domCache.vit = document.getElementById('ui-vit');
    domCache.ene = document.getElementById('ui-ene');
    domCache.armor = document.getElementById('ui-armor');
}

export function initActionBar() {
    const actionBar = document.getElementById('action-bar');
    if (!actionBar) return;

    actionBar.innerHTML = '';
    equippedSpells.forEach((entry) => {
        const slot = document.createElement('div');
        slot.className = 'action-slot';
        slot.style.position = 'relative';
        slot.style.width = '60px';
        slot.style.height = '60px';
        slot.style.borderRadius = '50%';
        slot.style.overflow = 'hidden';
        slot.style.border = '3px solid #555';
        slot.style.backgroundColor = '#111';
        slot.style.boxShadow = '0 4px 6px rgba(0,0,0,0.5)';

        const iconStr = entry.spell.iconEmoji || '';

        slot.innerHTML = `
            <div class="slot-key" style="position:absolute; top:4px; left:50%; transform:translateX(-50%); font-weight:bold; color:white; z-index:4; text-shadow: 1px 1px 2px black; font-size: 14px;">
                ${entry.key.replace('Key', '').replace('Digit', '')}
            </div>
            <div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size: 28px; background: radial-gradient(circle, #333 0%, #111 80%); z-index:1;">
                ${iconStr}
            </div>
            <div class="cooldown-overlay" style="position:absolute; bottom:0; left:0; width:100%; background:rgba(0,0,0,0.7); height:0%; transition: height 0.1s linear; z-index: 3;"></div>
        `;
        actionBar.appendChild(slot);
    });

    // On met en cache la liste des overlays une fois qu'ils sont générés
    domCache.overlays = actionBar.querySelectorAll('.cooldown-overlay');
}

export function updateHud(pid) {
    if (uiState.needsStatRecalc) {
        applyStatsCalculation(pid, uiState.equipmentState, Attributes, BaseAttributes);
        uiState.needsStatRecalc = false;
    }

    const hp = Math.floor(Health.current[pid]);
    const maxHp = Math.floor(Health.max[pid]);
    if (domCache.hpText) domCache.hpText.innerText = `${hp} / ${maxHp}`;
    if (domCache.hpBar) domCache.hpBar.style.height = `${(hp / maxHp) * 100}%`;

    const xp = Math.floor(PlayerStats.xp[pid]);
    const xpToNext = Math.floor(PlayerStats.xpToNext[pid]);
    if (domCache.xpText) domCache.xpText.innerText = `${xp} / ${xpToNext}`;
    if (domCache.xpBar) domCache.xpBar.style.width = `${Math.max(0, Math.min(100, (xp / xpToNext) * 100))}%`;

    if (domCache.lvl) domCache.lvl.innerText = PlayerStats.level[pid];

    if (domCache.str) domCache.str.innerText = Math.floor(Attributes.strength[pid]);
    if (domCache.dex) domCache.dex.innerText = Math.floor(Attributes.dexterity[pid]);
    if (domCache.vit) domCache.vit.innerText = Math.floor(Attributes.vitality[pid]);
    if (domCache.ene) domCache.ene.innerText = Math.floor(Attributes.energy[pid]);
    if (domCache.armor) domCache.armor.innerText = Math.floor(Attributes.armor[pid]);

    if (domCache.overlays && domCache.overlays.length > 0) {
        equippedSpells.forEach((entry, index) => {
            if (domCache.overlays[index]) {
                if (entry.cooldownRemaining > 0) {
                    const pct = (entry.cooldownRemaining / entry.spell.cooldown) * 100;
                    domCache.overlays[index].style.height = `${pct}%`;
                } else {
                    domCache.overlays[index].style.height = `0%`;
                }
            }
        });
    }
}
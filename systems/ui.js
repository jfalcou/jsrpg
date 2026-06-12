/**
 * @fileoverview Système gérant le HUD, l'Inventaire, le Drag & Drop et la Barre d'Action.
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Player, Health, PlayerStats, Attributes, BaseAttributes } from '../utils/components.js';
import { equippedSpells } from '../spells/index.js';
import { canPlaceInBag, findEmptySpot, applyStatsCalculation } from '../utils/inventory.js';

// ============================================================================
// 1. CONFIGURATION ET ÉTAT DE L'INVENTAIRE EN MÉMOIRE
// ============================================================================

const UI_CONFIG = {
    bag: { width: 5, height: 4 },
    cell: 80,
    gap: 2,
    equipment: [
        { id: 'helm'  , label: 'Tête'   , col: 2, row: 1, w: 1, h: 1 },
        { id: 'amulet', label: 'Cou'    , col: 3, row: 1, w: 1, h: 1 },
        { id: 'weapon', label: 'Arme'   , col: 1, row: 2, w: 1, h: 2 },
        { id: 'armor' , label: 'Torse'  , col: 2, row: 2, w: 1, h: 2 },
        { id: 'shield', label: 'Bouclier',col: 3, row: 2, w: 1, h: 2 },
        { id: 'hands' , label: 'Mains'  , col: 1, row: 4, w: 1, h: 1 },
        { id: 'belt'  , label: 'Taille' , col: 2, row: 4, w: 1, h: 1 },
        { id: 'boots' , label: 'Pieds'  , col: 3, row: 4, w: 1, h: 1 },
        { id: 'ring1' , label: 'Doigt'  , col: 1, row: 5, w: 1, h: 1 },
        { id: 'ring2' , label: 'Doigt'  , col: 3, row: 5, w: 1, h: 1 }
    ]
};

const STEP = UI_CONFIG.cell + UI_CONFIG.gap;

let bagMatrix = Array(UI_CONFIG.bag.height).fill(null).map(() => Array(UI_CONFIG.bag.width).fill(null));
let equipmentState = {};
UI_CONFIG.equipment.forEach(eq => equipmentState[eq.id] = null);
let itemsMap = new Map();

let currentWorld = null;
let currentPlayerId = null;
let needsStatRecalc = true;

// SÉRIALISATION POUR LA SAUVEGARDE
export function getInventorySaveData() {
    const bagItems = [];
    itemsMap.forEach((state, uid) => {
        if (state.location === 'bag') {
            bagItems.push({ data: state.data, col: state.col, row: state.row });
        }
    });
    return { bag: bagItems, equipment: equipmentState };
}

// ============================================================================
// 2. MOTEUR MATHÉMATIQUE (MATRICE 2D & STATISTIQUES)
// ============================================================================

export function attemptPickup(itemData) {
    if (!itemData || itemData.gridWidth === undefined) return false;

    const spot = findEmptySpot(bagMatrix, UI_CONFIG.bag.width, UI_CONFIG.bag.height, itemData.gridWidth, itemData.gridHeight);

    if (spot) {
        placeItemInBag(itemData, spot.col, spot.row);
        return true;
    }
    return false;
}

function recalculatePlayerStats() {
    needsStatRecalc = true;
}

// ============================================================================
// 3. MOTEUR DOM : INVENTAIRE ET DRAG & DROP
// ============================================================================

function createItemDOM(itemData) {
    const div = document.createElement('div');
    div.className = 'inventory-item';
    div.style.position = 'absolute';
    div.style.width = `${itemData.gridWidth * UI_CONFIG.cell + (itemData.gridWidth - 1) * UI_CONFIG.gap}px`;
    div.style.height = `${itemData.gridHeight * UI_CONFIG.cell + (itemData.gridHeight - 1) * UI_CONFIG.gap}px`;
    div.style.backgroundColor = itemData.color || '#ff00ff';
    div.style.border = '2px solid #d4af37';
    div.style.cursor = 'grab';
    div.style.boxSizing = 'border-box';
    div.style.zIndex = 10;

    div.innerHTML = `<span style="background:rgba(0,0,0,0.7); color:#fff; font-size:10px; padding:2px; display:block; position:absolute; top:0; left:0;">${itemData.name}</span>`;
    div.addEventListener('pointerdown', (e) => startDrag(e, itemData, div));
    return div;
}

function placeItemInBag(itemData, col, row) {
    for (let r = row; r < row + itemData.gridHeight; r++) {
        for (let c = col; c < col + itemData.gridWidth; c++) {
            bagMatrix[r][c] = itemData.uid;
        }
    }
    let state = itemsMap.get(itemData.uid);
    let div = state ? state.dom : createItemDOM(itemData);

    const safeBagContainer = document.querySelector('.inventory-grid');
    if (safeBagContainer) {
        safeBagContainer.appendChild(div);
        div.style.left = `${col * STEP}px`;
        div.style.top = `${row * STEP}px`;
    }
    itemsMap.set(itemData.uid, { data: itemData, dom: div, location: 'bag', col, row });
}

function placeItemInEquip(itemData, slotId) {
    equipmentState[slotId] = itemData;
    recalculatePlayerStats();

    let state = itemsMap.get(itemData.uid);
    let div = state ? state.dom : createItemDOM(itemData);

    const safeEquipContainer = document.querySelector('.equipment');
    if (safeEquipContainer) {
        const targetSlot = safeEquipContainer.querySelector(`[data-slot="${slotId}"]`);
        if (targetSlot) {
            targetSlot.appendChild(div);
            div.style.left = '-2px';
            div.style.top = '-2px';
        }
    }
    itemsMap.set(itemData.uid, { data: itemData, dom: div, location: 'equip', slot: slotId });
}

let draggedState = null;
let dragOffsetX = 0, dragOffsetY = 0;

function startDrag(e, itemData, div) {
    if (e.button !== 0) return;

    const state = itemsMap.get(itemData.uid);
    draggedState = { ...state };

    if (state.location === 'bag') {
        for (let r = state.row; r < state.row + itemData.gridHeight; r++) {
            for (let c = state.col; c < state.col + itemData.gridWidth; c++) {
                bagMatrix[r][c] = null;
            }
        }
    } else if (state.location === 'equip') {
        equipmentState[state.slot] = null;
        recalculatePlayerStats();
    }

    const rect = div.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    div.style.zIndex = 1000;
    div.style.cursor = 'grabbing';
    document.body.appendChild(div);

    updateDragPos(e);
    document.addEventListener('pointermove', updateDragPos);
    document.addEventListener('pointerup', endDrag);
}

function updateDragPos(e) {
    if (!draggedState) return;
    draggedState.dom.style.left = `${e.clientX - dragOffsetX}px`;
    draggedState.dom.style.top = `${e.clientY - dragOffsetY}px`;
}

function endDrag(e) {
    document.removeEventListener('pointermove', updateDragPos);
    document.removeEventListener('pointerup', endDrag);

    const { data: itemData, dom: div } = draggedState;
    div.style.zIndex = 10;
    div.style.cursor = 'grab';

    div.style.pointerEvents = 'none';
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    div.style.pointerEvents = 'auto';

    let dropSuccess = false;

    const equipSlot = targetElement ? targetElement.closest('.equip-slot') : null;
    if (equipSlot) {
        const slotId = equipSlot.dataset.slot;
        const requiredType = equipSlot.dataset.type;

        if (itemData.type === requiredType && equipmentState[slotId] === null) {
            placeItemInEquip(itemData, slotId);
            dropSuccess = true;
        }
    }

    const safeBagContainer = document.querySelector('.inventory-grid');
    if (!dropSuccess && safeBagContainer) {
        const bagRect = safeBagContainer.getBoundingClientRect();
        const itemCenterX = e.clientX - dragOffsetX + (UI_CONFIG.cell / 2);
        const itemCenterY = e.clientY - dragOffsetY + (UI_CONFIG.cell / 2);

        if (itemCenterX > bagRect.left && itemCenterX < bagRect.right &&
            itemCenterY > bagRect.top && itemCenterY < bagRect.bottom) {

            const dropCol = Math.floor((itemCenterX - bagRect.left) / STEP);
            const dropRow = Math.floor((itemCenterY - bagRect.top) / STEP);

            if (canPlaceInBag(bagMatrix, UI_CONFIG.bag.width, UI_CONFIG.bag.height, dropCol, dropRow, itemData.gridWidth, itemData.gridHeight)) {
                placeItemInBag(itemData, dropCol, dropRow);
                dropSuccess = true;
            }
        }
    }

    if (!dropSuccess) {
        if (draggedState.location === 'bag') {
            placeItemInBag(itemData, draggedState.col, draggedState.row);
        } else if (draggedState.location === 'equip') {
            placeItemInEquip(itemData, draggedState.slot);
        }
    }

    draggedState = null;
}

// ============================================================================
// 4. MOTEUR DOM : INITIALISATION DE L'INTERFACE DE JEU
// ============================================================================

const playerQuery = defineQuery([Player, Health, PlayerStats, Attributes]);

export function createUiSystem(saveData) {
    // -------------------------------------------------------------
    // FIX : Mise à jour stricte des textes fixes selon l'index.html
    // -------------------------------------------------------------
    const elName = document.getElementById('ui-char-name-title');
    if (elName && saveData.name) elName.innerText = saveData.name;

    const elRace = document.getElementById('ui-char-race');
    if (elRace && saveData.race) elRace.innerText = saveData.race;

    const elGold = document.querySelector('.gold-counter span');
    if (elGold) elGold.innerText = 'Or: 0'; // Remise à zéro de l'or codé en dur dans le HTML
    // -------------------------------------------------------------

    const bagContainer = document.querySelector('.inventory-grid');
    const equipContainer = document.querySelector('.equipment');
    const actionBar = document.getElementById('action-bar');

    document.querySelectorAll('.inventory-item').forEach(el => el.remove());
    bagMatrix = Array(UI_CONFIG.bag.height).fill(null).map(() => Array(UI_CONFIG.bag.width).fill(null));
    equipmentState = {};
    UI_CONFIG.equipment.forEach(eq => equipmentState[eq.id] = null);
    itemsMap.clear();

    if (bagContainer && equipContainer) {
        bagContainer.style.padding = '0';
        bagContainer.style.position = 'relative';
        bagContainer.style.display = 'grid';
        bagContainer.style.gridTemplateColumns = `repeat(${UI_CONFIG.bag.width}, ${UI_CONFIG.cell}px)`;
        bagContainer.style.gap = `${UI_CONFIG.gap}px`;
        bagContainer.style.width = `${UI_CONFIG.bag.width * STEP}px`;
        bagContainer.style.margin = '0 auto';
        bagContainer.innerHTML = '';

        for (let i = 0; i < UI_CONFIG.bag.width * UI_CONFIG.bag.height; i++) {
            const cell = document.createElement('div');
            cell.style.width = '100%'; cell.style.height = '100%';
            cell.style.backgroundColor = '#1a1a1a'; cell.style.border = '1px solid #333';
            bagContainer.appendChild(cell);
        }

        equipContainer.style.position = 'relative';
        equipContainer.style.display = 'grid';
        equipContainer.style.gridTemplateColumns = `repeat(3, ${UI_CONFIG.cell}px)`;
        equipContainer.style.gridTemplateRows = `repeat(5, ${UI_CONFIG.cell}px)`;
        equipContainer.style.gap = `${UI_CONFIG.gap}px`;
        equipContainer.style.width = `${3 * STEP}px`;
        equipContainer.style.margin = '0 auto';
        equipContainer.style.justifyContent = 'center';
        equipContainer.innerHTML = '';

        UI_CONFIG.equipment.forEach(eq => {
            const slot = document.createElement('div');
            slot.className = 'equip-slot';
            slot.dataset.slot = eq.id;
            slot.dataset.type = eq.id === 'ring1' || eq.id === 'ring2' ? 'ring' : eq.id;

            slot.style.boxSizing = 'border-box';
            slot.style.position = 'relative';
            slot.style.gridColumn = `${eq.col} / span ${eq.w}`;
            slot.style.gridRow = `${eq.row} / span ${eq.h}`;
            slot.style.backgroundColor = '#111';
            slot.style.border = '2px solid #444';

            slot.innerHTML = `<span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color:#555; font-size:12px; text-transform:uppercase; z-index:1; pointer-events:none; margin:0; padding:0;">${eq.label}</span>`;
            equipContainer.appendChild(slot);
        });
    }

    if (actionBar) {
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
    }

    if (saveData && saveData.bag) {
        saveData.bag.forEach(item => placeItemInBag(item.data, item.col, item.row));
    }
    if (saveData && saveData.equipment) {
        for (const slotId in saveData.equipment) {
            if (saveData.equipment[slotId]) placeItemInEquip(saveData.equipment[slotId], slotId);
        }
    }

    // ========================================================================
    // BOUCLE UI : Ciblage chirurgical au cœur de l'index.html
    // ========================================================================
    return function uiSystem(world) {
        currentWorld = world;
        const players = playerQuery(world);
        if (players.length === 0) return world;

        const pid = players[0];
        currentPlayerId = pid;

        if (needsStatRecalc) {
            applyStatsCalculation(currentPlayerId, equipmentState, Attributes, BaseAttributes);
            needsStatRecalc = false;
        }

        const hp = Math.floor(Health.current[pid]);
        const maxHp = Math.floor(Health.max[pid]);

        const elHpText = document.getElementById('ui-hp-text');
        const elHpBar = document.getElementById('ui-hp-bar');
        if (elHpText) elHpText.innerText = `${hp} / ${maxHp}`;
        if (elHpBar) elHpBar.style.height = `${(hp / maxHp) * 100}%`;

        // L'XP trouve enfin le bon conteneur !
        const xp = Math.floor(PlayerStats.xp[pid]);
        const xpToNext = Math.floor(PlayerStats.xpToNext[pid]);

        const elXpText = document.getElementById('ui-xp-text');
        const elXpBar = document.getElementById('ui-xp-bar');
        if (elXpText) elXpText.innerText = `${xp} / ${xpToNext}`;
        if (elXpBar) elXpBar.style.width = `${Math.max(0, Math.min(100, (xp / xpToNext) * 100))}%`;

        // Le Niveau trouve enfin son ID unique
        const level = PlayerStats.level[pid];
        const elLevel = document.getElementById('ui-lvl');
        if (elLevel) elLevel.innerText = level;

        // Les statistiques
        const strText = document.getElementById('ui-str');
        if (strText) strText.innerText = Math.floor(Attributes.strength[pid]);
        const dexText = document.getElementById('ui-dex');
        if (dexText) dexText.innerText = Math.floor(Attributes.dexterity[pid]);
        const vitText = document.getElementById('ui-vit');
        if (vitText) vitText.innerText = Math.floor(Attributes.vitality[pid]);
        const eneText = document.getElementById('ui-ene');
        if (eneText) eneText.innerText = Math.floor(Attributes.energy[pid]);
        const armText = document.getElementById('ui-armor');
        if (armText) armText.innerText = Math.floor(Attributes.armor[pid]);

        // La barre de sort (animée)
        if (actionBar) {
            const overlays = actionBar.querySelectorAll('.cooldown-overlay');
            equippedSpells.forEach((entry, index) => {
                if (overlays[index]) {
                    if (entry.cooldownRemaining > 0) {
                        const pct = (entry.cooldownRemaining / entry.spell.cooldown) * 100;
                        overlays[index].style.height = `${pct}%`;
                    } else {
                        overlays[index].style.height = `0%`;
                    }
                }
            });
        }

        return world;
    };
}
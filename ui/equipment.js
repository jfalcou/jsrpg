import { UI_CONFIG, STEP } from './config.js';
import { uiState, triggerStatRecalc } from './state.js';
import { createItemDOM } from './itemRenderer.js';
import { startDrag } from './dragDrop.js';

export function placeItemInEquip(itemData, slotId) {
    uiState.equipmentState[slotId] = itemData;
    triggerStatRecalc();

    let state = uiState.itemsMap.get(itemData.uid);
    let div = state ? state.dom : createItemDOM(itemData, startDrag);

    const safeEquipContainer = document.querySelector('.equipment');
    if (safeEquipContainer) {
        safeEquipContainer.appendChild(div);

        const eqConfig = UI_CONFIG.equipment.find(eq => eq.id === slotId);
        if (eqConfig) {
            div.style.left = `${(eqConfig.col - 1) * STEP}px`;
            div.style.top = `${(eqConfig.row - 1) * STEP}px`;
        }
    }
    uiState.itemsMap.set(itemData.uid, { data: itemData, dom: div, location: 'equip', slot: slotId });
}

export function initEquipDOM() {
    const equipContainer = document.querySelector('.equipment');
    if (!equipContainer) return;

    equipContainer.style.position = 'relative';
    equipContainer.style.display = 'grid';
    equipContainer.style.gridTemplateColumns = `repeat(${UI_CONFIG.equipGrid.width}, ${UI_CONFIG.cell}px)`;
    equipContainer.style.gridTemplateRows = `repeat(${UI_CONFIG.equipGrid.height}, ${UI_CONFIG.cell}px)`;
    equipContainer.style.gap = `${UI_CONFIG.gap}px`;

    const exactWidth = UI_CONFIG.equipGrid.width * UI_CONFIG.cell + (UI_CONFIG.equipGrid.width - 1) * UI_CONFIG.gap;
    const exactHeight = UI_CONFIG.equipGrid.height * UI_CONFIG.cell + (UI_CONFIG.equipGrid.height - 1) * UI_CONFIG.gap;
    equipContainer.style.width = `${exactWidth}px`;
    equipContainer.style.height = `${exactHeight}px`;

    equipContainer.style.margin = '0 auto';
    equipContainer.style.padding = '0';
    equipContainer.style.justifyContent = 'center';
    equipContainer.innerHTML = '';

    UI_CONFIG.equipment.forEach(eq => {
        const slot = document.createElement('div');

        slot.className = 'eq-slot equip-slot';
        if (eq.h === 2) {
            slot.classList.add('eq-1x2');
        }

        slot.dataset.slot = eq.id;
        slot.dataset.type = eq.id === 'ring1' || eq.id === 'ring2' ? 'ring' : eq.id;

        slot.style.gridColumn = `${eq.col} / span ${eq.w}`;
        slot.style.gridRow = `${eq.row} / span ${eq.h}`;
        slot.style.position = 'relative';

        slot.innerHTML = `<span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color:#555; font-size:12px; text-transform:uppercase; z-index:1; pointer-events:none; margin:0; padding:0; text-align:center; width:100%; font-family: 'Uncial Antiqua', cursive;">${eq.label}</span>`;

        equipContainer.appendChild(slot);
    });
}
import { UI_CONFIG, STEP } from './config.js';
import { uiState, triggerStatRecalc } from './state.js';
import { canPlaceInBag } from '../utils/inventory.js';

let draggedState = null;
let dragOffsetX = 0, dragOffsetY = 0;

// Injection de dépendances pour éviter les imports circulaires
let placeInBagCallback = null;
let placeInEquipCallback = null;

export function initDragDropHooks(bagFn, equipFn) {
    placeInBagCallback = bagFn;
    placeInEquipCallback = equipFn;
}

export function startDrag(e, itemData, div) {
    if (e.button !== 0) return;

    const state = uiState.itemsMap.get(itemData.uid);
    draggedState = { ...state };

    if (state.location === 'bag') {
        for (let r = state.row; r < state.row + itemData.gridHeight; r++) {
            for (let c = state.col; c < state.col + itemData.gridWidth; c++) {
                uiState.bagMatrix[r][c] = null;
            }
        }
    } else if (state.location === 'equip') {
        uiState.equipmentState[state.slot] = null;
        triggerStatRecalc();
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

        if (itemData.type === requiredType && uiState.equipmentState[slotId] === null) {
            if (placeInEquipCallback) placeInEquipCallback(itemData, slotId);
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

            if (canPlaceInBag(uiState.bagMatrix, UI_CONFIG.bag.width, UI_CONFIG.bag.height, dropCol, dropRow, itemData.gridWidth, itemData.gridHeight)) {
                if (placeInBagCallback) placeInBagCallback(itemData, dropCol, dropRow);
                dropSuccess = true;
            }
        }
    }

    if (!dropSuccess) {
        if (draggedState.location === 'bag') {
            if (placeInBagCallback) placeInBagCallback(itemData, draggedState.col, draggedState.row);
        } else if (draggedState.location === 'equip') {
            if (placeInEquipCallback) placeInEquipCallback(itemData, draggedState.slot);
        }
    }

    draggedState = null;
}
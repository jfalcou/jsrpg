import { UI_CONFIG, STEP } from './config.js';
import { uiState } from './state.js';
import { createItemDOM } from './itemRenderer.js';
import { findEmptySpot } from '../utils/inventory.js';
import { startDrag } from './dragDrop.js';

export function attemptPickup(itemData) {
    if (!itemData || itemData.gridWidth === undefined) return false;

    const spot = findEmptySpot(uiState.bagMatrix, UI_CONFIG.bag.width, UI_CONFIG.bag.height, itemData.gridWidth, itemData.gridHeight);

    if (spot) {
        placeItemInBag(itemData, spot.col, spot.row);
        return true;
    }
    return false;
}

export function placeItemInBag(itemData, col, row) {
    for (let r = row; r < row + itemData.gridHeight; r++) {
        for (let c = col; c < col + itemData.gridWidth; c++) {
            uiState.bagMatrix[r][c] = itemData.uid;
        }
    }
    let state = uiState.itemsMap.get(itemData.uid);
    let div = state ? state.dom : createItemDOM(itemData, startDrag);

    const safeBagContainer = document.querySelector('.inventory-grid');
    if (safeBagContainer) {
        safeBagContainer.appendChild(div);
        div.style.left = `${col * STEP}px`;
        div.style.top = `${row * STEP}px`;
    }
    uiState.itemsMap.set(itemData.uid, { data: itemData, dom: div, location: 'bag', col, row });
}

export function initBagDOM() {
    const bagContainer = document.querySelector('.inventory-grid');
    if (!bagContainer) return;

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
}
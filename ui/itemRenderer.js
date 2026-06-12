import { UI_CONFIG } from './config.js';

export function createItemDOM(itemData, onDragStartCb) {
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

    if (onDragStartCb) {
        div.addEventListener('pointerdown', (e) => onDragStartCb(e, itemData, div));
    }

    return div;
}
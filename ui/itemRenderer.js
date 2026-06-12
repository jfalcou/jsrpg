import { UI_CONFIG } from './config.js';

export function createItemDOM(itemData, onDragStartCb) {
    const div = document.createElement('div');
    div.className = 'inventory-item';

    // FIX : La position absolue doit être garantie à 100%
    div.style.position = 'absolute';
    div.style.boxSizing = 'border-box';
    div.style.border = '2px solid #d4af37';
    div.style.cursor = 'grab';
    div.style.zIndex = '10';

    // Utilisation de calc() avec les variables CSS
    div.style.width = `calc(${itemData.gridWidth} * var(--grid-cell) + ${itemData.gridWidth - 1} * var(--grid-gap))`;
    div.style.height = `calc(${itemData.gridHeight} * var(--grid-cell) + ${itemData.gridHeight - 1} * var(--grid-gap))`;
    div.style.backgroundColor = itemData.color || '#ff00ff';

    div.innerHTML = `<span style="background:rgba(0,0,0,0.7); color:#fff; font-size:10px; padding:2px; display:block; position:absolute; top:0; left:0;">${itemData.name}</span>`;

    if (onDragStartCb) {
        div.addEventListener('pointerdown', (e) => onDragStartCb(e, itemData, div));
    }

    return div;
}
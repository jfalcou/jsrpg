/**
 * @fileoverview Gestion des événements de glisser-déposer (Drag & Drop).
 */

import { UI_CONFIG, STEP } from './config.js';
import { uiState, triggerStatRecalc } from './state.js';

let draggedState = null;
let dragOffsetX = 0, dragOffsetY = 0;

let placeInBagCallback = null;
let placeInEquipCallback = null;

export function initDragDropHooks(bagFn, equipFn) {
    placeInBagCallback = bagFn;
    placeInEquipCallback = equipFn;
}

export function startDrag(e, itemData, div) {
    if (e.button !== 0) return; // Ignore le clic droit
    if (draggedState) return;   // Empêche un double drag accidentel

    const state = uiState.itemsMap.get(itemData.uid);
    draggedState = { ...state }; // Copie de sécurité de l'état initial

    // Nettoyage de la matrice pour éviter d'entrer en collision avec soi-même
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

    // Calcul du point d'accroche de la souris sur l'objet
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

    if (!draggedState) return;

    const { data: itemData, dom: div } = draggedState;
    div.style.zIndex = 10;
    div.style.cursor = 'grab';

    // Rendre l'objet transparent au clic temporairement pour voir ce qui se cache dessous
    div.style.pointerEvents = 'none';
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    div.style.pointerEvents = 'auto';

    let dropSuccess = false;

    // 1. TENTATIVE D'ÉQUIPEMENT
    const equipSlot = targetElement ? targetElement.closest('.equip-slot') : null;
    if (equipSlot) {
        const slotId = equipSlot.dataset.slot;
        const requiredType = equipSlot.dataset.type;

        if (itemData.type === requiredType && uiState.equipmentState[slotId] === null) {
            if (placeInEquipCallback) placeInEquipCallback(itemData, slotId);
            dropSuccess = true;
        }
    }

    // 2. TENTATIVE D'INVENTAIRE (Calcul stricte des bordures)
    const bagGrid = document.querySelector('.inventory-grid');
    if (!dropSuccess && bagGrid) {
        const bagRect = bagGrid.getBoundingClientRect();
        const ghostRect = div.getBoundingClientRect();

        // Calcul relatif du point haut-gauche de l'objet par rapport à la grille d'inventaire
        const relativeX = ghostRect.left - bagRect.left;
        const relativeY = ghostRect.top - bagRect.top;

        // Arrondi pour magnétiser sur la case la plus proche
        const col = Math.round(relativeX / STEP);
        const row = Math.round(relativeY / STEP);

        const isValidCol = col >= 0 && (col + itemData.gridWidth) <= UI_CONFIG.bag.width;
        const isValidRow = row >= 0 && (row + itemData.gridHeight) <= UI_CONFIG.bag.height;

        if (isValidCol && isValidRow) {
            // Vérification des collisions avec d'autres objets dans la matrice
            let isFree = true;
            for (let r = row; r < row + itemData.gridHeight; r++) {
                for (let c = col; c < col + itemData.gridWidth; c++) {
                    if (uiState.bagMatrix[r][c] !== null && uiState.bagMatrix[r][c] !== itemData.uid) {
                        isFree = false;
                        break;
                    }
                }
            }

            if (isFree) {
                if (placeInBagCallback) placeInBagCallback(itemData, col, row);
                dropSuccess = true;
            }
        }
    }

    // 3. RESTAURATION DE SÉCURITÉ SI LE DROP EST INVALIDE
    if (!dropSuccess) {
        if (draggedState.location === 'bag') {
            if (placeInBagCallback) placeInBagCallback(itemData, draggedState.col, draggedState.row);
        } else if (draggedState.location === 'equip') {
            if (placeInEquipCallback) placeInEquipCallback(itemData, draggedState.slot);
        }
    }

    draggedState = null;
}
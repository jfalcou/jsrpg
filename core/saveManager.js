/**
 * @fileoverview Gestion des sauvegardes manuelles et automatiques.
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Player, Health, PlayerStats, BaseAttributes } from '../utils/components.js';
import { Storage } from '../utils/storage.js';
import { getInventorySaveData } from '../systems/ui.js';

const playerQuery = defineQuery([Player, Health]);

export function initSaveManager(world, saveData) {
    // 1. CREATION DE L'INTERFACE DE NOTIFICATION
    let notifElement = document.getElementById('save-notif');
    if (!notifElement) {
        notifElement = document.createElement('div');
        notifElement.id = 'save-notif';
        notifElement.innerHTML = '<i>Partie Sauvegardée</i>';
        notifElement.style.color = '#d4af37';
        notifElement.style.fontFamily = '"Uncial Antiqua", cursive';
        notifElement.style.fontSize = '14px';
        notifElement.style.textAlign = 'center';
        notifElement.style.textShadow = '1px 1px 3px #000';
        notifElement.style.opacity = '0';
        notifElement.style.transform = 'translateY(10px)';
        notifElement.style.transition = 'all 0.4s ease';
        notifElement.style.pointerEvents = 'none';
        notifElement.style.paddingTop = '20px';

        const leftPanel = document.getElementById('left-panel');
        if (leftPanel) leftPanel.appendChild(notifElement);
    }

    // 2. CREATION DU BOUTON MANUEL
    let manualSaveBtn = document.getElementById('manual-save-btn');
    if (!manualSaveBtn) {
        manualSaveBtn = document.createElement('button');
        manualSaveBtn.id = 'manual-save-btn';
        manualSaveBtn.innerHTML = '📜 Sauvegarder';
        manualSaveBtn.style.padding = '10px 15px';
        manualSaveBtn.style.backgroundColor = '#111';
        manualSaveBtn.style.color = '#d4af37';
        manualSaveBtn.style.border = '1px solid #d4af37';
        manualSaveBtn.style.fontFamily = '"Uncial Antiqua", cursive';
        manualSaveBtn.style.fontSize = '16px';
        manualSaveBtn.style.cursor = 'pointer';
        manualSaveBtn.style.transition = 'all 0.2s ease-in-out';
        manualSaveBtn.style.width = '100%';
        manualSaveBtn.style.boxSizing = 'border-box';
        manualSaveBtn.style.marginTop = '10px';
        manualSaveBtn.style.touchAction = 'manipulation';

        manualSaveBtn.addEventListener('mouseenter', () => {
            manualSaveBtn.style.backgroundColor = '#222';
            manualSaveBtn.style.boxShadow = '0 0 10px rgba(212, 175, 55, 0.3)';
        });
        manualSaveBtn.addEventListener('mouseleave', () => {
            manualSaveBtn.style.backgroundColor = '#111';
            manualSaveBtn.style.boxShadow = 'none';
        });

        manualSaveBtn.addEventListener('click', () => {
            saveProgress(true);
        });

        const leftPanel = document.getElementById('left-panel');
        if (leftPanel) leftPanel.appendChild(manualSaveBtn);
    }

    // 3. LOGIQUE DE SAUVEGARDE
    function showSaveNotification() {
        if (!notifElement) return;
        notifElement.style.opacity = '1';
        notifElement.style.transform = 'translateY(0)';
        setTimeout(() => {
            notifElement.style.opacity = '0';
            notifElement.style.transform = 'translateY(10px)';
        }, 2000);
    }

    function saveProgress(isManual = false) {
        const players = playerQuery(world);
        if (players.length > 0) {
            const pid = players[0];

            if (Health.current[pid] <= 0) return; // Ne pas sauvegarder un mort

            saveData.health       = Health.current[pid];
            saveData.maxHealth    = Health.max[pid];
            saveData.level        = PlayerStats.level[pid];
            saveData.xp           = PlayerStats.xp[pid];
            saveData.xpToNext     = PlayerStats.xpToNext[pid];
            saveData.gold         = PlayerStats.gold[pid];

            saveData.attributes.str = BaseAttributes.strength[pid];
            saveData.attributes.dex = BaseAttributes.dexterity[pid];
            saveData.attributes.vit = BaseAttributes.vitality[pid];
            saveData.attributes.ene = BaseAttributes.energy[pid];

            const invData = getInventorySaveData();
            saveData.bag = invData.bag;
            saveData.equipment = invData.equipment;

            Storage.save(saveData);

            if (isManual) {
                showSaveNotification();
            }
        }
    }

    // 4. DECLENCHEURS AUTOMATIQUES
    const autoSaveInterval = setInterval(() => saveProgress(false), 5000);
    const beforeUnloadHandler = () => saveProgress(false);
    window.addEventListener('beforeunload', beforeUnloadHandler);

    // Retourne une fonction pour couper la sauvegarde facilement depuis game.js
    return function stopSaveManager() {
        clearInterval(autoSaveInterval);
        window.removeEventListener('beforeunload', beforeUnloadHandler);
    };
}
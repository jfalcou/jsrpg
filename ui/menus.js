/**
 * @fileoverview Gestion des écrans de menu HTML (Menu Principal, Sélection, Création).
 */

import { Storage } from '../utils/storage.js';
import { races, getRace } from '../data/races/index.js';

export function initMenus(onStartGame) {
    // 0. CHARGEMENT TERMINÉ : AFFICHAGE DE L'INTERFACE
    // Le loader se cache et les boutons s'affichent une fois que le JS a fini d'être lu
    const loadingIndicator = document.getElementById('loading-indicator');
    const mainMenuButtons = document.getElementById('main-menu-buttons');
    if (loadingIndicator && mainMenuButtons) {
        loadingIndicator.classList.add('hidden');
        mainMenuButtons.classList.remove('hidden');
    }

    const screenMenu     = document.getElementById('screen-main-menu');
    const screenCreation = document.getElementById('screen-char-creation');
    const screenSelect   = document.getElementById('screen-char-select');
    const btnContinue    = document.getElementById('btn-continue');
    const btnNew         = document.getElementById('btn-new');
    const btnBackToMain  = document.getElementById('btn-back-to-main');
    const btnCancel      = document.getElementById('btn-cancel');
    const btnStart       = document.getElementById('btn-start');
    const restartBtn     = document.getElementById('restart-btn');

    // --- NAVIGATION PRINCIPALE ---
    if(btnContinue) btnContinue.addEventListener('click', () => {
        screenMenu.classList.add('hidden');
        screenSelect.classList.remove('hidden');
        renderCharacterList();
    });

    if(btnBackToMain) btnBackToMain.addEventListener('click', () => {
        screenSelect.classList.add('hidden');
        screenMenu.classList.remove('hidden');
    });

    if(btnNew) btnNew.addEventListener('click', () => {
        screenMenu.classList.add('hidden');
        screenCreation.classList.remove('hidden');
        resetCreationUI();
    });

    if(btnCancel) btnCancel.addEventListener('click', () => {
        screenCreation.classList.add('hidden');
        screenMenu.classList.remove('hidden');
    });

    if(restartBtn) restartBtn.addEventListener('click', (e) => {
        e.target.innerText = "Réveil en cours...";
        e.target.style.pointerEvents = 'none';
        location.reload();
    });

    // --- LISTE DES SAUVEGARDES ---
    function renderCharacterList() {
        const listContainer = document.getElementById('char-list');
        if(!listContainer) return;
        listContainer.innerHTML = '';
        const saves = Storage.getAllSaves();

        saves.forEach(save => {
            const card = document.createElement('div');
            card.className = 'char-card';
            card.innerHTML = `
                <div class="char-info">
                    <span class="char-name-display">${save.name}</span>
                    <span class="char-meta">Level ${save.level} - ${save.race}</span>
                </div>
                <button class="btn-delete-char" data-id="${save.id}">Delete</button>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-delete-char')) return;
                onStartGame(save);
            });

            card.querySelector('.btn-delete-char').addEventListener('click', () => {
                if (confirm(`Are you sure you want to send ${save.name} to oblivion?`)) {
                    Storage.delete(save.id);
                    renderCharacterList();
                    if (!Storage.hasSaves()) {
                        screenSelect.classList.add('hidden');
                        screenMenu.classList.remove('hidden');
                        if(btnContinue) btnContinue.classList.add('hidden');
                    }
                }
            });

            listContainer.appendChild(card);
        });
    }

    // --- CRÉATION DE PERSONNAGE ---
    let ptsLeft = 5;
    let baseAttr = { str: 20, dex: 15, vit: 20, ene: 10 };
    let curAttr  = { ...baseAttr };

    function updateCreationUI() {
        const elPtsLeft = document.getElementById('pts-left');
        if(elPtsLeft) elPtsLeft.innerText = ptsLeft;
        ['str', 'dex', 'vit', 'ene'].forEach(stat => {
            const elVal = document.getElementById(`val-${stat}`);
            const elSub = document.getElementById(`sub-${stat}`);
            const elAdd = document.getElementById(`add-${stat}`);
            if(elVal) elVal.innerText = curAttr[stat];
            if(elSub) elSub.disabled = (curAttr[stat] === baseAttr[stat]);
            if(elAdd) elAdd.disabled = (ptsLeft === 0);
        });
    }

    function resetCreationUI() {
        const raceSelect = document.getElementById('char-race');
        if(!raceSelect) return;
        raceSelect.innerHTML = '';
        const all_races = Object.values(races);

        all_races.forEach(race => {
            const option = document.createElement('option');
            option.value = race.id;
            option.textContent = `${race.name}`;
            raceSelect.appendChild(option);
        });

        const raceDescription = document.querySelector('.char-race-description');
        const initialRace = getRace(raceSelect.value);
        if (initialRace && raceDescription) {
            raceDescription.textContent = initialRace.description;
        }

        const raceId   = raceSelect.value;
        const raceData = getRace(raceId);
        if(raceData) baseAttr = {
            str: raceData.baseStats.str,
            dex: raceData.baseStats.dex,
            vit: raceData.baseStats.vit,
            ene: raceData.baseStats.ene
        };
        ptsLeft  = 5;
        curAttr  = { ...baseAttr };
        const nameInput = document.getElementById('char-name');
        if(nameInput) nameInput.value = '';
        updateCreationUI();
    }

    const raceSelect = document.getElementById('char-race');
    if(raceSelect) raceSelect.addEventListener('change', () => {
        const raceId   = raceSelect.value;
        const raceData = getRace(raceId);
        const raceDescription = document.querySelector('.char-race-description');

        if (raceData && raceDescription) {
            raceDescription.classList.add('fade-out');
            setTimeout(() => {
                raceDescription.textContent = raceData.description;
                raceDescription.classList.remove('fade-out');
            }, 400);
        }

        if(raceData) baseAttr = {
            str: raceData.baseStats.str,
            dex: raceData.baseStats.dex,
            vit: raceData.baseStats.vit,
            ene: raceData.baseStats.ene
        };
        ptsLeft = 5;
        curAttr = { ...baseAttr };
        updateCreationUI();
    });

    ['str', 'dex', 'vit', 'ene'].forEach(stat => {
        const addBtn = document.getElementById(`add-${stat}`);
        const subBtn = document.getElementById(`sub-${stat}`);
        if(addBtn) addBtn.addEventListener('click', () => {
            if (ptsLeft > 0) { curAttr[stat]++; ptsLeft--; updateCreationUI(); }
        });
        if(subBtn) subBtn.addEventListener('click', () => {
            if (curAttr[stat] > baseAttr[stat]) { curAttr[stat]--; ptsLeft++; updateCreationUI(); }
        });
    });

    if(btnStart) btnStart.addEventListener('click', () => {
        const nameInput = document.getElementById('char-name');
        const name     = (nameInput && nameInput.value) ? nameInput.value : "Anonymous Champion";
        const raceId   = document.getElementById('char-race').value;
        const raceData = getRace(raceId);

        const newSave = {
            id: Date.now().toString(),
            name,
            race: raceData.name,
            raceId: raceData.id,
            level: 1,
            xp: 0,
            xpToNext: 1000,
            attributes: { ...curAttr },
            health: raceData.baseStats.hp,
            maxHealth: raceData.baseStats.hp,
            mp: raceData.baseStats.mp,
            maxMp: raceData.baseStats.mp,
            bag: [],
            equipment: {}
        };

        Storage.save(newSave);
        onStartGame(newSave);
    });
}
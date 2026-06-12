/**
 * @fileoverview Contrôleur Principal : Menus, Persistance et Moteur de Jeu.
 */

import { createWorld, addEntity, addComponent, defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Player, Enemy, Renderable, Facing, Collider, Wall, Dash, Health, Knockback, HitFlash, PlayerStats, Character, Attributes, BaseAttributes } from './utils/components.js';
import { createInputSystem } from './systems/input.js';
import { createAiSystem } from './systems/ai.js';
import { createMovementSystem } from './systems/movement.js';
import { createCombatSystem } from './systems/combat.js';
import { createSpellSystem } from './systems/spells.js';
import { createRenderSystem } from './systems/render.js';
import { createUiSystem, getInventorySaveData } from './systems/ui.js';
import { createLootSystem } from './systems/loot.js';
import { buildWallHash } from './utils/physics.js';
import { Storage } from './utils/storage.js';
import { races, getRace } from './races/index.js';
import { spawnEnemy } from './enemies/index.js';

// ============================================================================
// 1. GESTION DES MENUS & ETATS
// ============================================================================

const screenMenu     = document.getElementById('screen-main-menu');
const screenCreation = document.getElementById('screen-char-creation');
const screenSelect   = document.getElementById('screen-char-select');
const appContainer   = document.getElementById('app-container');
const btnContinue    = document.getElementById('btn-continue');
const btnNew         = document.getElementById('btn-new');
const btnBackToMain  = document.getElementById('btn-back-to-main');

btnContinue.addEventListener('click', () => {
    screenMenu.classList.add('hidden');
    screenSelect.classList.remove('hidden');
    renderCharacterList();
});

btnBackToMain.addEventListener('click', () => {
    screenSelect.classList.add('hidden');
    screenMenu.classList.remove('hidden');
});

function renderCharacterList() {
    const listContainer = document.getElementById('char-list');
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
            startGame(save);
        });

        card.querySelector('.btn-delete-char').addEventListener('click', () => {
            if (confirm(`Are you sure you want to send ${save.name} to oblivion?`)) {
                Storage.delete(save.id);
                renderCharacterList();
                if (!Storage.hasSaves()) {
                    screenSelect.classList.add('hidden');
                    screenMenu.classList.remove('hidden');
                    btnContinue.classList.add('hidden');
                }
            }
        });

        listContainer.appendChild(card);
    });
}

btnNew.addEventListener('click', () => {
    screenMenu.classList.add('hidden');
    screenCreation.classList.remove('hidden');
    resetCreationUI();
});

let ptsLeft = 5;
let baseAttr = { str: 20, dex: 15, vit: 20, ene: 10 };
let curAttr  = { ...baseAttr };

function updateCreationUI() {
    document.getElementById('pts-left').innerText = ptsLeft;
    ['str', 'dex', 'vit', 'ene'].forEach(stat => {
        document.getElementById(`val-${stat}`).innerText = curAttr[stat];
        document.getElementById(`sub-${stat}`).disabled = (curAttr[stat] === baseAttr[stat]);
        document.getElementById(`add-${stat}`).disabled = (ptsLeft === 0);
    });
}

function resetCreationUI() {
    const raceSelect = document.getElementById('char-race');
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
    if (initialRace) {
        raceDescription.textContent = initialRace.description;
    }

    raceSelect.addEventListener('change', () => {
        const selectedRace = getRace(raceSelect.value);

        if (selectedRace) {
            raceDescription.classList.add('fade-out');
            setTimeout(() => {
                raceDescription.textContent = selectedRace.description;
                raceDescription.classList.remove('fade-out');
            }, 400);
        }
    });

    const raceId   = document.getElementById('char-race').value;
    const raceData = getRace(raceId);
    baseAttr = {
        str: raceData.baseStats.str,
        dex: raceData.baseStats.dex,
        vit: raceData.baseStats.vit,
        ene: raceData.baseStats.ene
    };
    ptsLeft  = 5;
    curAttr  = { ...baseAttr };
    document.getElementById('char-name').value = '';
    updateCreationUI();
}

document.getElementById('char-race').addEventListener('change', () => {
    const raceId   = document.getElementById('char-race').value;
    const raceData = getRace(raceId);
    baseAttr = {
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
    document.getElementById(`add-${stat}`).addEventListener('click', () => {
        if (ptsLeft > 0) { curAttr[stat]++; ptsLeft--; updateCreationUI(); }
    });
    document.getElementById(`sub-${stat}`).addEventListener('click', () => {
        if (curAttr[stat] > baseAttr[stat]) { curAttr[stat]--; ptsLeft++; updateCreationUI(); }
    });
});

document.getElementById('btn-cancel').addEventListener('click', () => {
    screenCreation.classList.add('hidden');
    screenMenu.classList.remove('hidden');
});

document.getElementById('btn-start').addEventListener('click', () => {
    const name     = document.getElementById('char-name').value || "Anonymous Champion";
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
    startGame(newSave);
});

document.getElementById('restart-btn').addEventListener('click', () => location.reload());

// ============================================================================
// 2. MOTEUR DE JEU
// ============================================================================

const SCREEN_WIDTH  = 1600;
const SCREEN_HEIGHT = 900;
const WORLD_WIDTH   = 3000;
const WORLD_HEIGHT  = 3000;
const camera = { x: 0, y: 0 };

async function startGame(saveData) {
    if (saveData.health < 1) {
        saveData.health = saveData.maxHealth;
    }

    screenMenu.classList.add('hidden');
    screenCreation.classList.add('hidden');
    screenSelect.classList.add('hidden');
    appContainer.classList.remove('hidden');

    try {
        const app = new PIXI.Application();
        await app.init({
            canvas: document.getElementById('game-canvas'),
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            backgroundColor: 0x050505,
            preference: 'webgpu'
        });

        const worldContainer = new PIXI.Container();
        app.stage.addChild(worldContainer);

        const ground = new PIXI.Graphics();
        ground.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: 0x111111 });
        for (let i = 0; i <= WORLD_WIDTH; i += 100) {
            ground.moveTo(i, 0).lineTo(i, WORLD_HEIGHT).stroke({ width: 1, color: 0x222222 });
            ground.moveTo(0, i).lineTo(WORLD_WIDTH, i).stroke({ width: 1, color: 0x222222 });
        }
        worldContainer.addChild(ground);

        const world = createWorld();
        const playerQuery = defineQuery([Player, Health]);

        function createWall(x, y, w, h) {
            const wall = addEntity(world);
            addComponent(world, Wall, wall);
            addComponent(world, Position, wall);
            addComponent(world, Collider, wall);
            addComponent(world, Renderable, wall);
            Position.x[wall] = x;
            Position.y[wall] = y;
            Collider.width[wall] = w;
            Collider.height[wall] = h;
            Renderable.type[wall] = 3;
        }

        createWall(WORLD_WIDTH / 2 - 200, WORLD_HEIGHT / 2 - 100, 400, 40);
        createWall(WORLD_WIDTH / 2 - 200, WORLD_HEIGHT / 2 + 100, 400, 40);
        createWall(WORLD_WIDTH / 2 - 200, WORLD_HEIGHT / 2 - 100, 40, 240);
        buildWallHash(world);

        const hero = addEntity(world);
        addComponent(world, Player, hero);
        addComponent(world, Position, hero);
        addComponent(world, Velocity, hero);
        addComponent(world, Renderable, hero);
        addComponent(world, Facing, hero);
        addComponent(world, Collider, hero);
        addComponent(world, Dash, hero);
        addComponent(world, Character, hero);
        addComponent(world, Health, hero);
        addComponent(world, PlayerStats, hero);
        addComponent(world, BaseAttributes, hero);
        addComponent(world, Attributes, hero);

        Health.max[hero]     = saveData.maxHealth;
        Health.current[hero] = saveData.health;

        PlayerStats.level[hero]     = saveData.level;
        PlayerStats.xp[hero]        = saveData.xp;
        PlayerStats.xpToNext[hero]  = saveData.xpToNext;

        BaseAttributes.strength[hero]   = saveData.attributes.str;
        BaseAttributes.dexterity[hero]  = saveData.attributes.dex;
        BaseAttributes.vitality[hero]   = saveData.attributes.vit;
        BaseAttributes.energy[hero]     = saveData.attributes.ene;
        BaseAttributes.armor[hero]      = 50;
        BaseAttributes.speed[hero]      = 240;
        BaseAttributes.fireRes[hero]    = 10;
        BaseAttributes.coldRes[hero]    = 5;
        BaseAttributes.poisonRes[hero]  = 0;
        BaseAttributes.divineRes[hero]  = 0;
        BaseAttributes.darkRes[hero]    = 0;

        Attributes.speed[hero] = 240;

        Position.x[hero]      = WORLD_WIDTH / 2;
        Position.y[hero]      = WORLD_HEIGHT / 2;
        Facing.x[hero]        = 0;
        Facing.y[hero]        = 1;
        Collider.width[hero]  = 32;
        Collider.height[hero] = 32;
        Dash.active[hero]     = 0;
        Dash.timer[hero]      = 0;
        Dash.dirX[hero]       = 0;
        Dash.dirY[hero]       = 0;
        Dash.speed[hero]      = 0;
        Renderable.type[hero] = 0;

        for (let i = 0; i < 70; i++) {
            let ex, ey;
            do {
                ex = Math.random() * (WORLD_WIDTH - 100) + 50;
                ey = Math.random() * (WORLD_HEIGHT - 100) + 50;
            } while (Math.abs(ex - WORLD_WIDTH / 2) < 300 && Math.abs(ey - WORLD_HEIGHT / 2) < 300);

            spawnEnemy(world, 'skeleton', ex, ey);
        }

        const inputSystem    = createInputSystem();
        const aiSystem       = createAiSystem();
        const movementSystem = createMovementSystem(WORLD_WIDTH, WORLD_HEIGHT);
        const combatSystem   = createCombatSystem();
        const spellSystem    = createSpellSystem();
        const renderSystem   = createRenderSystem(app, worldContainer, camera, SCREEN_WIDTH, SCREEN_HEIGHT);
        const uiSystem       = createUiSystem(saveData);
        const lootSystem     = createLootSystem();

        // ====================================================================
        // NOUVEAU : SYSTÈME DE SAUVEGARDE MANUELLE INTÉGRÉ AU PANNEAU GAUCHE
        // ====================================================================

        // On essaie de cibler intelligemment le panneau de gauche via les stats
        const statStrElement = document.getElementById('ui-str');
        let leftPanel = document.getElementById('left-panel') || document.querySelector('.left-panel');

        if (!leftPanel && statStrElement) {
            // Si on ne trouve pas l'ID explicite, on remonte le DOM
            leftPanel = statStrElement.closest('.panel') || statStrElement.parentElement.parentElement;
        }

        // 1. Notification visuelle RPG dorée (fini le vert fluo)
        let notifElement = document.getElementById('save-notif');
        if (!notifElement) {
            notifElement = document.createElement('div');
            notifElement.id = 'save-notif';
            notifElement.innerHTML = '<i>Partie Sauvegardée</i>';
            notifElement.style.color = '#d4af37'; // Doré parchemin
            notifElement.style.fontFamily = '"Uncial Antiqua", cursive';
            notifElement.style.fontSize = '14px';
            notifElement.style.textAlign = 'center';
            notifElement.style.textShadow = '1px 1px 3px #000';
            notifElement.style.opacity = '0';
            notifElement.style.transform = 'translateY(10px)';
            notifElement.style.transition = 'all 0.4s ease';
            notifElement.style.pointerEvents = 'none';
            notifElement.style.paddingTop = '20px';

            if (leftPanel) {
                leftPanel.appendChild(notifElement);
            } else {
                notifElement.style.position = 'absolute';
                notifElement.style.bottom = '70px';
                notifElement.style.left = '20px';
                appContainer.appendChild(notifElement);
            }
        }

        // 2. Bouton de sauvegarde manuel avec icône parchemin
        let manualSaveBtn = document.getElementById('manual-save-btn');
        if (!manualSaveBtn) {
            manualSaveBtn = document.createElement('button');
            manualSaveBtn.id = 'manual-save-btn';
            manualSaveBtn.innerHTML = '📜 Sauvegarder'; // Icône parchemin demandée
            manualSaveBtn.style.padding = '10px 15px';
            manualSaveBtn.style.backgroundColor = '#111';
            manualSaveBtn.style.color = '#d4af37';
            manualSaveBtn.style.border = '1px solid #d4af37';
            manualSaveBtn.style.fontFamily = '"Uncial Antiqua", cursive';
            manualSaveBtn.style.fontSize = '16px';
            manualSaveBtn.style.cursor = 'pointer';
            manualSaveBtn.style.transition = 'all 0.2s ease-in-out';
            manualSaveBtn.style.zIndex = '1000';
            manualSaveBtn.style.width = '100%';
            manualSaveBtn.style.boxSizing = 'border-box';
            manualSaveBtn.style.marginTop = '10px';

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

            if (leftPanel) {
                leftPanel.appendChild(manualSaveBtn);
            } else {
                manualSaveBtn.style.position = 'absolute';
                manualSaveBtn.style.bottom = '20px';
                manualSaveBtn.style.left = '20px';
                manualSaveBtn.style.width = 'auto';
                appContainer.appendChild(manualSaveBtn);
            }
        }

        function showSaveNotification() {
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

                if (Health.current[pid] <= 0) return;

                saveData.health       = Health.current[pid];
                saveData.maxHealth    = Health.max[pid];
                saveData.level        = PlayerStats.level[pid];
                saveData.xp           = PlayerStats.xp[pid];
                saveData.xpToNext     = PlayerStats.xpToNext[pid];

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

        const autoSaveInterval = setInterval(() => saveProgress(false), 5000);
        window.addEventListener('beforeunload', () => saveProgress(false));

        app.ticker.add((ticker) => {
            const delta = ticker.deltaMS / 1000;

            inputSystem(world, delta);
            aiSystem(world, delta);
            movementSystem(world, delta);
            spellSystem(world, delta);
            combatSystem(world, delta);
            lootSystem(world);
            renderSystem(world, delta);
            uiSystem(world);

            const players = playerQuery(world);
            if (players.length > 0) {
                const pid = players[0];

                if (Health.current[pid] <= 0) {
                    app.ticker.stop();
                    clearInterval(autoSaveInterval);
                    window.removeEventListener('beforeunload', () => saveProgress(false));

                    saveData.health = saveData.maxHealth;
                    const invData = getInventorySaveData();
                    saveData.bag = invData.bag;
                    saveData.equipment = invData.equipment;
                    Storage.save(saveData);

                    document.getElementById('game-over').classList.remove('hidden');
                }
            }
        });

    } catch (error) {
        console.error("ERREUR FATALE :", error);
        document.body.innerHTML += `<div style="color:red; background:white; position:absolute; z-index:100;"><b>Erreur:</b> ${error.message}</div>`;
    }
}
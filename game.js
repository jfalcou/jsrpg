/**
 * @fileoverview Contrôleur Principal : Menus, Persistance et Moteur de Jeu.
 */

import { createWorld, addEntity, addComponent, defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Player, Enemy, Renderable, Facing, Collider, Wall, Dash, Health, Knockback, HitFlash, PlayerStats, Character, Attributes } from './utils/components.js';
import { createInputSystem } from './systems/input.js';
import { createAiSystem } from './systems/ai.js';
import { createMovementSystem } from './systems/movement.js';
import { createCombatSystem } from './systems/combat.js';
import { createSpellSystem } from './systems/spells.js';
import { createRenderSystem } from './systems/render.js';
import { createUiSystem } from './systems/ui.js';
import { buildWallHash } from './utils/physics.js';
import { Storage } from './utils/storage.js';

// ============================================================================
// 1. GESTION DES MENUS & ETATS (State Machine & Multi-Saves)
// ============================================================================

const screenMenu = document.getElementById('screen-main-menu');
const screenCreation = document.getElementById('screen-char-creation');
const screenSelect = document.getElementById('screen-char-select');
const appContainer = document.getElementById('app-container');

const btnContinue = document.getElementById('btn-continue');
const btnNew = document.getElementById('btn-new');
const btnBackToMain = document.getElementById('btn-back-to-main');

// BOUTON : Choisir un Héros (Ouvre la liste)
btnContinue.addEventListener('click', () => {
    screenMenu.classList.add('hidden');
    screenSelect.classList.remove('hidden');
    renderCharacterList();
});

// BOUTON : Retour au Menu Principal
btnBackToMain.addEventListener('click', () => {
    screenSelect.classList.add('hidden');
    screenMenu.classList.remove('hidden');
});

// AFFICHER LA LISTE DES PERSONNAGES
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

        // Événement : Jouer avec ce personnage
        card.addEventListener('click', (e) => {
            if(e.target.classList.contains('btn-delete-char')) return; // Ignore le clic si c'est sur supprimer
            if (save.health <= 0) save.health = save.maxHealth;
            startGame(save);
        });

        // Événement : Supprimer le personnage
        card.querySelector('.btn-delete-char').addEventListener('click', () => {
            if (confirm(`Are you sure you want to send ${save.name} to oblivion?`)) {
                Storage.delete(save.id);
                renderCharacterList(); // Rafraîchit la liste

                // S'il n'y a plus de sauvegarde, on retourne au menu
                if(!Storage.hasSaves()) {
                    screenSelect.classList.add('hidden');
                    screenMenu.classList.remove('hidden');
                    btnContinue.classList.add('hidden');
                }
            }
        });

        listContainer.appendChild(card);
    });
}

// BOUTON : Nouveau Héros
btnNew.addEventListener('click', () => {
    screenMenu.classList.add('hidden');
    screenCreation.classList.remove('hidden');
    resetCreationUI();
});

// -- Logique : Allocation des points d'attributs --
let ptsLeft = 5;
const baseAttr = { str: 20, dex: 15, vit: 20, ene: 10 };
let curAttr = { ...baseAttr };

function updateCreationUI() {
    document.getElementById('pts-left').innerText = ptsLeft;
    ['str', 'dex', 'vit', 'ene'].forEach(stat => {
        document.getElementById(`val-${stat}`).innerText = curAttr[stat];
        document.getElementById(`sub-${stat}`).disabled = (curAttr[stat] === baseAttr[stat]);
        document.getElementById(`add-${stat}`).disabled = (ptsLeft === 0);
    });
}

function resetCreationUI() {
    ptsLeft = 5;
    curAttr = { ...baseAttr };
    document.getElementById('char-name').value = '';
    updateCreationUI();
}

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

// BOUTON : Finaliser et Commencer (Création)
document.getElementById('btn-start').addEventListener('click', () => {
    const name = document.getElementById('char-name').value || "Anonymous Champion";
    const race = document.getElementById('char-race').value;

    const newSave = {
        id: Date.now().toString(), // IDENTIFIANT UNIQUE
        name,
        race,
        level: 1,
        xp: 0,
        xpToNext: 1000,
        attributes: { ...curAttr },
        health: 100,
        maxHealth: 100
    };

    Storage.save(newSave);
    startGame(newSave);
});

document.getElementById('restart-btn').addEventListener('click', () => location.reload());

// ============================================================================
// 2. MOTEUR DE JEU (PixiJS & ECS)
// ============================================================================

const SCREEN_WIDTH = 1600;
const SCREEN_HEIGHT = 900;
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;
const camera = { x: 0, y: 0 };

async function startGame(saveData) {
    screenMenu.classList.add('hidden');
    screenCreation.classList.add('hidden');
    appContainer.classList.remove('hidden');
    screenSelect.classList.add('hidden');

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

        // --- Le Héros ---
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
        addComponent(world, Attributes, hero);

        Health.max[hero] = saveData.maxHealth;
        Health.current[hero] = saveData.health;

        PlayerStats.level[hero] = saveData.level;
        PlayerStats.xp[hero] = saveData.xp;
        PlayerStats.xpToNext[hero] = saveData.xpToNext;

        Attributes.strength[hero] = saveData.attributes.str;
        Attributes.dexterity[hero] = saveData.attributes.dex;
        Attributes.vitality[hero] = saveData.attributes.vit;
        Attributes.energy[hero] = saveData.attributes.ene;

        Attributes.armor[hero] = 50;
        Attributes.fireRes[hero] = 10;
        Attributes.coldRes[hero] = 5;
        Attributes.poisonRes[hero] = 0;
        Attributes.divineRes[hero] = 0;
        Attributes.darkRes[hero] = 0;

        Position.x[hero] = WORLD_WIDTH / 2;
        Position.y[hero] = WORLD_HEIGHT / 2;
        Facing.x[hero] = 0;
        Facing.y[hero] = 1;
        Collider.width[hero] = 32;
        Collider.height[hero] = 32;
        Dash.active[hero] = 0;
        Dash.timer[hero] = 0;
        Dash.dirX[hero] = 0;
        Dash.dirY[hero] = 0;
        Dash.speed[hero] = 0;
        Renderable.type[hero] = 0;

        // --- La Horde ---
        for (let i = 0; i < 70; i++) {
            const enemy = addEntity(world);
            addComponent(world, Enemy, enemy);
            addComponent(world, Position, enemy);
            addComponent(world, Velocity, enemy);
            addComponent(world, Renderable, enemy);
            addComponent(world, Collider, enemy);
            addComponent(world, Health, enemy);
            addComponent(world, Knockback, enemy);
            addComponent(world, HitFlash, enemy);
            addComponent(world, Character, enemy);

            let ex, ey;
            do {
                ex = Math.random() * (WORLD_WIDTH - 100) + 50;
                ey = Math.random() * (WORLD_HEIGHT - 100) + 50;
            } while (Math.abs(ex - WORLD_WIDTH / 2) < 300 && Math.abs(ey - WORLD_HEIGHT / 2) < 300);

            Position.x[enemy] = ex;
            Position.y[enemy] = ey;
            Velocity.x[enemy] = 0;
            Velocity.y[enemy] = 0;
            Collider.width[enemy] = 32;
            Collider.height[enemy] = 32;
            Renderable.type[enemy] = 1;
            Health.max[enemy] = 100;
            Health.current[enemy] = 100;
            Knockback.x[enemy] = 0;
            Knockback.y[enemy] = 0;
            Knockback.elasticity[enemy] = 0.85;
            HitFlash.timer[enemy] = 0;
        }

        const inputSystem = createInputSystem();
        const aiSystem = createAiSystem();
        const movementSystem = createMovementSystem(WORLD_WIDTH, WORLD_HEIGHT);
        const combatSystem = createCombatSystem();
        const spellSystem = createSpellSystem();
        const renderSystem = createRenderSystem(app, worldContainer, camera, SCREEN_WIDTH, SCREEN_HEIGHT);

        const uiSystem = createUiSystem(saveData);

        const autoSaveInterval = setInterval(() => {
            const players = playerQuery(world);
            if(players.length > 0) {
                const pid = players[0];
                saveData.health = Health.current[pid];
                saveData.maxHealth = Health.max[pid];
                saveData.level = PlayerStats.level[pid];
                saveData.xp = PlayerStats.xp[pid];
                saveData.xpToNext = PlayerStats.xpToNext[pid];
                saveData.attributes.str = Attributes.strength[pid];
                saveData.attributes.dex = Attributes.dexterity[pid];
                saveData.attributes.vit = Attributes.vitality[pid];
                saveData.attributes.ene = Attributes.energy[pid];
                Storage.save(saveData);
            }
        }, 5000);

        app.ticker.add((ticker) => {
            const delta = ticker.deltaMS / 1000;

            inputSystem(world, delta);
            aiSystem(world, delta);
            movementSystem(world, delta);
            spellSystem(world, delta);
            combatSystem(world, delta);
            renderSystem(world, delta);
            uiSystem(world);

            const players = playerQuery(world);
            if (players.length > 0) {
                const pid = players[0];
                if (Health.current[pid] <= 0) {
                    app.ticker.stop();
                    clearInterval(autoSaveInterval);
                    document.getElementById('game-over').classList.remove('hidden');
                }
            }
        });

    } catch (error) {
        console.error("ERREUR FATALE :", error);
        document.body.innerHTML += `<div style="color:red; background:white; position:absolute; z-index:100;"><b>Erreur:</b> ${error.message}</div>`;
    }
}
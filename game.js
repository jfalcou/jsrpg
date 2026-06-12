/**
 * @fileoverview Contrôleur Principal du Moteur de Jeu.
 */

import { loadGameData } from './core/dataManager.js';
import { initEnemyRenderers } from './data/enemies_index.js';

import { initMenus } from './ui/menus.js';
import { initSaveManager } from './core/saveManager.js';
import { spawnPlayer } from './core/player.js';
import { loadLevel } from './core/levelManager.js';

import { createWorld, defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Player, Health } from './utils/components.js';

import { createInputSystem } from './systems/input.js';
import { createAiSystem } from './systems/ai.js';
import { createLifetimeSystem } from './systems/lifetime.js';
import { createMovementSystem } from './systems/movement.js';
import { createCombatSystem, resetCombat } from './systems/combat.js';
import { createSpellSystem, resetSpells } from './systems/spells.js';
import { createRenderSystem } from './systems/render.js';
import { createUiSystem, getInventorySaveData } from './systems/ui.js';
import { createLootSystem } from './systems/loot.js';

import { Storage } from './utils/storage.js';

// IMPORTS DE NETTOYAGE (Soft Reset)
import { resetComponents } from './utils/components.js';
import { resetPhysics } from './utils/physics.js';
import { resetCooldowns } from './data/spells/index.js';

const SCREEN_WIDTH  = 1600;
const SCREEN_HEIGHT = 900;
const WORLD_WIDTH   = 3000;
const WORLD_HEIGHT  = 3000;
const camera = { x: 0, y: 0 };

// 1. VARIABLES GLOBALES DE L'APPLICATION
const app = new PIXI.Application();
let currentTickerCallback = null;

// 2. SÉQUENCE D'AMORÇAGE (BOOTSTRAP) - Exécutée une seule fois
async function bootstrap() {
    try {
        await app.init({
            canvas: document.getElementById('game-canvas'),
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            backgroundColor: 0x050505,
            preference: 'webgpu'
        });

        await loadGameData();
        initEnemyRenderers();
        initMenus(startGame);

        const loadingIndicator = document.getElementById('loading-indicator');
        const mainMenuButtons = document.getElementById('main-menu-buttons');
        if (loadingIndicator && mainMenuButtons) {
            loadingIndicator.classList.add('hidden');
            mainMenuButtons.classList.remove('hidden');
        }
    } catch (e) {
        console.error("Échec du démarrage :", e);
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.innerText = "Erreur critique au lancement.";
            loadingIndicator.style.animation = "none";
            loadingIndicator.style.color = "#ff4136";
        }
    }
}

bootstrap();

// 3. LANCEMENT D'UNE PARTIE
async function startGame(saveData) {
    if (saveData.health < 1) {
        saveData.health = saveData.maxHealth;
    }

    // A. PURGE DE L'ÉTAT PRÉCÉDENT (Soft Reset)
    resetComponents();
    resetPhysics();
    resetSpells();
    resetCombat();
    resetCooldowns();

    if (currentTickerCallback) {
        app.ticker.remove(currentTickerCallback);
        currentTickerCallback = null;
    }

    app.stage.removeChildren(); // Vider le canvas PixiJS précédent

    // B. INITIALISATION DE L'INTERFACE HTML
    document.getElementById('screen-main-menu').classList.add('hidden');
    document.getElementById('screen-char-creation').classList.add('hidden');
    document.getElementById('screen-char-select').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

    try {
        const worldContainer = new PIXI.Container();
        app.stage.addChild(worldContainer);

        // Dessin du sol
        const ground = new PIXI.Graphics();
        ground.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: 0x111111 });
        for (let i = 0; i <= WORLD_WIDTH; i += 100) {
            ground.moveTo(i, 0).lineTo(i, WORLD_HEIGHT).stroke({ width: 1, color: 0x222222 });
            ground.moveTo(0, i).lineTo(WORLD_WIDTH, i).stroke({ width: 1, color: 0x222222 });
        }
        worldContainer.addChild(ground);

        // C. CREATION DE LA LOGIQUE
        const world = createWorld();
        const playerQuery = defineQuery([Player, Health]);

        loadLevel(world, 'test_level', WORLD_WIDTH, WORLD_HEIGHT);
        spawnPlayer(world, saveData, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);

        const inputSystem    = createInputSystem();
        const aiSystem       = createAiSystem();
        const lifetimeSystem = createLifetimeSystem();
        const movementSystem = createMovementSystem(WORLD_WIDTH, WORLD_HEIGHT);
        const combatSystem   = createCombatSystem();
        const spellSystem    = createSpellSystem();
        const renderSystem   = createRenderSystem(app, worldContainer, camera, SCREEN_WIDTH, SCREEN_HEIGHT);
        const uiSystem       = createUiSystem(saveData);
        const lootSystem     = createLootSystem();

        const stopSaveManager = initSaveManager(world, saveData);

        // D. DÉFINITION DE LA BOUCLE DE JEU
        currentTickerCallback = (ticker) => {
            const delta = ticker.deltaMS / 1000;

            inputSystem(world, delta);
            aiSystem(world, delta);
            lifetimeSystem(world, delta);
            movementSystem(world, delta);
            spellSystem(world, delta);
            combatSystem(world, delta);
            lootSystem(world);
            renderSystem(world, delta);
            uiSystem(world);

            // GESTION DU GAME OVER
            const players = playerQuery(world);
            if (players.length > 0) {
                const pid = players[0];

                if (Health.current[pid] <= 0) {
                    // Arrêt propre
                    app.ticker.remove(currentTickerCallback);
                    currentTickerCallback = null;
                    stopSaveManager();

                    // Sauvegarde post-mortem
                    saveData.health = saveData.maxHealth;
                    const invData = getInventorySaveData();
                    saveData.bag = invData.bag;
                    saveData.equipment = invData.equipment;
                    Storage.save(saveData);

                    document.getElementById('game-over').classList.remove('hidden');

                    // ACTION DU BOUTON RESTART
                    document.getElementById('restart-btn').onclick = () => {
                        document.getElementById('game-over').classList.add('hidden');
                        document.getElementById('app-container').classList.add('hidden');
                        document.getElementById('screen-main-menu').classList.remove('hidden');

                        // Purge de la mémoire GPU de PixiJS pour l'ancien niveau
                        worldContainer.destroy({ children: true });

                        // Mise à jour du menu selon l'état des sauvegardes
                        if (Storage.hasSaves()) {
                            document.getElementById('btn-continue').classList.remove('hidden');
                        } else {
                            document.getElementById('btn-continue').classList.add('hidden');
                        }
                    };
                }
            }
        };

        app.ticker.add(currentTickerCallback);

    } catch (error) {
        console.error("ERREUR FATALE :", error);
        document.body.innerHTML += `<div style="color:red; background:white; position:absolute; z-index:100;"><b>Erreur:</b> ${error.message}</div>`;
    }
}
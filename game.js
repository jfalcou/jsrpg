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
import { createCombatSystem } from './systems/combat.js';
import { createSpellSystem } from './systems/spells.js';
import { createRenderSystem } from './systems/render.js';
import { createUiSystem, getInventorySaveData } from './systems/ui.js';
import { createLootSystem } from './systems/loot.js';

import { Storage } from './utils/storage.js';

const SCREEN_WIDTH  = 1600;
const SCREEN_HEIGHT = 900;
const WORLD_WIDTH   = 3000;
const WORLD_HEIGHT  = 3000;
const camera = { x: 0, y: 0 };

// SÉQUENCE D'AMORÇAGE (BOOTSTRAP)
async function bootstrap() {
    try {
        // 1. Charger tous les fichiers JSON
        await loadGameData();

        // 2. Lier la data chargée aux scripts graphiques
        initEnemyRenderers();

        // 3. Activer les menus qui ont désormais accès aux données
        initMenus(startGame);

        // 4. Interface prête : Révéler les boutons
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
            loadingIndicator.innerText = "Erreur critique de la base de données.";
            loadingIndicator.style.animation = "none";
            loadingIndicator.style.color = "#ff4136";
        }
    }
}

// Lancement du jeu
bootstrap();

async function startGame(saveData) {
    if (saveData.health < 1) {
        saveData.health = saveData.maxHealth;
    }

    document.getElementById('screen-main-menu').classList.add('hidden');
    document.getElementById('screen-char-creation').classList.add('hidden');
    document.getElementById('screen-char-select').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');

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

        // Dessin de la grille du sol
        const ground = new PIXI.Graphics();
        ground.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: 0x111111 });
        for (let i = 0; i <= WORLD_WIDTH; i += 100) {
            ground.moveTo(i, 0).lineTo(i, WORLD_HEIGHT).stroke({ width: 1, color: 0x222222 });
            ground.moveTo(0, i).lineTo(WORLD_WIDTH, i).stroke({ width: 1, color: 0x222222 });
        }
        worldContainer.addChild(ground);

        const world = createWorld();
        const playerQuery = defineQuery([Player, Health]);

        // Initialisation de l'environnement (Murs et Ennemis)
        loadLevel(world, 'test_level', WORLD_WIDTH, WORLD_HEIGHT);

        // Initialisation du Joueur
        spawnPlayer(world, saveData, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);

        // Initialisation des Systèmes ECS
        const inputSystem    = createInputSystem();
        const aiSystem       = createAiSystem();
        const lifetimeSystem = createLifetimeSystem();
        const movementSystem = createMovementSystem(WORLD_WIDTH, WORLD_HEIGHT);
        const combatSystem   = createCombatSystem();
        const spellSystem    = createSpellSystem();
        const renderSystem   = createRenderSystem(app, worldContainer, camera, SCREEN_WIDTH, SCREEN_HEIGHT);
        const uiSystem       = createUiSystem(saveData);
        const lootSystem     = createLootSystem();

        // Initialisation du gestionnaire de sauvegarde
        const stopSaveManager = initSaveManager(world, saveData);

        // --- BOUCLE PRINCIPALE ---
        app.ticker.add((ticker) => {
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

            // Vérification de Game Over
            const players = playerQuery(world);
            if (players.length > 0) {
                const pid = players[0];

                if (Health.current[pid] <= 0) {
                    app.ticker.stop();
                    stopSaveManager(); // Arrête l'autosave

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
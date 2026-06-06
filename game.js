/**
 * @fileoverview Point d'entrée de l'application (Résolution HD).
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

const SCREEN_WIDTH = 1600;
const SCREEN_HEIGHT = 900;
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;
const camera = { x: 0, y: 0 };

async function bootstrap() {
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

        Health.max[hero] = 100;
        Health.current[hero] = 100;

        PlayerStats.level[hero] = 1;
        PlayerStats.xp[hero] = 0;
        PlayerStats.xpToNext[hero] = 1000;

        Attributes.strength[hero] = 25;
        Attributes.dexterity[hero] = 15;
        Attributes.vitality[hero] = 20;
        Attributes.energy[hero] = 10;
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
        const uiSystem = createUiSystem();

        // Écran Game Over
        const gameOverScreen = document.createElement('div');
        gameOverScreen.id = 'game-over';
        gameOverScreen.innerHTML = `
            <h1>GAME OVER</h1>
            <button id="restart-btn">Recommencer</button>
        `;
        gameOverScreen.style.display = 'none';
        document.getElementById('center-panel').appendChild(gameOverScreen);
        document.getElementById('restart-btn').addEventListener('click', () => location.reload());

        app.ticker.add((ticker) => {
            const delta = ticker.deltaMS / 1000;

            inputSystem(world, delta);
            aiSystem(world, delta);
            movementSystem(world, delta);
            spellSystem(world, delta);   // après movement, avant combat
            combatSystem(world, delta);
            renderSystem(world, delta);
            uiSystem(world);

            // Game over check
            const players = playerQuery(world);
            if (players.length > 0) {
                const pid = players[0];
                if (Health.current[pid] <= 0) {
                    app.ticker.stop();
                    document.getElementById('game-over').style.display = 'flex';
                }
            }
        });

    } catch (error) {
        console.error("ERREUR FATALE :", error);
        document.body.innerHTML += `<div style="color:red; background:white; position:absolute; z-index:100;"><b>Erreur:</b> ${error.message}</div>`;
    }
}

bootstrap();
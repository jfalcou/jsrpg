/**
 * @fileoverview Instanciation des ennemis et registre des scripts visuels.
 */
import { addEntity, addComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Facing, Enemy, Renderable, Collider, Health, Knockback, HitFlash, Character, AiTracker, EnemyStats, enemyTypeMap, State, STATES } from '../utils/components.js';
import { GameData } from '../core/dataManager.js';

// REGISTRE DES SCRIPTS (La logique graphique qui ne va pas dans le JSON)
export const enemyScripts = {
    'skeleton': {
        setupVisual: function(body) {
            body.rect(0, 0, 32, 32).fill({ color: 0xDDDDDD });
            body.stroke({ width: 2, color: 0x888888 });
            body.rect(6, 6, 6, 6).fill({ color: 0xFF0000 });
            body.rect(20, 6, 6, 6).fill({ color: 0xFF0000 });
        }
    }
};

export const enemyRenderers = new Map();

// Initialisé par le bootloader une fois les JSON chargés
export function initEnemyRenderers() {
    Object.values(GameData.enemies).forEach(def => {
        enemyRenderers.set(def.renderType, def);
    });
}

export function spawnEnemy(world, typeId, x, y) {
    const def = GameData.enemies[typeId];
    if (!def) throw new Error(`Tentative d'invocation d'un ennemi inconnu : ${typeId}`);

    const eid = addEntity(world);

    addComponent(world, Enemy, eid);
    addComponent(world, Position, eid);
    addComponent(world, Velocity, eid);
    addComponent(world, Renderable, eid);
    addComponent(world, Collider, eid);
    addComponent(world, Health, eid);
    addComponent(world, Knockback, eid);
    addComponent(world, HitFlash, eid);
    addComponent(world, Character, eid);
    addComponent(world, EnemyStats, eid);
    addComponent(world, State, eid);
    addComponent(world, Facing, eid);

    State.current[eid] = STATES.IDLE;
    Position.x[eid] = x;
    Position.y[eid] = y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;

    Collider.width[eid] = def.physics.width;
    Collider.height[eid] = def.physics.height;

    Renderable.type[eid] = def.renderType;

    Health.max[eid] = def.stats.hp;
    Health.current[eid] = def.stats.hp;

    EnemyStats.xpReward[eid] = def.stats.xp;
    EnemyStats.damage[eid] = def.stats.damage;
    Facing.x[eid] = 0;
    Facing.y[eid] = 1;
    Knockback.x[eid] = 0;
    Knockback.y[eid] = 0;
    Knockback.elasticity[eid] = def.physics.knockbackElasticity;

    HitFlash.timer[eid] = 0;

    if (def.aiProfile === 'tracker') {
        addComponent(world, AiTracker, eid);
        AiTracker.speed[eid] = def.stats.speed;
        AiTracker.activationRadius[eid] = 800;
        AiTracker.deactivationRadius[eid] = 1000;
    }

    enemyTypeMap.set(eid, typeId);

    return eid;
}
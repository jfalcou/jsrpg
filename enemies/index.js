/**
 * @fileoverview Registre et Factory d'instanciation des ennemis.
 */

import { addEntity, addComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Enemy, Renderable, Collider, Health, Knockback, HitFlash, Character, AiTracker, EnemyStats } from '../utils/components.js';
import skeleton from './skeleton.js';

// Le registre global (dictionnaire logique)
export const enemyRegistry = {
    'skeleton': skeleton
};

// NOUVEAU : Le registre visuel pour le système de rendu (associe renderType -> logique visuelle)
export const enemyRenderers = new Map(
    Object.values(enemyRegistry).map(def => [def.renderType, def])
);

export function spawnEnemy(world, typeId, x, y) {
    const def = enemyRegistry[typeId];
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

    Position.x[eid] = x;
    Position.y[eid] = y;
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;

    Collider.width[eid] = def.physics.width;
    Collider.height[eid] = def.physics.height;

    // Utilisation de l'ID visuel défini dans le fichier
    Renderable.type[eid] = def.renderType;

    Health.max[eid] = def.stats.hp;
    Health.current[eid] = def.stats.hp;

    EnemyStats.xpReward[eid] = def.stats.xp;
    EnemyStats.damage[eid] = def.stats.damage;

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

    return eid;
}
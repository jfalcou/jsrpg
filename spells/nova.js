/**
 * @fileoverview Sort : Nova Sacrée
 * Onde de choc circulaire qui repousse et blesse les ennemis proches.
 */

import { addEntity, addComponent, defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, NovaFx, Renderable, Enemy, Health, Knockback, HitFlash, Collider } from '../utils/components.js';
import { hasWallBetween } from '../utils/physics.js';

const enemyQuery = defineQuery([Enemy, Position, Health, Collider]);

export default {
    id: 'nova',
    name: 'Nova Sacrée',
    icon: 'bg-nova',
    iconEmoji: '✨',
    cooldown: 3.0,
    duration: null,
    tickRate: null,
    type: 'aoe',

    cast(world, casterId, state) {
        const px = Position.x[casterId] + 16;
        const py = Position.y[casterId] + 16;

        // Création de l'entité FX
        const fx = addEntity(world);
        addComponent(world, Position, fx);
        addComponent(world, NovaFx, fx);
        addComponent(world, Renderable, fx);

        Position.x[fx] = px;
        Position.y[fx] = py;
        NovaFx.radius[fx] = 32;
        NovaFx.alpha[fx] = 1.0;
        Renderable.type[fx] = 4;

        // State partagé entre cast et update
        state.fxId = fx;
        state.hitEnemies = new Set();
    },

    update(world, delta, state) {
        const nid = state.fxId;

        // Expansion et fondu
        NovaFx.radius[nid] += 400 * delta;
        NovaFx.alpha[nid] -= 2.0 * delta;

        const enemies = enemyQuery(world);
        for (let i = 0; i < enemies.length; i++) {
            const eid = enemies[i];

            const ex = Position.x[eid] + 16;
            const ey = Position.y[eid] + 16;
            const dx = ex - Position.x[nid];
            const dy = ey - Position.y[nid];
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= NovaFx.radius[nid]) {
                if (!hasWallBetween(Position.x[nid], Position.y[nid], ex, ey)) {
                    // Dégâts progressifs
                    Health.current[eid] -= 40 * delta;
                    HitFlash.timer[eid] = 0.08;

                    // Knockback une seule fois
                    if (!state.hitEnemies.has(eid)) {
                        state.hitEnemies.add(eid);
                        if (dist > 0) {
                            Knockback.x[eid] = (dx / dist) * 800;
                            Knockback.y[eid] = (dy / dist) * 800;
                        }
                    }
                }
            }
        }

        // Retourne true quand la nova est expirée
        if (NovaFx.alpha[nid] <= 0) {
            return true;
        }

        return false;
    },

    onExpire(world, casterId, state) {
        // L'entité FX est déjà retirée par le combat_system via exitQuery
        // On nettoie juste le Set
        state.hitEnemies.clear();
    }
}
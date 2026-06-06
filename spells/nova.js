/**
 * @fileoverview Sort : Nova Sacrée
 */

import { addEntity, addComponent, defineQuery, removeEntity } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, NovaFx, Renderable, Enemy, Health, Knockback, HitFlash, Collider } from '../utils/components.js';
import { hasWallBetween } from '../utils/physics.js';
import { spawnDamageNumber } from '../systems/combat.js';

const enemyQuery = defineQuery([Enemy, Position, Health, Collider]);

export default {
    id: 'nova',
    name: 'Nova Sacrée',
    iconEmoji: '✨',
    cooldown: 3.0,
    type: 'aoe',
    fxType: 4,

    cast(world, casterId, state) {
        const px = Position.x[casterId] + 16;
        const py = Position.y[casterId] + 16;

        const fx = addEntity(world);
        addComponent(world, Position, fx);
        addComponent(world, NovaFx, fx);
        addComponent(world, Renderable, fx);

        Position.x[fx] = px;
        Position.y[fx] = py;
        NovaFx.radius[fx] = 32;
        NovaFx.alpha[fx] = 1.0;
        Renderable.type[fx] = this.fxType;

        state.fxId = fx;
        state.hitEnemies = new Set();
        state.tickTimer = 0.2;  // Affiche les dégâts toutes les 0.2s
    },

    update(world, delta, state) {
        const nid = state.fxId;

        NovaFx.radius[nid] += 400 * delta;
        NovaFx.alpha[nid] -= 2.0 * delta;

        // On décrémente le timer d'affichage
        state.tickTimer -= delta;
        const shouldDisplay = state.tickTimer <= 0;
        if (shouldDisplay) state.tickTimer = 0.2;

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
                    const dmg = 40 * delta;
                    Health.current[eid] -= dmg;
                    HitFlash.timer[eid] = 0.08;

                    // Affiche le total sur 0.2s toutes les 0.2s
                    if (shouldDisplay) {
                        spawnDamageNumber(ex, Position.y[eid], 40 * 0.2, '#00FFFF', 28);
                    }

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

        if (NovaFx.alpha[nid] <= 0) {
            removeEntity(world, nid);
            return true;
        }
        return false;
    },

    renderFx(body, eid) {
        body.clear();
        const r = Math.max(1, NovaFx.radius[eid]);
        const a = Math.max(0, NovaFx.alpha[eid]);
        body.circle(0, 0, r)
            .fill({ color: 0x00FFFF, alpha: a * 0.2 })
            .stroke({ width: 6, color: 0x00FFFF, alpha: a });
    },

    onExpire(world, casterId, state) {
        state.hitEnemies.clear();
    }
}
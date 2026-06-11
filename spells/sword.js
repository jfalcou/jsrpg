/**
 * @fileoverview Sort : Coup d'Épée
 */

import { addEntity, addComponent, defineQuery, removeEntity } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Facing, SwordFx, Renderable, Enemy, Health, Knockback, HitFlash, Collider } from '../utils/components.js';
import { spawnDamageNumber } from '../systems/combat.js';

const enemyQuery = defineQuery([Enemy, Position, Health, Collider]);

const SWORD_RANGE = 70;
const SWORD_CONE = Math.PI / 2;
const SWORD_DAMAGE = 25;
const KNOCKBACK_FORCE = 200;

function isInCone(px, py, facingX, facingY, ex, ey, range, halfAngle) {
    const dx = ex - px;
    const dy = ey - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > range) return false;
    const dot = (dx / dist) * facingX + (dy / dist) * facingY;
    return dot >= Math.cos(halfAngle);
}

export default {
    id: 'sword',
    name: "Coup d'Épée",
    iconEmoji: '⚔️',
    cooldown: 0.2,
    type: 'melee',
    fxType: 5, // type Renderable réservé à ce sort

    cast(world, casterId, state) {
        const px = Position.x[casterId] + 16;
        const py = Position.y[casterId] + 16;
        const fx = Facing.x[casterId];
        const fy = Facing.y[casterId];

        const fxEid = addEntity(world);
        addComponent(world, Position, fxEid);
        addComponent(world, SwordFx, fxEid);
        addComponent(world, Renderable, fxEid);

        Position.x[fxEid] = px;
        Position.y[fxEid] = py;
        SwordFx.angle[fxEid] = Math.atan2(fy, fx);
        SwordFx.range[fxEid] = SWORD_RANGE;
        SwordFx.alpha[fxEid] = 1.0;
        Renderable.type[fxEid] = this.fxType;

        state.fxId = fxEid;

        // Dégâts immédiats
        const enemies = enemyQuery(world);
        for (let i = 0; i < enemies.length; i++) {
            const eid = enemies[i];
            const ex = Position.x[eid] + 16;
            const ey = Position.y[eid] + 16;

            if (isInCone(px, py, fx, fy, ex, ey, SWORD_RANGE, SWORD_CONE / 2)) {
                Health.current[eid] -= SWORD_DAMAGE;
                HitFlash.timer[eid] = 0.08;

                const dx = ex - px;
                const dy = ey - py;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    Knockback.x[eid] = (dx / dist) * KNOCKBACK_FORCE;
                    Knockback.y[eid] = (dy / dist) * KNOCKBACK_FORCE;
                }
                spawnDamageNumber(ex, Position.y[eid], SWORD_DAMAGE, '#FFD700', 36);
            }
        }
    },

    update(world, delta, state) {
        const nid = state.fxId;
        SwordFx.alpha[nid] -= 6.0 * delta;

        if (SwordFx.alpha[nid] <= 0) {
            removeEntity(world, nid);
            return true;
        }
        return false;
    },

    // Rendu du FX — appelé par render.js de façon générique
    renderFx(body, eid) {
        body.clear();
        const angle = SwordFx.angle[eid];
        const range = SwordFx.range[eid];
        const a = Math.max(0, SwordFx.alpha[eid]);
        const halfCone = Math.PI / 4;

        body.moveTo(0, 0);
        body.arc(0, 0, range, angle - halfCone, angle + halfCone);
        body.lineTo(0, 0);
        body.fill({ color: 0xFFFFFF, alpha: a * 0.3 });
        body.arc(0, 0, range, angle - halfCone, angle + halfCone);
        body.stroke({ width: 3, color: 0xFF0000, alpha: a });
    },

    onExpire(world, casterId, state) {}
}
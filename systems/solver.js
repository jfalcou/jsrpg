/**
 * @fileoverview Fonctions mathématiques pures pour la résolution physique.
 */

import { Position, Velocity, Collider, Knockback, Player } from '../utils/components.js';
import { checkAABB, wallHash } from '../utils/physics.js';
import { hasComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';

const EPSILON = 0.1;

export function applyVelocityAndBounds(world, eid, delta, worldWidth, worldHeight) {
    let vx = Velocity.x[eid];
    let vy = Velocity.y[eid];

    if (hasComponent(world, Knockback, eid)) {
        vx += Knockback.x[eid];
        vy += Knockback.y[eid];
        Knockback.x[eid] *= Knockback.elasticity[eid];
        Knockback.y[eid] *= Knockback.elasticity[eid];

        if (Math.abs(Knockback.x[eid]) < 5) Knockback.x[eid] = 0;
        if (Math.abs(Knockback.y[eid]) < 5) Knockback.y[eid] = 0;
    }

    const w = Collider.width[eid];
    const h = Collider.height[eid];

    // OPTIMISATION : On récupère uniquement les murs proches (marge de sécurité de 64px pour la vélocité)
    const nearbyWalls = wallHash.query(Position.x[eid] - 32, Position.y[eid] - 32, w + 64, h + 64);

    if (vx !== 0) {
        Position.x[eid] += vx * delta;
        if (Position.x[eid] < 0) Position.x[eid] = 0;
        if (Position.x[eid] + w > worldWidth) Position.x[eid] = worldWidth - w;

        for (const wid of nearbyWalls) {
            if (checkAABB(Position.x[eid], Position.y[eid], w, h, Position.x[wid], Position.y[wid], Collider.width[wid], Collider.height[wid])) {
                if (vx > 0) Position.x[eid] = Position.x[wid] - w - EPSILON;
                else if (vx < 0) Position.x[eid] = Position.x[wid] + Collider.width[wid] + EPSILON;
            }
        }
    }

    if (vy !== 0) {
        Position.y[eid] += vy * delta;
        if (Position.y[eid] < 0) Position.y[eid] = 0;
        if (Position.y[eid] + h > worldHeight) Position.y[eid] = worldHeight - h;

        for (const wid of nearbyWalls) {
            if (checkAABB(Position.x[eid], Position.y[eid], w, h, Position.x[wid], Position.y[wid], Collider.width[wid], Collider.height[wid])) {
                if (vy > 0) Position.y[eid] = Position.y[wid] - h - EPSILON;
                else if (vy < 0) Position.y[eid] = Position.y[wid] + Collider.height[wid] + EPSILON;
            }
        }
    }
}

export function applyFlocking(world, eidA, spatialHash) {
    const xa = Position.x[eidA];
    const ya = Position.y[eidA];
    const wa = Collider.width[eidA];
    const ha = Collider.height[eidA];

    const isPlayerA = hasComponent(world, Player, eidA);
    const neighbors = spatialHash.query(xa, ya, wa, ha);

    for (const eidB of neighbors) {
        // OPTIMISATION : Ignore si A >= B pour ne traiter chaque paire qu'une seule fois
        if (eidA >= eidB) continue;

        const xb = Position.x[eidB];
        const yb = Position.y[eidB];
        const wb = Collider.width[eidB];
        const hb = Collider.height[eidB];

        const isPlayerB = hasComponent(world, Player, eidB);

        const cxA = xa + wa / 2;
        const cyA = ya + ha / 2;
        const cxB = xb + wb / 2;
        const cyB = yb + hb / 2;

        let dx = cxA - cxB;
        let dy = cyA - cyB;
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            dist = Math.sqrt(dx * dx + dy * dy);
        }

        dx /= dist;
        dy /= dist;

        const overlap = (wa / 2 + wb / 2) - dist;

        if (overlap > 0) {
            if (!isPlayerA && !isPlayerB) {
                // Les deux sont affectés symétriquement en une seule passe
                const push = overlap * 0.5;
                Position.x[eidA] += dx * push;
                Position.y[eidA] += dy * push;
                Position.x[eidB] -= dx * push;
                Position.y[eidB] -= dy * push;
            } else if (isPlayerA && !isPlayerB) {
                Position.x[eidB] -= dx * overlap;
                Position.y[eidB] -= dy * overlap;
            } else if (!isPlayerA && isPlayerB) {
                Position.x[eidA] += dx * overlap;
                Position.y[eidA] += dy * overlap;
            }
        }
    }
}
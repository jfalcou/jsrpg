/**
 * @fileoverview Fonctions mathématiques pures pour la résolution physique.
 */

import { Position, Velocity, Collider, Knockback, Player } from '../utils/components.js';
import { checkAABB } from '../utils/physics.js';
import { hasComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';

export function applyVelocityAndBounds(world, eid, delta, walls, worldWidth, worldHeight) {
    let vx = Velocity.x[eid];
    let vy = Velocity.y[eid];

    // Application du Knockback
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

    // Mouvement X
    if (vx !== 0) {
        Position.x[eid] += vx * delta;

        // Limites du monde
        if (Position.x[eid] < 0) Position.x[eid] = 0;
        if (Position.x[eid] + w > worldWidth) Position.x[eid] = worldWidth - w;

        // Collisions Murs X (Sliding)
        for (let j = 0; j < walls.length; j++) {
            const wid = walls[j];
            if (checkAABB(Position.x[eid], Position.y[eid], w, h, Position.x[wid], Position.y[wid], Collider.width[wid], Collider.height[wid])) {
                if (vx > 0) Position.x[eid] = Position.x[wid] - w;
                else if (vx < 0) Position.x[eid] = Position.x[wid] + Collider.width[wid];
            }
        }
    }

    // Mouvement Y
    if (vy !== 0) {
        Position.y[eid] += vy * delta;

        // Limites du monde
        if (Position.y[eid] < 0) Position.y[eid] = 0;
        if (Position.y[eid] + h > worldHeight) Position.y[eid] = worldHeight - h;

        // Collisions Murs Y (Sliding)
        for (let j = 0; j < walls.length; j++) {
            const wid = walls[j];
            if (checkAABB(Position.x[eid], Position.y[eid], w, h, Position.x[wid], Position.y[wid], Collider.width[wid], Collider.height[wid])) {
                if (vy > 0) Position.y[eid] = Position.y[wid] - h;
                else if (vy < 0) Position.y[eid] = Position.y[wid] + Collider.height[wid];
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
        if (eidA === eidB) continue;

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

        // Empêcher la division par zéro si superposition parfaite
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
                // Ennemi (A) vs Ennemi (B) -> Ils se repoussent mutuellement
                const push = overlap * 0.5;
                Position.x[eidA] += dx * push;
                Position.y[eidA] += dy * push;
                Position.x[eidB] -= dx * push;
                Position.y[eidB] -= dy * push;
            } else if (isPlayerA && !isPlayerB) {
                // Joueur (A) vs Ennemi (B) -> Le joueur reste solide, l'ennemi glisse
                Position.x[eidB] -= dx * overlap;
                Position.y[eidB] -= dy * overlap;
            } else if (!isPlayerA && isPlayerB) {
                // Ennemi (A) vs Joueur (B) -> Le joueur reste solide, l'ennemi glisse
                Position.x[eidA] += dx * overlap;
                Position.y[eidA] += dy * overlap;
            }
        }
    }
}
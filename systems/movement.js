/**
 * @fileoverview Moteur physique (Vélocité + Murs + Séparation d'Essaim avec gestion des masses).
 */

import { SpatialHash } from '../utils/spatial_hash.js';
import { defineQuery, removeEntity, hasComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Collider, Wall, Renderable, Knockback, Lifetime, Character } from '../utils/components.js';
import { buildWallHash, hasWallBetween, checkAABB  } from '../utils/physics.js';

const spatialHash = new SpatialHash(64); // cellule de 64px = taille d'un personnage * 2
const movementQuery = defineQuery([Position, Velocity, Collider]);
const wallQuery = defineQuery([Wall, Position, Collider]);

const characterQuery = defineQuery([Character, Position, Collider, Renderable]);

export function createMovementSystem(worldWidth, worldHeight) {
    return function movementSystem(world, delta) {
        const entities = movementQuery(world);
        const walls = wallQuery(world);
        const characters = characterQuery(world);

        // 1. DÉPLACEMENTS ET COLLISIONS AVEC LES MURS
        for (let i = 0; i < entities.length; i++) {
            const eid = entities[i];
            const type = Renderable.type[eid];

            if (type === 2) {
                if (hasComponent(world, Lifetime, eid)) {
                    Lifetime.timer[eid] -= delta;
                    if (Lifetime.timer[eid] <= 0) {
                        removeEntity(world, eid);
                        continue;
                    }
                }
                Position.x[eid] += Velocity.x[eid] * delta;
                Position.y[eid] += Velocity.y[eid] * delta;
                continue;
            }

            let stepX = Velocity.x[eid];
            let stepY = Velocity.y[eid];

            if (hasComponent(world, Knockback, eid)) {
                stepX += Knockback.x[eid];
                stepY += Knockback.y[eid];
                Knockback.x[eid] *= Knockback.elasticity[eid];
                Knockback.y[eid] *= Knockback.elasticity[eid];
                if (Math.abs(Knockback.x[eid]) < 0.5) Knockback.x[eid] = 0;
                if (Math.abs(Knockback.y[eid]) < 0.5) Knockback.y[eid] = 0;
            }

            const w = Collider.width[eid];
            const h = Collider.height[eid];

            Position.x[eid] += stepX * delta;
            for (let j = 0; j < walls.length; j++) {
                const wid = walls[j];
                if (checkAABB(Position.x[eid], Position.y[eid], w, h, Position.x[wid], Position.y[wid], Collider.width[wid], Collider.height[wid])) {
                    if (stepX > 0) Position.x[eid] = Position.x[wid] - w;
                    else if (stepX < 0) Position.x[eid] = Position.x[wid] + Collider.width[wid];
                    break;
                }
            }

            Position.y[eid] += stepY * delta;
            for (let j = 0; j < walls.length; j++) {
                const wid = walls[j];
                const wy = Position.y[wid];
                if (checkAABB(Position.x[eid], Position.y[eid], w, h, Position.x[wid], wy, Collider.width[wid], Collider.height[wid])) {
                    if (stepY > 0) Position.y[eid] = wy - h;
                    else if (stepY < 0) Position.y[eid] = wy + Collider.height[wid];
                    break;
                }
            }

            if (Position.x[eid] < 0) Position.x[eid] = 0;
            if (Position.x[eid] > worldWidth - w) Position.x[eid] = worldWidth - w;
            if (Position.y[eid] < 0) Position.y[eid] = 0;
            if (Position.y[eid] > worldHeight - h) Position.y[eid] = worldHeight - h;
        }

        // 2. SÉPARATION DOUCE AVEC SPATIAL HASH
        spatialHash.clear();

        // On insère tous les personnages dans le hash
        for (let i = 0; i < characters.length; i++) {
            const eid = characters[i];
            spatialHash.insert(
                eid,
                Position.x[eid],
                Position.y[eid],
                Collider.width[eid],
                Collider.height[eid]
            );
        }

        // On ne compare chaque entité qu'avec ses voisins proches
        for (let i = 0; i < characters.length; i++) {
            const eidA = characters[i];
            const typeA = Renderable.type[eidA];

            const xa = Position.x[eidA];
            const ya = Position.y[eidA];
            const wa = Collider.width[eidA];
            const ha = Collider.height[eidA];

            // Voisins dans les cellules adjacentes uniquement
            const neighbors = spatialHash.query(xa, ya, wa, ha);

            for (const eidB of neighbors) {
                if (eidB <= eidA) continue; // Evite les doublons

                const typeB = Renderable.type[eidB];
                const xb = Position.x[eidB];
                const yb = Position.y[eidB];
                const wb = Collider.width[eidB];
                const hb = Collider.height[eidB];

                if (checkAABB(xa, ya, wa, ha, xb, yb, wb, hb)) {
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
                        if (typeA === 1 && typeB === 1) {
                            const push = overlap * 0.5;
                            Position.x[eidA] += dx * push;
                            Position.y[eidA] += dy * push;
                            Position.x[eidB] -= dx * push;
                            Position.y[eidB] -= dy * push;
                        } else if (typeA === 0 && typeB === 1) {
                            Position.x[eidB] -= dx * overlap;
                            Position.y[eidB] -= dy * overlap;
                        } else if (typeA === 1 && typeB === 0) {
                            Position.x[eidA] += dx * overlap;
                            Position.y[eidA] += dy * overlap;
                        }
                    }
                }
            }
        }

        return world;
    };
}
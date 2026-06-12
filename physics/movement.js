/**
 * @fileoverview Système ECS gérant le mouvement global (Orchestrateur).
 */

import { SpatialHash } from '../utils/spatial_hash.js';
import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Collider, Wall, Character } from '../utils/components.js';
import { buildWallHash } from '../utils/physics.js';
import { applyVelocityAndBounds, applyFlocking } from '../physics/solver.js';

const spatialHash = new SpatialHash(64);
const movementQuery = defineQuery([Position, Velocity, Collider]);
const wallQuery = defineQuery([Wall, Position, Collider]);
const characterQuery = defineQuery([Character, Position, Collider]);

export function createMovementSystem(worldWidth, worldHeight) {
    return function movementSystem(world, delta) {
        const entities = movementQuery(world);
        const walls = wallQuery(world);
        const characters = characterQuery(world);

        // Construction du hash des murs (statique)
        buildWallHash(world);

        // ====================================================================
        // 1. DÉPLACEMENTS ET COLLISIONS (Murs & Limites)
        // ====================================================================
        for (let i = 0; i < entities.length; i++) {
            applyVelocityAndBounds(world, entities[i], delta, walls, worldWidth, worldHeight);
        }

        // ====================================================================
        // 2. MISE À JOUR DU HASH SPATIAL DYNAMIQUE
        // ====================================================================
        spatialHash.clear();
        for (let i = 0; i < characters.length; i++) {
            const eid = characters[i];
            spatialHash.insert(eid, Position.x[eid], Position.y[eid], Collider.width[eid], Collider.height[eid]);
        }

        // ====================================================================
        // 3. SÉPARATION D'ESSAIM (Flocking) ET COLLISIONS ENTITÉS
        // ====================================================================
        for (let i = 0; i < characters.length; i++) {
            applyFlocking(world, characters[i], spatialHash);
        }

        return world;
    };
}
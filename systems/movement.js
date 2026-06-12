/**
 * @fileoverview Moteur physique (Vélocité + Murs + Séparation d'Essaim avec gestion des masses).
 */

import { applyVelocityAndBounds, applyFlocking } from './solver.js';
import { buildWallHash, checkAABB } from '../utils/physics.js';
import { defineQuery, removeEntity, hasComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Collider, Wall, Knockback, Lifetime, Character, Player, Enemy } from '../utils/components.js';
import { SpatialHash } from '../utils/spatial_hash.js';

const spatialHash = new SpatialHash(64);
const movementQuery = defineQuery([Position, Velocity, Collider]);
const wallQuery = defineQuery([Wall, Position, Collider]);
const characterQuery = defineQuery([Character, Position, Collider]);

export function createMovementSystem(worldWidth, worldHeight) {
    return function movementSystem(world, delta) {
        const entities = movementQuery(world);
        const walls = wallQuery(world);
        const characters = characterQuery(world);
        buildWallHash(world);

        for (let i = 0; i < entities.length; i++) {
            applyVelocityAndBounds(world, entities[i], delta, walls, worldWidth, worldHeight);
        }

        spatialHash.clear();
        for (let i = 0; i < characters.length; i++) {
            const eid = characters[i];
            spatialHash.insert(eid, Position.x[eid], Position.y[eid], Collider.width[eid], Collider.height[eid]);
        }

        for (let i = 0; i < characters.length; i++) {
            applyFlocking(world, characters[i], spatialHash);
        }

        return world;
    };
}
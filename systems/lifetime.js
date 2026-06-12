/**
 * @fileoverview Système ECS gérant la durée de vie des entités temporaires (Projectiles, FX).
 */

import { defineQuery, removeEntity } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Lifetime } from '../utils/components.js';

const lifetimeQuery = defineQuery([Lifetime]);

export function createLifetimeSystem() {
    return function lifetimeSystem(world, delta) {
        const entities = lifetimeQuery(world);
        for (let i = 0; i < entities.length; i++) {
            const eid = entities[i];

            Lifetime.timer[eid] -= delta;

            if (Lifetime.timer[eid] <= 0) {
                removeEntity(world, eid);
            }
        }
        return world;
    };
}
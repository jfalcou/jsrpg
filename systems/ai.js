/**
 * @fileoverview Système gérant l'Intelligence Artificielle (Tracking).
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Player, Enemy } from '../utils/components.js';

const enemyQuery = defineQuery([Enemy, Position, Velocity]);
const playerQuery = defineQuery([Player, Position]);

export function createAiSystem() {
    const ENEMY_SPEED = 150;
    const ACTIVATION_RADIUS = 800;   // L'ennemi commence à bouger
    const DEACTIVATION_RADIUS = 1000; // L'ennemi s'arrête (légèrement plus grand pour éviter le flickering)

    return function aiSystem(world, delta) {
        const players = playerQuery(world);
        if (players.length === 0) return world;

        const playerId = players[0];
        const px = Position.x[playerId];
        const py = Position.y[playerId];

        const enemies = enemyQuery(world);

        for (let i = 0; i < enemies.length; i++) {
            const eid = enemies[i];
            const ex = Position.x[eid];
            const ey = Position.y[eid];

            const dx = px - ex;
            const dy = py - ey;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Hors portée — l'ennemi s'arrête
            if (dist > DEACTIVATION_RADIUS) {
                Velocity.x[eid] = 0;
                Velocity.y[eid] = 0;
                continue;
            }

            // Dans la portée d'activation — l'ennemi fonce sur le joueur
            if (dist <= ACTIVATION_RADIUS && dist > 0) {
                Velocity.x[eid] = (dx / dist) * ENEMY_SPEED;
                Velocity.y[eid] = (dy / dist) * ENEMY_SPEED;
            }
        }

        return world;
    };
}
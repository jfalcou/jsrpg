/**
 * @fileoverview Système gérant l'Intelligence Artificielle (Tracking).
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Player, Enemy, AiTracker } from '../utils/components.js';

// L'IA ne cherche plus "tous les ennemis", mais "ceux qui ont le tag AiTracker"
const trackerQuery = defineQuery([Enemy, Position, Velocity, AiTracker]);
const playerQuery = defineQuery([Player, Position]);

/**
 * Genere un système d'IA basique où les ennemis traquent le joueur s'il est à portée, et s'arrêtent s'il s'éloigne trop.
 * L'ennemi ne peut pas traverser les murs grâce au système de collision, mais il ne fait pas de pathfinding
 * avancé (il se contente de foncer droit vers le joueur).
 * @returns Une fonction système à utiliser dans le jeu.
 */
export function createAiSystem() {
    return function aiSystem(world, delta) {
        const players = playerQuery(world);
        if (players.length === 0) return world;

        const playerId = players[0];
        const px = Position.x[playerId];
        const py = Position.y[playerId];

        const trackers = trackerQuery(world);

        for (let i = 0; i < trackers.length; i++) {
            const eid = trackers[i];
            const ex = Position.x[eid];
            const ey = Position.y[eid];

            const dx = px - ex;
            const dy = py - ey;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const speed = AiTracker.speed[eid];
            const actRadius = AiTracker.activationRadius[eid];
            const deactRadius = AiTracker.deactivationRadius[eid];

            // Hors portée — l'ennemi s'arrête
            if (dist > deactRadius) {
                Velocity.x[eid] = 0;
                Velocity.y[eid] = 0;
                continue;
            }

            // Dans la portée d'activation — l'ennemi fonce sur le joueur
            if (dist <= actRadius && dist > 0) {
                Velocity.x[eid] = (dx / dist) * speed;
                Velocity.y[eid] = (dy / dist) * speed;
            }
        }

        return world;
    };
}
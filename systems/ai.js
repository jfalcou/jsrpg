/**
 * @fileoverview Système gérant l'Intelligence Artificielle (Tracking) via FSM.
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Player, Enemy, AiTracker, Facing, State, STATES } from '../utils/components.js';

// On ajoute State et Facing à la requête pour être sûr que l'ennemi les possède
const trackerQuery = defineQuery([Enemy, Position, Velocity, AiTracker, State, Facing]);
const playerQuery = defineQuery([Player, Position]);

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

            // PRIORITÉ : Si le monstre est mort ou étourdi, l'IA ne fait rien
            if (State.current[eid] === STATES.DEAD || State.current[eid] === STATES.STUN) {
                continue;
            }

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
                State.current[eid] = STATES.IDLE;
                continue;
            }

            if (dist <= actRadius && dist > 0) {
                // Normalisation du vecteur
                const dirX = dx / dist;
                const dirY = dy / dist;

                Velocity.x[eid] = dirX * speed;
                Velocity.y[eid] = dirY * speed;

                Facing.x[eid] = dirX;
                Facing.y[eid] = dirY;

                State.current[eid] = STATES.RUN;
            }
        }

        return world;
    };
}
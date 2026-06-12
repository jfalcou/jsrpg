/**
 * @fileoverview Système gérant l'Intelligence Artificielle (Tracking) via FSM.
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Player, Enemy, AiTracker, State, STATES } from '../utils/components.js';

const trackerQuery = defineQuery([Enemy, Position, Velocity, AiTracker, State]);
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

            // Dans la portée d'activation — l'ennemi fonce sur le joueur
            if (dist <= actRadius && dist > 0) {
                Velocity.x[eid] = (dx / dist) * speed;
                Velocity.y[eid] = (dy / dist) * speed;
                State.current[eid] = STATES.RUN;
            }
        }

        return world;
    };
}
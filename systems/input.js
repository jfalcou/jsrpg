/**
 * @fileoverview Système gérant les entrées clavier (Mouvement, Dash, Sorts) via FSM.
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Player, Facing, Dash, Attributes, State, STATES } from '../utils/components.js';
import { equippedSpells, tickCooldowns } from '../data/spells/index.js';
import { castSpell } from './spells.js';

const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// Requête mise à jour avec State
const playerQuery = defineQuery([Player, Position, Velocity, Facing, Dash, Attributes, State]);

export function createInputSystem() {
    const DASH_DURATION = 0.25;

    let canDash = true;
    const spellKeysDown = new Set();

    return function inputSystem(world, delta) {
        tickCooldowns(delta);

        const entities = playerQuery(world);

        for (let i = 0; i < entities.length; i++) {
            const eid = entities[i];

            const SPEED = Attributes.speed[eid] || 240;
            const DASH_SPEED = SPEED * 3.5;

            const dashPressed = keys['KeyE'] || keys['ControlLeft'];
            if (!dashPressed) canDash = true;

            const currentState = State.current[eid];

            // ====================================================================
            // PRIORITÉ 1 : ÉTATS BLOQUANTS (Mort, Étourdi)
            // ====================================================================
            if (currentState === STATES.DEAD || currentState === STATES.STUN) {
                Velocity.x[eid] = 0;
                Velocity.y[eid] = 0;
                continue;
            }

            // ====================================================================
            // PRIORITÉ 2 : ACTIONS FORCÉES (Dash en cours)
            // ====================================================================
            if (Dash.active[eid] === 1) {
                Dash.timer[eid] -= delta;

                if (Dash.timer[eid] <= 0) {
                    Dash.active[eid] = 0;
                    State.current[eid] = STATES.IDLE;
                    Velocity.x[eid] = 0;
                    Velocity.y[eid] = 0;
                } else {
                    State.current[eid] = STATES.DASH;
                    Velocity.x[eid] = Dash.dirX[eid] * Dash.speed[eid];
                    Velocity.y[eid] = Dash.dirY[eid] * Dash.speed[eid];
                    continue; // Empêche tout autre input pendant l'action
                }
            }

            // ====================================================================
            // PRIORITÉ 3 : LECTURE DES COMMANDES (Libre)
            // ====================================================================
            let moveX = 0;
            let moveY = 0;

            if (keys['KeyW'] || keys['ArrowUp'] || keys['KeyZ']) moveY -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) moveY += 1;
            if (keys['KeyA'] || keys['ArrowLeft'] || keys['KeyQ']) moveX -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

            if (moveX !== 0 && moveY !== 0) {
                const length = Math.sqrt(moveX * moveX + moveY * moveY);
                moveX /= length;
                moveY /= length;
            }

            if (moveX !== 0 || moveY !== 0) {
                Facing.x[eid] = moveX;
                Facing.y[eid] = moveY;
                State.current[eid] = STATES.RUN; // FSM : L'état passe en Course
            } else {
                State.current[eid] = STATES.IDLE; // FSM : L'état passe en Repos
            }

            Velocity.x[eid] = moveX * SPEED;
            Velocity.y[eid] = moveY * SPEED;

            // DÉCLENCHEMENT DU DASH
            if (dashPressed && canDash) {
                Dash.active[eid] = 1;
                Dash.timer[eid] = DASH_DURATION;
                Dash.speed[eid] = DASH_SPEED;
                State.current[eid] = STATES.DASH; // FSM : Transition immédiate
                canDash = false;

                if (moveX !== 0 || moveY !== 0) {
                    Dash.dirX[eid] = moveX;
                    Dash.dirY[eid] = moveY;
                } else {
                    Dash.dirX[eid] = Facing.x[eid];
                    Dash.dirY[eid] = Facing.y[eid];
                }

                Velocity.x[eid] = Dash.dirX[eid] * Dash.speed[eid];
                Velocity.y[eid] = Dash.dirY[eid] * Dash.speed[eid];
                continue;
            }

            // DÉCLENCHEMENT DES SORTS
            for (const entry of equippedSpells) {
                if (keys[entry.key]) {
                    if (!spellKeysDown.has(entry.key) && entry.cooldownRemaining <= 0) {
                        castSpell(entry.spell, world, eid);
                        entry.cooldownRemaining = entry.spell.cooldown;
                        // On pourrait forcer STATES.ATTACK ici plus tard
                    }
                    spellKeysDown.add(entry.key);
                } else {
                    spellKeysDown.delete(entry.key);
                }
            }
        }
        return world;
    };
}
/**
 * @fileoverview Système gérant les entrées clavier (Mouvement, Dash, Tir, Sorts).
 */

import { defineQuery, addEntity, addComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Player, Renderable, Facing, Collider, Bullet, Dash, Lifetime } from '../utils/components.js';
import { equippedSpells, tickCooldowns } from '../spells/index.js';
import { castSpell } from './spells.js';

const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

const playerQuery = defineQuery([Player, Position, Velocity, Facing, Dash]);

export function createInputSystem() {
    let lastShotTime = 0;
    const SHOT_COOLDOWN = 150;
    const SPEED = 240;
    const BULLET_SPEED = 600;
    const DASH_SPEED = SPEED * 3.5;
    const DASH_DURATION = 0.25;

    let canDash = true;
    const spellKeysDown = new Set(); // Évite le spam en maintenant la touche

    return function inputSystem(world, delta) {
        const entities = playerQuery(world);

        for (let i = 0; i < entities.length; i++) {
            const eid = entities[i];

            // 1. RÉDUCTION DES COOLDOWNS DES SORTS
            tickCooldowns(delta);

            // 2. DASH
            if (Dash.active[eid] === 1) {
                Dash.timer[eid] -= delta;
                if (Dash.timer[eid] <= 0) Dash.active[eid] = 0;
            }
            const dashPressed = keys['KeyE'] || keys['ControlLeft'];
            if (!dashPressed) canDash = true;

            if (Dash.active[eid] === 1) {
                Velocity.x[eid] = Dash.dirX[eid] * Dash.speed[eid];
                Velocity.y[eid] = Dash.dirY[eid] * Dash.speed[eid];
            } else {
                let moveX = 0, moveY = 0;
                if (keys['ArrowUp'] || keys['KeyW']) moveY -= 1;
                if (keys['ArrowDown'] || keys['KeyS']) moveY += 1;
                if (keys['ArrowLeft'] || keys['KeyA']) moveX -= 1;
                if (keys['ArrowRight'] || keys['KeyD']) moveX += 1;

                if (moveX !== 0 || moveY !== 0) {
                    const dist = Math.sqrt(moveX * moveX + moveY * moveY);
                    Velocity.x[eid] = (moveX / dist) * SPEED;
                    Velocity.y[eid] = (moveY / dist) * SPEED;
                    Facing.x[eid] = moveX / dist;
                    Facing.y[eid] = moveY / dist;
                } else {
                    Velocity.x[eid] = 0;
                    Velocity.y[eid] = 0;
                }

                if (dashPressed && canDash) {
                    Dash.active[eid] = 1;
                    Dash.timer[eid] = DASH_DURATION;
                    Dash.speed[eid] = DASH_SPEED;
                    canDash = false;

                    if (moveX !== 0 || moveY !== 0) {
                        const dist = Math.sqrt(moveX * moveX + moveY * moveY);
                        Dash.dirX[eid] = moveX / dist;
                        Dash.dirY[eid] = moveY / dist;
                    } else {
                        Dash.dirX[eid] = Facing.x[eid];
                        Dash.dirY[eid] = Facing.y[eid];
                    }
                    Velocity.x[eid] = Dash.dirX[eid] * Dash.speed[eid];
                    Velocity.y[eid] = Dash.dirY[eid] * Dash.speed[eid];
                }
            }

            // 3. ATTAQUES
            if (Dash.active[eid] === 0) {

                // TIR DE BASE (Espace)
                if (keys['Space']) {
                    const now = performance.now();
                    if (now - lastShotTime > SHOT_COOLDOWN) {
                        const bullet = addEntity(world);
                        addComponent(world, Position, bullet);
                        addComponent(world, Velocity, bullet);
                        addComponent(world, Renderable, bullet);
                        addComponent(world, Collider, bullet);
                        addComponent(world, Bullet, bullet);
                        addComponent(world, Lifetime, bullet);

                        Position.x[bullet] = Position.x[eid] + 12;
                        Position.y[bullet] = Position.y[eid] + 12;
                        Collider.width[bullet] = 8;
                        Collider.height[bullet] = 8;

                        Velocity.x[bullet] = Facing.x[eid] * BULLET_SPEED;
                        Velocity.y[bullet] = Facing.y[eid] * BULLET_SPEED;

                        Lifetime.timer[bullet] = 1.0;
                        Renderable.type[bullet] = 2;

                        lastShotTime = now;
                    }
                }

                // SORTS — itère sur tous les sorts équipés
                for (const entry of equippedSpells) {
                    if (keys[entry.key]) {
                        if (!spellKeysDown.has(entry.key) && entry.cooldownRemaining <= 0) {
                            castSpell(entry.spell, world, eid);
                            entry.cooldownRemaining = entry.spell.cooldown;
                        }
                        spellKeysDown.add(entry.key);
                    } else {
                        spellKeysDown.delete(entry.key);
                    }
                }
            }
        }
        return world;
    };
}
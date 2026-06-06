/**
 * @fileoverview Système gérant la physique de combat, la mort et l'animation des FX.
 */

import { defineQuery, removeEntity, hasComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Collider, Bullet, Enemy, Wall, Health, Knockback, HitFlash, Player, PlayerStats } from '../utils/components.js';
import { SpatialHash } from '../utils/spatial_hash.js';
import { buildWallHash, hasWallBetween, checkAABB  } from '../utils/physics.js';

const bulletQuery = defineQuery([Bullet, Position, Collider, Velocity]);
const enemyQuery = defineQuery([Enemy, Position, Collider, Health]);
const wallQuery = defineQuery([Wall, Position, Collider]);
const playerQuery = defineQuery([Player, PlayerStats, Health]);
const playerBodyQuery = defineQuery([Player, Position, Collider, Health]);

// Pour les collisions avec les ennemis, on utilise un spatial hash pour limiter le nombre de checks à faire
const enemyHash = new SpatialHash(128);

/**
 * Génére un système de combat qui gère les impacts des balles sur les murs et les ennemis, les impacts des ennemis
 * sur le joueur, ainsi que le death sweep qui supprime les ennemis morts et donne de l'XP au joueur.
 *
 * @returns La fonction système à utiliser dans le jeu.
 */
export function createCombatSystem() {
    return function combatSystem(world, delta) {
        const bullets = bulletQuery(world);
        const enemies = enemyQuery(world);
        const walls = wallQuery(world);
        const players = playerQuery(world);

        // Construction du hash des murs
        buildWallHash(world);

        // Reconstruction du hash ennemis à chaque frame
        enemyHash.clear();
        for (let i = 0; i < enemies.length; i++) {
            const eid = enemies[i];
            enemyHash.insert(eid, Position.x[eid], Position.y[eid], Collider.width[eid], Collider.height[eid]);
        }

        // IMPACTS DES BALLES
        for (let i = 0; i < bullets.length; i++) {
            const bid = bullets[i];
            let bulletDestroyed = false;

            const bx = Position.x[bid];
            const by = Position.y[bid];
            const bw = Collider.width[bid];
            const bh = Collider.height[bid];

            // Collision Murs
            for (let j = 0; j < walls.length; j++) {
                const wid = walls[j];
                if (checkAABB(bx, by, bw, bh, Position.x[wid], Position.y[wid], Collider.width[wid], Collider.height[wid])) {
                    removeEntity(world, bid);
                    bulletDestroyed = true;
                    break;
                }
            }

            if (bulletDestroyed) continue;

           // Collisions Ennemis — uniquement les ennemis proches de la balle
            const nearbyEnemies = enemyHash.query(bx, by, bw, bh);
            for (const eid of nearbyEnemies) {
                if (checkAABB(bx, by, bw, bh, Position.x[eid], Position.y[eid], Collider.width[eid], Collider.height[eid])) {
                    Health.current[eid] -= 25;
                    HitFlash.timer[eid] = 0.08;

                    if (hasComponent(world, Knockback, eid)) {
                        const bVx = Velocity.x[bid];
                        const bVy = Velocity.y[bid];
                        const dist = Math.sqrt(bVx * bVx + bVy * bVy);
                        if (dist > 0) {
                            Knockback.x[eid] = (bVx / dist) * 400;
                            Knockback.y[eid] = (bVy / dist) * 400;
                        }
                    }
                    removeEntity(world, bid);
                    bulletDestroyed = true;
                    break;
                }
            }
        }

        // 2. IMPACTS DES ENNEMIS SUR LE JOUEUR
        const playerBodies = playerBodyQuery(world);
        if (playerBodies.length > 0) {
            const pid = playerBodies[0];

            for (let i = 0; i < enemies.length; i++) {
                const eid = enemies[i];

                if (checkAABB(
                    Position.x[pid], Position.y[pid], Collider.width[pid], Collider.height[pid],
                    Position.x[eid], Position.y[eid], Collider.width[eid], Collider.height[eid]
                )) {
                    Health.current[pid] -= 10 * delta;
                }
            }

            // Clamp à 0
            if (Health.current[pid] < 0) Health.current[pid] = 0;
        }

        // 3. LE BALAYAGE DE LA MORT ET DE L'XP
        for (let j = 0; j < enemies.length; j++) {
            const eid = enemies[j];
             // Décrémentation HitFlash
            if (hasComponent(world, HitFlash, eid) && HitFlash.timer[eid] > 0) {
                HitFlash.timer[eid] -= delta;
            }

            if (Health.current[eid] <= 0) {
                removeEntity(world, eid);

                if (players.length > 0) {
                    const pid = players[0];
                    PlayerStats.xp[pid] += 250;

                    if (PlayerStats.xp[pid] >= PlayerStats.xpToNext[pid]) {
                        PlayerStats.xp[pid] -= PlayerStats.xpToNext[pid];
                        PlayerStats.level[pid] += 1;
                        PlayerStats.xpToNext[pid] *= 1.5;
                        Health.current[pid] = Health.max[pid];
                    }
                }
            }
        }

        return world;
    };
}
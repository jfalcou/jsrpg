/**
 * @fileoverview Utilitaires physiques partagés entre les systèmes.
 * Raycast, AABB, et autres helpers géométriques.
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Collider, Wall } from './components.js';
import { SpatialHash } from './spatial_hash.js';

// Requête pour récupérer les murs et construire le hash
const wallQuery = defineQuery([Wall, Position, Collider]);

// Hash des murs — précalculé une seule fois car les murs ne bougent pas
const wallHash = new SpatialHash(128);
let wallHashBuilt = false;

/**
 * Construit le hash des murs.
 * @param {*} world
 */
export function buildWallHash(world) {
    if (wallHashBuilt) return;
    const walls = wallQuery(world);
    for (let i = 0; i < walls.length; i++) {
        const wid = walls[i];
        wallHash.insert(wid, Position.x[wid], Position.y[wid], Collider.width[wid], Collider.height[wid]);
    }
    wallHashBuilt = true;
}

/**
 * Vérifie la collision entre deux rectangles englobants (AABB).
 * @param {*} x1 Coin supérieur gauche du rect 1
 * @param {*} y1 Coin supérieur gauche du rect 1
 * @param {*} w1 Largeur du rect 1
 * @param {*} h1 Hauteur du rect 1
 * @param {*} x2 Coin supérieur gauche du rect 2
 * @param {*} y2 Coin supérieur gauche du rect 2
 * @param {*} w2 Largeur du rect 2
 * @param {*} h2 Hauteur du rect 2
 * @returns
 */
export function checkAABB(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

/**
 * Vérifie s'il y a un mur entre deux points (ex: joueur et ennemi).
 * Utilisé pour les sorts à effet de zone qui ne doivent pas traverser les murs.
 * @param {*} px Position x du point de départ (ex: joueur)
 * @param {*} py Position y du point de départ (ex: joueur)
 * @param {*} ex Position x du point d'arrivée (ex: ennemi)
 * @param {*} ey Position y du point d'arrivée (ex: ennemi)
 * @returns {boolean} true s'il y a un mur entre les deux points, false sinon
 */
export function hasWallBetween(px, py, ex, ey) {
    for (let t = 0; t <= 1; t += 0.1) {
        const x = px + (ex - px) * t;
        const y = py + (ey - py) * t;
        const nearby = wallHash.query(x - 1, y - 1, 2, 2);
        for (const wid of nearby) {
            if (x >= Position.x[wid] && x <= Position.x[wid] + Collider.width[wid] &&
                y >= Position.y[wid] && y <= Position.y[wid] + Collider.height[wid]) {
                return true;
            }
        }
    }
    return false;
}
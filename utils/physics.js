/**
 * @fileoverview Utilitaires physiques partagés entre les systèmes.
 * Raycast, AABB, et autres helpers géométriques.
 */

import { defineQuery } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Collider, Wall } from './components.js';
import { SpatialHash } from './spatial_hash.js';

const wallQuery = defineQuery([Wall, Position, Collider]);

// Hash des murs — exporté pour être utilisable par le solveur de mouvements
export const wallHash = new SpatialHash(128);
let wallHashBuilt = false;

export function buildWallHash(world) {
    if (wallHashBuilt) return;
    const walls = wallQuery(world);
    for (let i = 0; i < walls.length; i++) {
        const wid = walls[i];
        wallHash.insert(wid, Position.x[wid], Position.y[wid], Collider.width[wid], Collider.height[wid]);
    }
    wallHashBuilt = true;
}

export function checkAABB(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

/**
 * Test mathématique d'intersection entre un segment (ligne de vue) et une boîte (AABB).
 */
function lineIntersectsAABB(p1x, p1y, p2x, p2y, rX, rY, rW, rH) {
    const minX = rX, maxX = rX + rW;
    const minY = rY, maxY = rY + rH;

    // Si la ligne entière est d'un seul côté de la boîte, pas de collision
    if ((p1x < minX && p2x < minX) || (p1x > maxX && p2x > maxX) ||
        (p1y < minY && p2y < minY) || (p1y > maxY && p2y > maxY)) {
        return false;
    }

    const dx = p2x - p1x;
    const dy = p2y - p1y;

    if (dx !== 0) {
        const m = dy / dx;
        const y1 = m * (minX - p1x) + p1y;
        if (y1 >= minY && y1 <= maxY) return true;
        const y2 = m * (maxX - p1x) + p1y;
        if (y2 >= minY && y2 <= maxY) return true;
    }

    if (dy !== 0) {
        const invM = dx / dy;
        const x1 = invM * (minY - p1y) + p1x;
        if (x1 >= minX && x1 <= maxX) return true;
        const x2 = invM * (maxY - p1y) + p1x;
        if (x2 >= minX && x2 <= maxX) return true;
    }

    // Vérification interne
    if (p1x >= minX && p1x <= maxX && p1y >= minY && p1y <= maxY) return true;

    return false;
}

export function hasWallBetween(px, py, ex, ey) {
    // On crée la boîte englobante de notre "rayon" visuel
    const minX = Math.min(px, ex);
    const minY = Math.min(py, ey);
    const w = Math.abs(ex - px);
    const h = Math.abs(ey - py);

    const nearby = wallHash.query(minX, minY, w, h);

    for (const wid of nearby) {
        if (lineIntersectsAABB(px, py, ex, ey, Position.x[wid], Position.y[wid], Collider.width[wid], Collider.height[wid])) {
            return true;
        }
    }
    return false;
}

export function resetPhysics() {
    wallHash.clear();
    wallHashBuilt = false;
}
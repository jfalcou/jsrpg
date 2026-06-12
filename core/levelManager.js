/**
 * @fileoverview Gestionnaire de création des niveaux et du monde.
 */

import { addEntity, addComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Collider, Wall, Renderable } from '../utils/components.js';
import { buildWallHash } from '../utils/physics.js';
import { spawnEnemy } from '../data/enemies_index.js';

export function loadLevel(world, levelId, worldWidth, worldHeight) {
    // Note : levelId servira plus tard à charger un fichier JSON spécifique

    function createWall(x, y, w, h) {
        const wall = addEntity(world);
        addComponent(world, Wall, wall);
        addComponent(world, Position, wall);
        addComponent(world, Collider, wall);
        addComponent(world, Renderable, wall);
        Position.x[wall] = x;
        Position.y[wall] = y;
        Collider.width[wall] = w;
        Collider.height[wall] = h;
        Renderable.type[wall] = 3;
    }

    // 1. Génération de l'architecture du niveau de test
    createWall(worldWidth / 2 - 200, worldHeight / 2 - 100, 400, 40);
    createWall(worldWidth / 2 - 200, worldHeight / 2 + 100, 400, 40);
    createWall(worldWidth / 2 - 200, worldHeight / 2 - 100, 40, 240);

    // 2. Construction de l'index spatial pour les collisions statiques
    buildWallHash(world);

    // 3. Génération de la population (Monstres)
    for (let i = 0; i < 70; i++) {
        let ex, ey;
        // On s'assure qu'ils n'apparaissent pas trop près du centre (zone de départ du joueur)
        do {
            ex = Math.random() * (worldWidth - 100) + 50;
            ey = Math.random() * (worldHeight - 100) + 50;
        } while (Math.abs(ex - worldWidth / 2) < 300 && Math.abs(ey - worldHeight / 2) < 300);

        spawnEnemy(world, 'skeleton', ex, ey);
    }
}
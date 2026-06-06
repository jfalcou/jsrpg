/**
 * @fileoverview Spatial Hash Grid — divise le monde en cellules
 * et permet de ne comparer que les entités proches.
 */

/**
 * Spatial Hash Grid pour optimisation des collisions.
 * Divise le monde en cellules de taille fixe et stocke les entités dans ces cellules.
 * Permet de ne comparer que les entités proches pour les collisions, au lieu de tout comparer.
 * Idéal pour les jeux avec beaucoup d'entités mobiles (ex: projectiles, ennemis).
 *
 * Usage :
 * - À chaque frame, on vide le hash et on réinsère toutes les entités mobiles (ex: ennemis).
 * - Pour chaque entité, on récupère les voisins proches via query(x, y, w, h) avant de faire les vérifications de collision.
 * - Pour les sorts à effet de zone, on peut utiliser queryRadius(px, py, radius) pour récupérer les entités dans un rayon.
 *
 * Note : les murs sont gérés séparément dans un hash dédié car ils ne bougent pas, ce qui permet d'optimiser les
 * vérifications de ligne de vue.
 */
export class SpatialHash {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    _key(x, y) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        return `${cx},${cy}`;
    }

    clear() {
        this.cells.clear();
    }

    insert(eid, x, y, w, h) {
        // On insère l'entité dans toutes les cellules qu'elle touche
        const x1 = Math.floor(x / this.cellSize);
        const y1 = Math.floor(y / this.cellSize);
        const x2 = Math.floor((x + w) / this.cellSize);
        const y2 = Math.floor((y + h) / this.cellSize);

        for (let cx = x1; cx <= x2; cx++) {
            for (let cy = y1; cy <= y2; cy++) {
                const key = `${cx},${cy}`;
                if (!this.cells.has(key)) this.cells.set(key, []);
                this.cells.get(key).push(eid);
            }
        }
    }

    // Retourne tous les voisins dans les cellules adjacentes
    query(x, y, w, h) {
        const result = new Set();
        const x1 = Math.floor(x / this.cellSize);
        const y1 = Math.floor(y / this.cellSize);
        const x2 = Math.floor((x + w) / this.cellSize);
        const y2 = Math.floor((y + h) / this.cellSize);

        for (let cx = x1; cx <= x2; cx++) {
            for (let cy = y1; cy <= y2; cy++) {
                const key = `${cx},${cy}`;
                const cell = this.cells.get(key);
                if (cell) cell.forEach(eid => result.add(eid));
            }
        }
        return result;
    }

    // Retourne tous les voisins dans un rayon circulaire
    queryRadius(px, py, radius) {
        const result = new Set();
        const x1 = Math.floor((px - radius) / this.cellSize);
        const y1 = Math.floor((py - radius) / this.cellSize);
        const x2 = Math.floor((px + radius) / this.cellSize);
        const y2 = Math.floor((py + radius) / this.cellSize);

        for (let cx = x1; cx <= x2; cx++) {
            for (let cy = y1; cy <= y2; cy++) {
                const key = `${cx},${cy}`;
                const cell = this.cells.get(key);
                if (cell) cell.forEach(eid => result.add(eid));
            }
        }
        return result;
    }
}
/**
 * @fileoverview Chargeur asynchrone et cache global des données JSON.
 */

export const GameData = {
    races: {},
    items: {},
    enemies: {}
};

export async function loadGameData() {
    try {
        const [racesRes, itemsRes, enemiesRes] = await Promise.all([
            fetch('./data/races.json'),
            fetch('./data/items.json'),
            fetch('./data/enemies.json')
        ]);

        const races = await racesRes.json();
        const items = await itemsRes.json();
        const enemies = await enemiesRes.json();

        // Indexation par ID pour des performances maximales
        races.forEach(r => GameData.races[r.id] = r);
        items.forEach(i => GameData.items[i.id] = i);
        enemies.forEach(e => GameData.enemies[e.id] = e);

        console.log("Bibliothèque de données chargée avec succès.");
    } catch (err) {
        console.error("Erreur critique lors du chargement des JSON :", err);
        throw err;
    }
}
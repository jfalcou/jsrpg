/**
 * @fileoverview Définition de l'ennemi : Squelette.
 */

export default {
    id: 'skeleton',
    name: 'Squelette',
    renderType: 10,
    stats: { hp: 100, speed: 150, xp: 250, damage: 5 },
    physics: { width: 32, height: 32, knockbackElasticity: 0.85 },
    visuals: {
        setupVisual: function(body) {
            body.rect(0, 0, 32, 32).fill({ color: 0xDDDDDD });
            body.stroke({ width: 2, color: 0x888888 });
            body.rect(6, 6, 6, 6).fill({ color: 0xFF0000 });
            body.rect(20, 6, 6, 6).fill({ color: 0xFF0000 });
        }
    },
    aiProfile: 'tracker',

    // NOUVEAU : L'or est dans la table de loot.
    lootTable: {
        dropChance: 0.80, // 80% de chance de dropper quelque chose
        items: [
            { id: 'health_potion', weight: 0.50 },
            { id: 'short_sword', weight: 0.20 },
            { id: 'gold_coin', weight: 0.30, goldRange: [5, 20] } // 30% de chance d'or
        ]
    }
};
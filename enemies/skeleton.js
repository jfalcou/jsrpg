/**
 * @fileoverview Définition de l'ennemi : Squelette.
 */

export default {
    id: 'skeleton',
    name: 'Squelette',
    renderType: 10, // ID unique pour le pool de rendu PixiJS
    stats: {
        hp: 100,
        speed: 150,
        xp: 250,
        damage: 5
    },
    physics: {
        width: 32,
        height: 32,
        knockbackElasticity: 0.85
    },
    visuals: {
        // Cette fonction est appelée UNE SEULE FOIS par render.js lors de la création du conteneur
        setupVisual: function(body) {
            // Un carré de base gris osseux
            body.rect(0, 0, 32, 32).fill({ color: 0xDDDDDD });
            body.stroke({ width: 2, color: 0x888888 });

            // Ajout de petits yeux rouges menaçants directement dans le body
            body.rect(6, 6, 6, 6).fill({ color: 0xFF0000 }); // Oeil gauche
            body.rect(20, 6, 6, 6).fill({ color: 0xFF0000 }); // Oeil droit
        }
    },
    aiProfile: 'tracker'
};
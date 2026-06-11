/**
 * @fileoverview Définition de base : Épée Courte
 */

export default {
    id: 'short_sword',
    name: 'Épée Courte',
    type: 'weapon',      // Emplacement d'équipement cible
    gridWidth: 1,        // Largeur dans l'inventaire
    gridHeight: 2,       // Hauteur dans l'inventaire
    color: '#aaaaaa',    // Placeholder visuel temporaire pour la UI
    stats: {
        bonusDps: 5      // Dégâts ajoutés lors du recalcul des statistiques
    }
};
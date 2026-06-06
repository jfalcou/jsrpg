/**
 * @fileoverview Gestion de la persistance multi-personnages via LocalStorage.
 */

const SAVE_KEY = 'arpg_saves'; // Clé unique pour stocker les données de sauvegarde dans localStorage

export const Storage = {
    // Récupère le tableau de toutes les sauvegardes
    getAllSaves() {
        const data = localStorage.getItem(SAVE_KEY);
        return data ? JSON.parse(data) : [];
    },

    // Ajoute ou met à jour une sauvegarde existante basée sur son ID
    save(characterData) {
        let saves = this.getAllSaves();
        const index = saves.findIndex(s => s.id === characterData.id);

        if (index !== -1) {
            saves[index] = characterData; // Met à jour
        } else {
            saves.push(characterData);    // Ajoute un nouveau héros
        }

        localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    },

    // Supprime un personnage par son ID
    delete(id) {
        let saves = this.getAllSaves();
        saves = saves.filter(s => s.id !== id);
        localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    },

    // Vérifie s'il y a au moins un personnage sauvegardé
    hasSaves() {
        return this.getAllSaves().length > 0;
    }
};
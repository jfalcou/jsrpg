/**
 * @fileoverview Accès aux données des races chargées depuis le JSON.
 */
import { GameData } from '../core/dataManager.js';

export function getRace(id) {
    return GameData.races[id];
}

export function getAllRaces() {
    return Object.values(GameData.races);
}
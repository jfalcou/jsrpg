/**
 * @fileoverview Factory pour l'initialisation du Héros.
 */

import { addEntity, addComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Velocity, Player, Renderable, Facing, Collider, Dash, Health, PlayerStats, Character, Attributes, BaseAttributes, State, STATES } from '../utils/components.js';

export function spawnPlayer(world, saveData, startX, startY) {
    const hero = addEntity(world);

    addComponent(world, Player, hero);
    addComponent(world, Position, hero);
    addComponent(world, Velocity, hero);
    addComponent(world, Renderable, hero);
    addComponent(world, Facing, hero);
    addComponent(world, Collider, hero);
    addComponent(world, Dash, hero);
    addComponent(world, Character, hero);
    addComponent(world, Health, hero);
    addComponent(world, PlayerStats, hero);
    addComponent(world, BaseAttributes, hero);
    addComponent(world, Attributes, hero);
    addComponent(world, State, hero);

    // Initialisation depuis la sauvegarde
    Health.max[hero]     = saveData.maxHealth;
    Health.current[hero] = saveData.health;

    PlayerStats.level[hero]     = saveData.level;
    PlayerStats.xp[hero]        = saveData.xp;
    PlayerStats.xpToNext[hero]  = saveData.xpToNext;
    PlayerStats.gold[hero]      = saveData.gold || 0;

    BaseAttributes.strength[hero]   = saveData.attributes.str;
    BaseAttributes.dexterity[hero]  = saveData.attributes.dex;
    BaseAttributes.vitality[hero]   = saveData.attributes.vit;
    BaseAttributes.energy[hero]     = saveData.attributes.ene;

    // Valeurs par défaut et résistances brutes
    BaseAttributes.armor[hero]      = 50;
    BaseAttributes.speed[hero]      = 240;
    BaseAttributes.fireRes[hero]    = 10;
    BaseAttributes.coldRes[hero]    = 5;
    BaseAttributes.poisonRes[hero]  = 0;
    BaseAttributes.divineRes[hero]  = 0;
    BaseAttributes.darkRes[hero]    = 0;

    Attributes.speed[hero] = 240;

    // Physique et Rendu
    Position.x[hero]      = startX;
    Position.y[hero]      = startY;
    Facing.x[hero]        = 0;
    Facing.y[hero]        = 1;
    Collider.width[hero]  = 32;
    Collider.height[hero] = 32;
    Renderable.type[hero] = 0;
    State.current[hero] = STATES.IDLE;

    // Initialisation du Dash
    Dash.active[hero]     = 0;
    Dash.timer[hero]      = 0;
    Dash.dirX[hero]       = 0;
    Dash.dirY[hero]       = 0;
    Dash.speed[hero]      = 0;

    return hero;
}
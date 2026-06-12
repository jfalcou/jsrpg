/**
 * @fileoverview Définition des composants de données ECS.
 */

import { defineComponent, Types } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';

export const Position = defineComponent({ x: Types.f32, y: Types.f32 });
export const Velocity = defineComponent({ x: Types.f32, y: Types.f32 });
export const Facing = defineComponent({ x: Types.f32, y: Types.f32 });
export const Collider = defineComponent({ width: Types.f32, height: Types.f32 });
export const Dash = defineComponent({ active: Types.ui8, timer: Types.f32, dirX: Types.f32, dirY: Types.f32, speed: Types.f32 });

export const Health = defineComponent({ current: Types.f32, max: Types.f32 });
export const Knockback = defineComponent({ x: Types.f32, y: Types.f32, elasticity: Types.f32 });
export const HitFlash = defineComponent({ timer: Types.f32 });
export const Lifetime = defineComponent({ timer: Types.f32 });

// AJOUT : 'gold' pour stocker la monnaie du joueur
export const PlayerStats = defineComponent({ xp: Types.f32, xpToNext: Types.f32, level: Types.ui32, gold: Types.ui32 });

export const PlayerCooldowns = defineComponent({ aoe: Types.f32 });
export const NovaFx = defineComponent({ radius: Types.f32, alpha: Types.f32 });
export const SwordFx = defineComponent({ angle: Types.f32, range: Types.f32, alpha: Types.f32 });

export const Renderable = defineComponent({ type: Types.ui8 });

export const BaseAttributes = defineComponent({
    strength: Types.f32, dexterity: Types.f32, vitality: Types.f32, energy: Types.f32,
    armor: Types.f32, speed: Types.f32,
    fireRes: Types.f32, coldRes: Types.f32, poisonRes: Types.f32, divineRes: Types.f32, darkRes: Types.f32
});

export const Attributes = defineComponent({
    strength: Types.f32, dexterity: Types.f32, vitality: Types.f32, energy: Types.f32,
    armor: Types.f32, speed: Types.f32,
    fireRes: Types.f32, coldRes: Types.f32, poisonRes: Types.f32, divineRes: Types.f32, darkRes: Types.f32,
    bonusDps: Types.f32
});

export const AiTracker = defineComponent({ speed: Types.f32, activationRadius: Types.f32, deactivationRadius: Types.f32 });
export const EnemyStats = defineComponent({ xpReward: Types.f32, damage: Types.f32 });

export const Player = defineComponent();
export const Enemy = defineComponent();
export const Bullet = defineComponent();
export const Wall = defineComponent();
export const Character = defineComponent();
export const Loot = defineComponent();

// DICTIONNAIRES HORS-ECS
export const droppedItems = new Map();
export const enemyTypeMap = new Map();
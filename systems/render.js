/**
 * @fileoverview Le pont entre l'ECS, PixiJS et les animations multi-directionnelles.
 */

import { defineQuery, enterQuery, exitQuery, hasComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Renderable, Player, Facing, Collider, HitFlash, droppedItems, State, STATES } from '../utils/components.js';
import { fxRenderers } from '../data/spells/index.js';
import { enemyRenderers } from '../data/enemies_index.js';
import { damageNumbers } from './combat.js';
import { UI_CONFIG } from '../ui/config.js';

// NOUVEAU : On importe le dictionnaire généré par le découpeur automatique
import { globalAnimations } from '../core/spriteParser.js';

const renderQuery = defineQuery([Position, Renderable]);
const renderQueryEnter = enterQuery(renderQuery);
const renderQueryExit = exitQuery(renderQuery);
const playerQuery = defineQuery([Player, Position]);

// HELPER : Récupère les textures selon l'état et la direction
function getAnimTextures(prefix, stateIndex, direction) {
    let stateName = 'idle';
    if (stateIndex === STATES.RUN) stateName = 'run';
    if (stateIndex === STATES.ATTACK) stateName = 'attack';
    if (stateIndex === STATES.DASH) stateName = 'run'; // On réutilise la course pour le dash
    if (stateIndex === STATES.DEAD) stateName = 'dead';

    const animKey = `${prefix}_${stateName}_${direction}`;

    // 1. Cherche l'animation exacte (ex: hero_run_down)
    if (globalAnimations[animKey]) {
        return globalAnimations[animKey];
    }

    // 2. Fallback de sécurité : l'idle dans la bonne direction
    const fallbackDirKey = `${prefix}_idle_${direction}`;
    if (globalAnimations[fallbackDirKey]) {
        return globalAnimations[fallbackDirKey];
    }

    // 3. Fallback d'ultime recours si l'entité n'est pas encore packée
    return [PIXI.Texture.WHITE];
}

export function createRenderSystem(app, worldContainer, camera, screenWidth, screenHeight) {
    const spriteMap = new Map();
    worldContainer.sortableChildren = true;

    const pools = { 0: [], 3: [], 99: [] };
    for (const fxType of fxRenderers.keys()) pools[fxType] = [];
    for (const enType of enemyRenderers.keys()) pools[enType] = [];

    function createContainer(world, eid, type) {
        if (pools[type] && pools[type].length > 0) {
            const container = pools[type].pop();
            container.visible = true;
            return container;
        }

        const container = new PIXI.Container();

        if (type === 0 || enemyRenderers.has(type)) {
            let prefix = 'hero';
            if (type !== 0) {
                const def = enemyRenderers.get(type);
                prefix = def.id;
            }

            const anim = new PIXI.AnimatedSprite([PIXI.Texture.WHITE]);
            anim.anchor.set(0.5);
            const w = hasComponent(world, Collider, eid) ? Collider.width[eid] : 32;
            const h = hasComponent(world, Collider, eid) ? Collider.height[eid] : 32;
            anim.x = w / 2;
            anim.y = h / 2;

            // La vitesse de l'animation
            anim.animationSpeed = 0.12;
            anim.animPrefix = prefix;
            anim.currentState = -1;
            anim.currentDir = 'none';

            container.addChild(anim);

        } else if (type === 3) {
            const body = new PIXI.Graphics();
            const w = hasComponent(world, Collider, eid) ? Collider.width[eid] : 32;
            const h = hasComponent(world, Collider, eid) ? Collider.height[eid] : 32;
            body.rect(0, 0, w, h).fill({ color: 0xFFFFFF });
            body.tint = 0x555555;
            container.addChild(body);

        } else if (type === 99) {
            const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
            sprite.width = 20; sprite.height = 20;
            sprite.x = 8; sprite.y = 8;
            sprite.anchor.set(0.5);
            container.addChild(sprite);

        } else if (fxRenderers.has(type)) {
            const body = new PIXI.Graphics();
            container.addChild(body);
        }

        return container;
    }

    function releaseContainer(container, type) {
        if (pools[type]) {
            container.visible = false;
            const body = container.getChildAt(0);
            if (body) {
                body.tint = 0xFFFFFF;
                body.scale.x = 1;
                if (body instanceof PIXI.AnimatedSprite) body.stop();
                if (fxRenderers.has(type)) body.clear();
            }
            pools[type].push(container);
        } else {
            worldContainer.removeChild(container);
            container.destroy({ children: true });
        }
    }

    const dmgCanvas = document.getElementById('dmg-canvas') || document.createElement('canvas');
    if (!dmgCanvas.id) {
        dmgCanvas.id = 'dmg-canvas';
        dmgCanvas.width = screenWidth;
        dmgCanvas.height = screenHeight;
        dmgCanvas.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;`;
        document.getElementById('center-panel').appendChild(dmgCanvas);
    }
    const dmgCtx = dmgCanvas.getContext('2d');

    return function renderSystem(world, delta) {
        const entered = renderQueryEnter(world);
        for (let i = 0; i < entered.length; i++) {
            const eid = entered[i];
            const type = Renderable.type[eid];
            const container = createContainer(world, eid, type);
            worldContainer.addChild(container);
            spriteMap.set(eid, container);
        }

        const exited = renderQueryExit(world);
        for (let i = 0; i < exited.length; i++) {
            const eid = exited[i];
            const container = spriteMap.get(eid);
            const type = Renderable.type[eid];
            if (container) {
                releaseContainer(container, type);
                spriteMap.delete(eid);
            }
        }

        const players = playerQuery(world);
        if (players.length > 0) {
            const pid = players[0];
            const zoom = UI_CONFIG.zoomLevel;

            camera.x = (screenWidth / 2 / zoom) - (Position.x[pid] + 16);
            camera.y = (screenHeight / 2 / zoom) - (Position.y[pid] + 16);
            worldContainer.x = camera.x * zoom;
            worldContainer.y = camera.y * zoom;
        }

        const entities = renderQuery(world);
        for (let i = 0; i < entities.length; i++) {
            const eid = entities[i];
            const container = spriteMap.get(eid);
            const type = Renderable.type[eid];

            if (!container) continue;

            if (enemyRenderers.has(type) || type === 99) {
                const sx = Position.x[eid] + camera.x;
                const sy = Position.y[eid] + camera.y;
                if (sx < -64 || sx > screenWidth + 64 || sy < -64 || sy > screenHeight + 64) {
                    container.visible = false;
                    continue;
                }
                container.visible = true;
            }

            container.x = Position.x[eid];
            container.y = Position.y[eid];

            const baseHeight = hasComponent(world, Collider, eid) ? Collider.height[eid] : 32;
            if (type === 99) container.zIndex = Position.y[eid];
            else if (fxRenderers.has(type)) container.zIndex = Position.y[eid] + 10000;
            else container.zIndex = Position.y[eid] + baseHeight;

            const body = container.getChildAt(0);

            // GESTION DU SPRITE ANIMÉ (4-DIRECTIONS)
            if (body instanceof PIXI.AnimatedSprite) {
                const state = State.current[eid];
                const facingX = Facing.x[eid];
                const facingY = Facing.y[eid];

                // Calcul de la direction dominante sous forme de chaîne ('up', 'down', 'left', 'right')
                let dir = 'down';
                if (Math.abs(facingX) > Math.abs(facingY)) {
                    dir = facingX > 0 ? 'right' : 'left';
                } else {
                    if (facingY < 0) dir = 'up';
                    else if (facingY > 0) dir = 'down';
                }

                // Changement d'animation SEULEMENT si l'état ou la direction a changé
                if (body.currentState !== state || body.currentDir !== dir) {
                    const newTextures = getAnimTextures(body.animPrefix, state, dir);
                    if (newTextures.length > 0) {
                        body.textures = newTextures;
                        body.play();
                    }
                    body.currentState = state;
                    body.currentDir = dir;
                }

                // Effet de clignotement rouge sur les dégâts
                if (hasComponent(world, HitFlash, eid) && HitFlash.timer[eid] > 0) {
                    body.tint = 0xFF5555;
                } else {
                    body.tint = 0xFFFFFF;
                }
                continue;
            }

            // Gestion du Loot et des Effets de Sorts
            if (type === 99) {
                const itemData = droppedItems.get(eid);
                if (itemData && itemData.color) body.tint = parseInt(itemData.color.replace('#', ''), 16);
                body.rotation += delta * 2;
                continue;
            }

            const spell = fxRenderers.get(type);
            if (spell?.renderFx) {
                spell.renderFx(body, eid);
                continue;
            }
        }

        // Rendu des nombres flottants de dégâts
        dmgCtx.clearRect(0, 0, screenWidth, screenHeight);
        for (let i = damageNumbers.length - 1; i >= 0; i--) {
            const dn = damageNumbers[i];
            dn.timer -= delta;
            dn.y += dn.vy * delta;
            dn.alpha = dn.timer / 0.8;

            if (dn.timer <= 0) {
                damageNumbers.splice(i, 1);
                continue;
            }

            const sx = dn.x + camera.x;
            const sy = dn.y + camera.y;

            dmgCtx.save();
            dmgCtx.globalAlpha = dn.alpha;
            dmgCtx.font = `bold ${dn.fontSize}px "Uncial Antiqua", cursive`;
            dmgCtx.fillStyle = dn.color;
            dmgCtx.strokeStyle = 'rgba(0,0,0,0.8)';
            dmgCtx.lineWidth = 3;
            dmgCtx.textAlign = 'center';
            dmgCtx.strokeText(dn.damage, sx, sy);
            dmgCtx.fillText(dn.damage, sx, sy);
            dmgCtx.restore();
        }

        return world;
    };
}
/**
 * @fileoverview Le pont entre l'ECS et PixiJS + chiffres flottants.
 */

import { defineQuery, enterQuery, exitQuery, hasComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Renderable, Player, Facing, Collider, HitFlash } from '../utils/components.js';
import { fxRenderers } from '../spells/index.js';
import { enemyRenderers } from '../enemies/index.js';
import { damageNumbers } from './combat.js';

const renderQuery = defineQuery([Position, Renderable]);
const renderQueryEnter = enterQuery(renderQuery);
const renderQueryExit = exitQuery(renderQuery);
const playerQuery = defineQuery([Player, Position]);

export function createRenderSystem(app, worldContainer, camera, screenWidth, screenHeight) {
    const spriteMap = new Map();
    const eyeMap = new Map();

    // Pool générique — inclut les types de base et les registres dynamiques
    const pools = { 0: [], 3: [] }; // 0 = Joueur, 3 = Mur
    for (const fxType of fxRenderers.keys()) {
        pools[fxType] = [];
    }
    for (const enType of enemyRenderers.keys()) {
        pools[enType] = [];
    }

    function createContainer(world, eid, type) {
        if (pools[type] && pools[type].length > 0) {
            const container = pools[type].pop();
            container.visible = true;
            return container;
        }

        const container = new PIXI.Container();
        const body = new PIXI.Graphics();
        container.addChild(body);

        if (type === 0) {
            body.rect(0, 0, 32, 32).fill({ color: 0xFFFFFF });
            const eye = new PIXI.Graphics();
            eye.rect(0, 0, 8, 8).fill({ color: 0xFFFFFF });
            container.addChild(eye);
            body.tint = 0x0074D9;
        } else if (type === 3) {
            const w = hasComponent(world, Collider, eid) ? Collider.width[eid] : 32;
            const h = hasComponent(world, Collider, eid) ? Collider.height[eid] : 32;
            body.rect(0, 0, w, h).fill({ color: 0xFFFFFF });
            body.tint = 0x555555;
        } else if (enemyRenderers.has(type)) {
            // Délégation du dessin initial au fichier de configuration de l'ennemi
            const enemyDef = enemyRenderers.get(type);
            if (enemyDef.visuals && enemyDef.visuals.setupVisual) {
                enemyDef.visuals.setupVisual(body);
            }
        } else {
            // Tous les FX de sorts — le body reste vide et est redessiné à chaque frame dans renderFx
        }

        return container;
    }

    function releaseContainer(container, type) {
        if (pools[type]) {
            container.visible = false;
            const body = container.getChildAt(0);
            if (body) {
                body.tint = 0xFFFFFF;
                if (fxRenderers.has(type)) {
                    body.clear();
                }
            }
            pools[type].push(container);
        } else {
            worldContainer.removeChild(container);
            container.destroy({ children: true });
        }
    }

    // Canvas 2D superposé pour les chiffres flottants
    const dmgCanvas = document.createElement('canvas');
    dmgCanvas.width = screenWidth;
    dmgCanvas.height = screenHeight;
    dmgCanvas.style.cssText = `
        position: absolute; top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none; z-index: 5;
    `;
    document.getElementById('center-panel').appendChild(dmgCanvas);
    const dmgCtx = dmgCanvas.getContext('2d');

    return function renderSystem(world, delta) {

        // ENTRÉES
        const entered = renderQueryEnter(world);
        for (let i = 0; i < entered.length; i++) {
            const eid = entered[i];
            const type = Renderable.type[eid];
            const container = createContainer(world, eid, type);
            if (type === 0) eyeMap.set(eid, container.getChildAt(1));
            worldContainer.addChild(container);
            spriteMap.set(eid, container);
        }

        // SORTIES
        const exited = renderQueryExit(world);
        for (let i = 0; i < exited.length; i++) {
            const eid = exited[i];
            const container = spriteMap.get(eid);
            const type = Renderable.type[eid];
            if (container) {
                releaseContainer(container, type);
                spriteMap.delete(eid);
                if (eyeMap.has(eid)) eyeMap.delete(eid);
            }
        }

        // CAMÉRA
        const players = playerQuery(world);
        if (players.length > 0) {
            const pid = players[0];
            camera.x = (screenWidth / 2) - (Position.x[pid] + 16);
            camera.y = (screenHeight / 2) - (Position.y[pid] + 16);
            worldContainer.x = camera.x;
            worldContainer.y = camera.y;
        }

        // MISE À JOUR POSITIONS ET VISUELS
        const entities = renderQuery(world);
        for (let i = 0; i < entities.length; i++) {
            const eid = entities[i];
            const container = spriteMap.get(eid);
            const type = Renderable.type[eid];

            if (!container) continue;

            // Frustum Culling : S'applique uniquement aux ennemis enregistrés dynamiquement
            if (enemyRenderers.has(type)) {
                const sx = Position.x[eid] + camera.x;
                const sy = Position.y[eid] + camera.y;
                const onScreen = sx > -64 && sx < screenWidth + 64 &&
                                 sy > -64 && sy < screenHeight + 64;
                if (!onScreen) {
                    container.visible = false;
                    continue;
                }
                container.visible = true;
            }

            container.x = Position.x[eid];
            container.y = Position.y[eid];

            if (hasComponent(world, Facing, eid)) {
                const eye = eyeMap.get(eid);
                if (eye) {
                    eye.x = 12 + Facing.x[eid] * 12;
                    eye.y = 12 + Facing.y[eid] * 12;
                }
            }

            const body = container.getChildAt(0);

            // FX des sorts — rendu dynamique via le dictionnaire de sorts
            const spell = fxRenderers.get(type);
            if (spell?.renderFx) {
                spell.renderFx(body, eid);
                continue;
            }

            // HitFlash & Teintes globales
            if (hasComponent(world, HitFlash, eid) && HitFlash.timer[eid] > 0) {
                body.tint = 0xFFFFFF; // Flash blanc à l'impact
            } else {
                if (type === 0) {
                    body.tint = 0x0074D9;
                } else if (type === 3) {
                    body.tint = 0x555555;
                } else {
                    body.tint = 0xFFFFFF; // Rétablissement visuel des ennemis modulaires
                }
            }
        }

        // CHIFFRES FLOTTANTS
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
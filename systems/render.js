/**
 * @fileoverview Le pont entre l'ECS et PixiJS.
 */

import { defineQuery, enterQuery, exitQuery, hasComponent } from 'https://cdn.jsdelivr.net/npm/bitecs@0.3.40/+esm';
import { Position, Renderable, Player, Facing, Collider, HitFlash, NovaFx } from '../utils/components.js';

const renderQuery = defineQuery([Position, Renderable]);
const renderQueryEnter = enterQuery(renderQuery);
const renderQueryExit = exitQuery(renderQuery);
const playerQuery = defineQuery([Player, Position]);

export function createRenderSystem(app, worldContainer, camera, screenWidth, screenHeight) {
    const spriteMap = new Map();
    const eyeMap = new Map();

    // Pool par type — on stocke les containers inutilisés
    const pools = {
        1: [], // ennemis
        2: [], // balles
    };

    function createContainer(world, eid, type) {
        // Si un container est disponible dans le pool, on le réutilise
        if (pools[type] && pools[type].length > 0) {
            const container = pools[type].pop();
            container.visible = true;
            return container;
        }

        // Sinon on en crée un nouveau
        const container = new PIXI.Container();
        const body = new PIXI.Graphics();

        if (type === 0) {
            body.rect(0, 0, 32, 32).fill({ color: 0xFFFFFF });
            container.addChild(body);
            const eye = new PIXI.Graphics();
            eye.rect(0, 0, 8, 8).fill({ color: 0xFFFFFF });
            container.addChild(eye);
        } else if (type === 1) {
            body.moveTo(16, 0).lineTo(32, 32).lineTo(0, 32).closePath().fill({ color: 0xFFFFFF });
            container.addChild(body);
        } else if (type === 2) {
            body.rect(0, 0, 8, 8).fill({ color: 0xFFFFFF });
            container.addChild(body);
        } else if (type === 3) {
            const w = hasComponent(world, Collider, eid) ? Collider.width[eid] : 32;
            const h = hasComponent(world, Collider, eid) ? Collider.height[eid] : 32;
            body.rect(0, 0, w, h).fill({ color: 0xFFFFFF });
            container.addChild(body);
        } else if (type === 4) {
            container.addChild(body);
        }

        if (type === 0) body.tint = 0x0074D9;
        else if (type === 1) body.tint = 0xFF4136;
        else if (type === 2) body.tint = 0xFFDC00;
        else if (type === 3) body.tint = 0x555555;

        return container;
    }

    function releaseContainer(container, type) {
        // Si le type est poolable, on cache et on stocke
        if (pools[type]) {
            container.visible = false;
            // Reset du tint au cas où HitFlash l'aurait modifié
            const body = container.getChildAt(0);
            if (body) {
                if (type === 1) body.tint = 0xFF4136;
                else if (type === 2) body.tint = 0xFFDC00;
            }
            pools[type].push(container);
        } else {
            // Types non poolables : on détruit vraiment
            worldContainer.removeChild(container);
            container.destroy({ children: true });
        }
    }

    return function renderSystem(world, delta) {

        // ENTRÉES — spawn d'entités
        const entered = renderQueryEnter(world);
        for (let i = 0; i < entered.length; i++) {
            const eid = entered[i];
            const type = Renderable.type[eid];

            const container = createContainer(world, eid, type);

            // Pour l'oeil du joueur
            if (type === 0) eyeMap.set(eid, container.getChildAt(1));

            worldContainer.addChild(container);
            spriteMap.set(eid, container);
        }

        // SORTIES — mort d'entités
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

        // MISE À JOUR DES POSITIONS ET VISUELS
        const entities = renderQuery(world);
        for (let i = 0; i < entities.length; i++) {
            const eid = entities[i];
            const container = spriteMap.get(eid);
            const type = Renderable.type[eid];

            if (container) {

                // CULLING — on skip les ennemis et balles hors écran
                if (type === 1 || type === 2) {
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

                // Nova — dessin dynamique
                if (type === 4 && hasComponent(world, NovaFx, eid)) {
                    body.clear();
                    const r = Math.max(1, NovaFx.radius[eid]);
                    const a = Math.max(0, NovaFx.alpha[eid]);
                    body.circle(0, 0, r)
                        .fill({ color: 0x00FFFF, alpha: a * 0.2 })
                        .stroke({ width: 6, color: 0x00FFFF, alpha: a });
                    continue;
                }

                // HitFlash
                if (hasComponent(world, HitFlash, eid) && HitFlash.timer[eid] > 0) {
                    body.tint = 0xFFFFFF;
                } else {
                    if (type === 0) body.tint = 0x0074D9;
                    else if (type === 1) body.tint = 0xFF4136;
                    else if (type === 2) body.tint = 0xFFDC00;
                    else if (type === 3) body.tint = 0x555555;
                }
            }
        }

        return world;
    };
}
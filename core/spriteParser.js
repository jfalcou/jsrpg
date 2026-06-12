/**
 * @fileoverview Découpeur automatique de Spritesheets en grille régulière (RPG Maker style).
 */

// L'importation de PIXI a été supprimée.
// L'objet PIXI est injecté globalement par la balise <script> de index.html.

// Dictionnaire global qui remplacera l'atlas JSON
export const globalAnimations = {};

/**
 * Découpe une grille et génère les animations directionnelles.
 * Format attendu : Ligne 0 (Bas), Ligne 1 (Gauche), Ligne 2 (Droite), Ligne 3 (Haut)
 * Colonnes : Pied gauche (0), Immobile (1), Pied droit (2)
 */
export function sliceGridSpritesheet(textureAlias, prefix, cols = 3, rows = 4) {
    const baseTex = PIXI.Assets.get(textureAlias);
    if (!baseTex) throw new Error(`Texture introuvable : ${textureAlias}`);

    const frameWidth = baseTex.width / cols;
    const frameHeight = baseTex.height / rows;

    const frames = [];
    for (let r = 0; r < rows; r++) {
        const rowFrames = [];
        for (let c = 0; c < cols; c++) {
            const rect = new PIXI.Rectangle(c * frameWidth, r * frameHeight, frameWidth, frameHeight);
            rowFrames.push(new PIXI.Texture({ source: baseTex.source, frame: rect }));
        }
        frames.push(rowFrames);
    }

    // Assignation des états IMMOBILES (Idle)
    globalAnimations[`${prefix}_idle_down`] = [frames[0][1]];
    globalAnimations[`${prefix}_idle_left`] = [frames[1][1]];
    globalAnimations[`${prefix}_idle_right`] = [frames[2][1]];
    globalAnimations[`${prefix}_idle_up`] = [frames[3][1]];

    // Assignation des états de COURSE (Run) - Ping-pong : 0 -> 1 -> 2 -> 1
    globalAnimations[`${prefix}_run_down`] = [frames[0][0], frames[0][1], frames[0][2], frames[0][1]];
    globalAnimations[`${prefix}_run_left`] = [frames[1][0], frames[1][1], frames[1][2], frames[1][1]];
    globalAnimations[`${prefix}_run_right`] = [frames[2][0], frames[2][1], frames[2][2], frames[2][1]];
    globalAnimations[`${prefix}_run_up`] = [frames[3][0], frames[3][1], frames[3][2], frames[3][1]];

    // Fallback pour les autres états en attendant de vrais sprites dédiés (Attack, Dash, Dead)
    globalAnimations[`${prefix}_attack_down`] = [frames[0][0]];
    globalAnimations[`${prefix}_dash_down`] = [frames[0][0]];
    globalAnimations[`${prefix}_dead_down`] = [frames[0][1]]; // En l'état, on fige le cadavre
}
export const UI_CONFIG = {
    zoomLevel: 2,
    bag: { width: 5, height: 4 },
    equipGrid: { width: 3, height: 5 },
    cell: 80,
    gap: 2,
    lootExpiry: 120000,
    equipment: [
        { id: 'helm'  , label: 'Tête'   , col: 2, row: 1, w: 1, h: 1 },
        { id: 'amulet', label: 'Cou'    , col: 3, row: 1, w: 1, h: 1 },
        { id: 'weapon', label: 'Arme'   , col: 1, row: 2, w: 1, h: 2 },
        { id: 'armor' , label: 'Torse'  , col: 2, row: 2, w: 1, h: 2 },
        { id: 'shield', label: 'Bouclier',col: 3, row: 2, w: 1, h: 2 },
        { id: 'hands' , label: 'Mains'  , col: 1, row: 4, w: 1, h: 1 },
        { id: 'belt'  , label: 'Taille' , col: 2, row: 4, w: 1, h: 1 },
        { id: 'boots' , label: 'Pieds'  , col: 3, row: 4, w: 1, h: 1 },
        { id: 'ring1' , label: 'Doigt'  , col: 1, row: 5, w: 1, h: 1 },
        { id: 'ring2' , label: 'Doigt'  , col: 3, row: 5, w: 1, h: 1 }
    ]
};

export const STEP = UI_CONFIG.cell + UI_CONFIG.gap;
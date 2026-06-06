import human from './human.js';
import elf from './elf.js';
import dwarf from './dwarf.js';

export const races = { 'human': human, 'elf': elf, 'dwarf': dwarf };

export function getRace(id) {
    return races[id];// || human;
}
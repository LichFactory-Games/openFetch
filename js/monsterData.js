export function mapAbilities(monsterData) {
  return {
    str: { value: monsterData.strength },
    dex: { value: monsterData.dexterity },
    con: { value: monsterData.constitution },
    int: { value: monsterData.intelligence },
    wis: { value: monsterData.wisdom },
    cha: { value: monsterData.charisma }
  };
}

export function mapAttributes(monsterData) {
  return {
    ac: { flat: monsterData.armor_class, calc: "natural" },
    hp: { value: monsterData.hit_points, max: monsterData.hit_points, temp: 0, formula: monsterData.hit_dice },
    movement: mapMovement(monsterData.speed),
    senses: parseSenses(monsterData.senses)
  };
}

// Other helper functions like parseSenses, mapMovement can go here...

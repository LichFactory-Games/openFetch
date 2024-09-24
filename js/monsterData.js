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
    movement: mapMovement(monsterData.speed),  // Fixed reference
    senses: parseSenses(monsterData.senses)    // Fixed reference
  };
}

export function mapDetails(monsterData) {
  return {
    alignment: monsterData.alignment || "Unaligned",
    type: { value: monsterData.type || "Unknown", subtype: monsterData.subtype || "" },
    cr: monsterData.cr || 1
  };
}

export function mapSkills(monsterData, skillMapping) {
  const skills = {};
  for (const [skillName, skillInfo] of Object.entries(skillMapping)) {
    const skillValue = monsterData.skills[skillName.toLowerCase()];
    skills[skillInfo.id] = {
      value: skillValue || 0,
      ability: skillInfo.ability
    };
  }
  return skills;
}

export function mapMovement(speed) {
  const movement = {};
  for (let type in speed) {
    movement[type] = speed[type];
  }
  return movement;
}

export function parseSenses(senses) {
  const senseData = { darkvision: null, blindsight: null, tremorsense: null, truesight: null, 'passive perception': null };
  if (!senses) return senseData;

  const senseRegex = /(\w+)\s(\d+)\sft\.|passive perception (\d+)/g;
  let match;
  while ((match = senseRegex.exec(senses)) !== null) {
    if (match[1] && match[2]) {
      senseData[match[1].toLowerCase()] = parseInt(match[2], 10);
    } else if (match[3]) {
      senseData['passive perception'] = parseInt(match[3], 10);
    }
  }
  return senseData;
}

export function parseTraitData(traitString) {
  const traitSet = new Set();
  if (traitString) {
    const traits = traitString.split(",").map(trait => trait.trim());
    traits.forEach(trait => {
      if (trait) traitSet.add(trait);
    });
  }
  return { custom: "", value: Array.from(traitSet) };
}

export function parseLanguages(languages) {
  const languageData = { value: [], custom: '' };
  if (!languages) return languageData;

  languages.split(',').forEach(lang => {
    lang = lang.trim();
    if (lang.startsWith('telepathy')) {
      languageData.custom = lang;
    } else {
      languageData.value.push(lang);
    }
  });

  return languageData;
}

export function extractResources(monsterData) {
  // Customize for resources, legendary actions, etc. as needed
  return {};
}

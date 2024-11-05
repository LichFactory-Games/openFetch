// monsterData.js

// Define the sizeMap as a constant
const sizeMap = {
  tiny: "tiny",
  small: "sm",
  medium: "med",
  large: "lg",
  huge: "huge",
  gargantuan: "grg"
};

// Function to map size
export function mapSize(size) {
  return sizeMap[size.toLowerCase()] || "med";
}

export const abilitiesList = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const abilityMapping = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma'
};


// Skills as a constant
export const skillMapping = {
  "Acrobatics": { id: "acr", ability: "dex" },
  "Animal Handling": { id: "ani", ability: "wis" },
  "Arcana": { id: "arc", ability: "int" },
  "Athletics": { id: "ath", ability: "str" },
  "Deception": { id: "dec", ability: "cha" },
  "History": { id: "his", ability: "int" },
  "Insight": { id: "ins", ability: "wis" },
  "Intimidation": { id: "itm", ability: "cha" },
  "Investigation": { id: "inv", ability: "int" },
  "Medicine": { id: "med", ability: "wis" },
  "Nature": { id: "nat", ability: "int" },
  "Perception": { id: "prc", ability: "wis" },
  "Performance": { id: "prf", ability: "cha" },
  "Persuasion": { id: "per", ability: "cha" },
  "Religion": { id: "rel", ability: "int" },
  "Sleight of Hand": { id: "slt", ability: "dex" },
  "Stealth": { id: "ste", ability: "dex" },
  "Survival": { id: "sur", ability: "wis" }
};

//// Mapping functions
// Map nearest monster image from srd to open5e monster
export async function mapImage(monsterName) {
  // Get the D&D 5e SRD Monsters compendium
  const compendium = game.packs.get('dnd5e.monsters');
  if (!compendium) {
    console.warn('Compendium dnd5e.monsters not found.');
    return null;
  }

  // Get the index of the compendium with the 'img' field included
  const index = await compendium.getIndex({ fields: ['img'] });

  // Normalize the monster name for comparison
  const normalizeName = name => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
  const normalizedMonsterName = normalizeName(monsterName);

  // Try to find an exact match first
  let entry = index.find(e => normalizeName(e.name) === normalizedMonsterName);

  // If no exact match, try partial matches
  if (!entry) {
    entry = index.find(e =>
      normalizeName(e.name).includes(normalizedMonsterName) ||
        normalizedMonsterName.includes(normalizeName(e.name))
    );
  }

  if (entry) {
    return entry.img;
  } else {
    console.warn(`Monster "${monsterName}" not found in compendium.`);
    return null;
  }
}

export function mapAbilities(monsterData) {
  const abilities = {};

  for (const ab of abilitiesList) {
    const abilityScore = Number(monsterData[abilityMapping[ab]]);
    const abilityModifier = Math.floor((abilityScore - 10) / 2);

    abilities[ab] = {
      value: abilityScore,
      mod: abilityModifier,
      proficient: 0, // Will be updated in mapSavingThrows
      bonuses: {
        check: "", // Additional bonuses to ability checks
        save: "",  // Additional bonuses to saving throws
      },
      max: null, // Optional, can be omitted if not needed
    };
  }
  return abilities;
}

export function processSpecialAbilities(abilities) {
  if (!Array.isArray(abilities)) return [];

  return abilities.map(ability => {
    // Clean up description
    let description = ability.desc
        .replace(/([._])\s*\n/g, '$1 ') // Fix broken lines
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

    // Extract any numeric values that might be important
    const numbers = description.match(/\d+/g) || [];

    return {
      name: ability.name.trim(),
      description: description,
      type: determineAbilityType(ability.name, description),
      values: numbers.map(Number)
    };
  });
}

function determineAbilityType(name, desc) {
  name = name.toLowerCase();
  if (name.includes('resistance')) return 'resistance';
  if (name.includes('immunity')) return 'immunity';
  if (name.includes('vulnerability')) return 'vulnerability';
  if (desc.includes('DC')) return 'save';
  return 'feature';
}

export function mapSavingThrows(monsterData, abilities) {
  const proficiencyBonus = calculateProficiencyBonus(monsterData.challenge_rating);

  for (const ab in abilities) {
    const saveField = `${abilityMapping[ab]}_save`;
    let saveTotalModifier = monsterData[saveField];

    if (saveTotalModifier !== null && saveTotalModifier !== undefined) {
      saveTotalModifier = Number(saveTotalModifier);
      const abilityModifier = abilities[ab].mod;

      // Monster is proficient in this saving throw
      abilities[ab].proficient = 1;

      // Calculate any additional bonus
      const expectedModifier = abilityModifier + proficiencyBonus;
      let bonus = saveTotalModifier - expectedModifier;

      // Assign bonuses
      abilities[ab].bonuses.save = bonus !== 0 ? `${bonus}` : "";
    }
  }
}



export function mapAttributes(monsterData) {
  return {
    ac: {
      flat: monsterData.armor_class,
      calc: "natural",
      formula: ""
    },
    hp: {
      value: monsterData.hit_points,
      max: monsterData.hit_points,
      temp: 0,
      tempmax: 0,
      formula: monsterData.hit_dice
    },
    init: {
      ability: "dex",
      bonus: ""
    },
    movement: mapMovement(monsterData.speed),
    senses: parseSenses(monsterData.senses),
    attunement: { max: 3 },
    spellcasting: "", // Assume empty unless specified
    exhaustion: 0,
    concentration: {
      ability: "", // Typically empty for monsters unless they cast spells
      roll: {
        min: null,
        max: null,
        mode: 0
      },
      bonuses: {
        save: ""
      },
      limit: 1
    },
    death: {
      ability: "",
      roll: {
        min: null,
        max: null,
        mode: 0
      },
      success: 0,
      failure: 0
    }
  };
}

export function mapDetails(monsterData) {
  try {
    // Handle biography
    const description = monsterData.desc && monsterData.desc.trim() !== ""
          ? `<p>${monsterData.desc}</p>`
          : "<p>No description available.</p>";

    // Handle alignment
    const alignment = monsterData.alignment && monsterData.alignment.trim() !== ""
          ? monsterData.alignment
          : "Unaligned";

    // Handle environment
    let environment = "Unknown";
    if (monsterData.environment && monsterData.environment.trim() !== "") {
      environment = monsterData.environment;
    }

    // Handle challenge rating
    const cr = monsterData.challenge_rating && monsterData.challenge_rating.trim() !== ""
          ? parseCR(monsterData.challenge_rating)
          : 1; // Default to 1 if not provided

    // Normalize creature type to lowercase
    const creatureType = monsterData.type
          ? monsterData.type.toLowerCase()
          : "unknown";

    // Check if creatureType is one of the predefined types
    const predefinedTypes = [
      "aberration",
      "beast",
      "celestial",
      "construct",
      "dragon",
      "elemental",
      "fey",
      "fiend",
      "giant",
      "humanoid",
      "monstrosity",
      "ooze",
      "plant",
      "undead"
    ];

    const isPredefinedType = predefinedTypes.includes(creatureType);


    return {
      biography: {
        value: description,
        public: ""
      },
      alignment: capitalizeFirstLetter(alignment),
      race: null, // Could derive from 'type' or 'subtype' if applicable
      type: {
        value: isPredefinedType ? creatureType : "",
        subtype: monsterData.subtype ? capitalizeFirstLetter(monsterData.subtype) : "",
        swarm: "",
        custom: isPredefinedType ? "" : capitalizeFirstLetter(monsterData.type) || "Unknown"
      },
      environment: environment,
      cr: cr,
      spellLevel: 0,
      source: {
        custom: "",
        book: monsterData.document__title || "Open5e",
        page: "",
        license: monsterData.document__license_url || "Unknown License"
      },
      ideal: "",
      bond: "",
      flaw: ""
    };
  } catch (error) {
    console.error("Error in mapDetails:", error);
    return {};
  }
}

//// Helper functions
function capitalizeFirstLetter(string) {
  if (!string || string.trim() === "") return "Unknown";
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function parseCR(crString) {
  if (!crString || typeof crString !== 'string') return 0;

  crString = crString.trim();
  if (crString === '') return 0;

  // Handle fractions
  if (crString.includes('/')) {
    const [numerator, denominator] = crString.split('/').map(Number);
    return numerator / denominator;
  }

  // Handle numeric values
  const cr = Number(crString);
  return isNaN(cr) ? 0 : cr;
}

/////


export function mapTraitData(monsterData) {
  return {
    dv: parseTraitData(monsterData.damage_vulnerabilities),
    dr: parseTraitData(monsterData.damage_resistances),
    di: parseTraitData(monsterData.damage_immunities),
    ci: parseTraitData(monsterData.condition_immunities),
    languages: parseLanguages(monsterData.languages)
  };
}

export function mapSkills(monsterData) {
  const skills = {};
  const proficiencyBonus = calculateProficiencyBonus(monsterData.challenge_rating);

  for (const [skillName, skillInfo] of Object.entries(skillMapping)) {
    const skillKey = skillName.toLowerCase();
    let skillTotalModifier = monsterData.skills ? monsterData.skills[skillKey] : undefined;

    if (skillTotalModifier !== undefined && skillTotalModifier !== null) {
      skillTotalModifier = Number(skillTotalModifier);
    }

    const abilityName = abilityMapping[skillInfo.ability];
    const abilityScore = Number(monsterData[abilityName]);
    const abilityModifier = Math.floor((abilityScore - 10) / 2);

    let value = 0; // Proficiency level
    let bonus = "";

    if (!isNaN(skillTotalModifier)) {
      const expectedModifierProficient = abilityModifier + proficiencyBonus;
      const expectedModifierExpertise = abilityModifier + (proficiencyBonus * 2);

      if (skillTotalModifier === expectedModifierExpertise) {
        value = 2; // Expertise
      } else if (skillTotalModifier === expectedModifierProficient) {
        value = 1; // Proficient
      } else if (skillTotalModifier > expectedModifierExpertise) {
        value = 2; // Expertise
        bonus = `${skillTotalModifier - expectedModifierExpertise}`;
      } else if (skillTotalModifier > expectedModifierProficient) {
        value = 1; // Proficient
        bonus = `${skillTotalModifier - expectedModifierProficient}`;
      } else {
        // Not proficient, but has a bonus or penalty
        value = 0;
        bonus = `${skillTotalModifier - abilityModifier}`;
      }
    }

    skills[skillInfo.id] = {
      value: value,
      ability: skillInfo.ability,
      bonuses: {
        check: bonus,   // Additional bonuses to skill checks
        passive: "",    // Additional bonuses to passive checks
      },
    };
  }
  return skills;
}




//// Helper function
export function calculateProficiencyBonus(challengeRating) {
  let cr = challengeRating;
  if (typeof cr === 'string') {
    if (cr.includes('/')) {
      const [numerator, denominator] = cr.split('/').map(Number);
      cr = numerator / denominator;
    } else {
      cr = parseFloat(cr);
    }
  }
  if (isNaN(cr)) {
    console.warn(`Invalid challenge rating: ${challengeRating}. Defaulting proficiency bonus to 2.`);
    cr = 0;
  }
  // Proficiency bonus calculation based on D&D 5e rules
  if (cr >= 1) {
    return Math.floor((cr - 1) / 4) + 2;
  } else {
    return 2; // For CR 0
  }
}
/////

function mapMovement(speed) {
  const movement = {
    walk: 0,
    swim: 0,
    fly: 0,
    climb: 0,
    burrow: 0
  };

  // Handle string format ("walk 30 ft.")
  if (typeof speed === 'string') {
    const parts = speed.toLowerCase().split(',');
    parts.forEach(part => {
      const match = part.match(/(\w+)\s+(\d+)/);
      if (match && movement.hasOwnProperty(match[1])) {
        movement[match[1]] = parseInt(match[2]);
      }
    });
  }
  // Handle object format ({walk: 30, swim: 20})
  else if (typeof speed === 'object' && speed !== null) {
    Object.entries(speed).forEach(([type, value]) => {
      if (movement.hasOwnProperty(type)) {
        movement[type] = typeof value === 'string' ?
          parseInt(value.replace(/\D/g, '')) : value;
      }
    });
  }

  return movement;
}

//// Parsers

function parseTraitData(traitString) {
  const traitSet = new Set();
  if (traitString) {
    const traits = traitString.split(",").map(trait => trait.trim());
    traits.forEach(trait => {
      if (trait) {
        traitSet.add(trait);
      }
    });
  }
  return {
    custom: "",
    value: Array.from(traitSet)  // Convert the Set to an Array here
  };
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

function parseSenses(sensesString) {
  const senses = {
    darkvision: 0,
    blindsight: 0,
    tremorsense: 0,
    truesight: 0,
    special: ''
  };

  if (!sensesString) return senses;

  // Split on commas and process each sense
  sensesString.split(',').forEach(sense => {
    sense = sense.toLowerCase().trim();

    // Extract numeric values and units
    const match = sense.match(/(\w+)\s+(\d+)\s*(?:ft|feet)?\.?/i);
    if (match) {
      const [_, type, range] = match;
      if (senses.hasOwnProperty(type)) {
        senses[type] = parseInt(range);
      }
    }
    // Handle special senses
    else if (!sense.includes('passive')) {
      senses.special += (senses.special ? ', ' : '') + sense;
    }
  });

  return senses;
}

export function extractResources(monsterData) {
  let legendaryActions = 0;
  let legendaryResistances = 0;
  let lairActions = false;
  let lairInitiative = null;

  // Extract Legendary Resistances from special abilities
  monsterData.special_abilities?.forEach(ability => {
    const abilityName = ability.name.toLowerCase();

    // Checking for Legendary Resistance
    if (abilityName.includes("legendary resistance")) {
      const resistanceMatch = ability.name.match(/legendary resistance\s*\((\d+)\s*\/\s*day\)/i);
      legendaryResistances = resistanceMatch ? parseInt(resistanceMatch[1], 10) : 3; // Default to 3 if not specified
    }

    // Checking for Lair Actions
    if (abilityName.includes("lair actions")) {
      lairActions = true;
      const initiativeMatch = ability.desc.match(/initiative count (\d+)/i);
      lairInitiative = initiativeMatch ? parseInt(initiativeMatch[1], 10) : 20; // Default to 20
    }
  });

  // Extract Legendary Actions count from legendary_desc
  if (monsterData.legendary_desc) {
    const legActionMatch = monsterData.legendary_desc.match(/can take (\d+) legendary actions/i);
    legendaryActions = legActionMatch ? parseInt(legActionMatch[1], 10) : 3; // Default to 3
  } else if (monsterData.legendary_actions?.length > 0) {
    legendaryActions = 3; // Default to 3 if legendary actions are present but count isn't specified
  }

  return {
    legact: { value: legendaryActions, max: legendaryActions },
    legres: { value: legendaryResistances, max: legendaryResistances },
    lair: { value: lairActions, initiative: lairInitiative }
  };
}

export function extractBonuses(monsterData) {
  // Example: Assuming the presence of specific attack and spell bonus info
  const spellDC = monsterData.special_abilities?.find(sa => sa.name === "Spellcasting")?.desc.match(/spell save DC (\d+)/i)?.[1];
  const spellAttackBonus = monsterData.special_abilities?.find(sa => sa.name === "Spellcasting")?.desc.match(/\+\d+ to hit with spell attacks/i)?.[0];

  return {
    mwak: {
      attack: monsterData.actions?.find(action => action.name === "Dagger")?.attack_bonus?.toString() || "",
      damage: monsterData.actions?.find(action => action.name === "Dagger")?.damage_bonus?.toString() || ""
    },
    rwak: {
      attack: "",  // Assuming no specific ranged weapon attack bonus given
      damage: ""
    },
    msak: {
      attack: spellAttackBonus || "",  // No specific melee spell attack data provided
      damage: ""
    },
    rsak: {
      attack: spellAttackBonus || "",  // Assuming spell attack bonuses apply to ranged spell attacks too
      damage: ""
    },
    abilities: {
      check: "",  // No specific ability check bonuses mentioned
      save: "",  // No specific save bonuses mentioned, except Magic Resistance which is not a numeric bonus
      skill: ""  // No specific skill bonuses mentioned
    },
    spell: {
      dc: spellDC || ""  // Spell DC for Archmage, as mentioned in the description
    }
  };
}

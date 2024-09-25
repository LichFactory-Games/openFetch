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

// Skills as a constant
const skillMapping = {
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
  return {
    biography: {
      value: monsterData.biography || "<p>No biography available.</p>",  // Use a default message if no biography is provided
      public: ""  // Assuming the biography is not public by default
    },
    alignment: monsterData.alignment || "Unaligned",  // Default to "Unaligned" if no alignment is provided
    race: monsterData.race || null,  // Default to null if no race is provided
    type: {
      value: monsterData.type || "Unknown",  // Default to "Unknown" type if not specified
      subtype: monsterData.subtype || "",
      swarm: monsterData.swarm || "",
      custom: ""
    },
    environment: monsterData.environment || "Unknown",  // Default to "Unknown" if no environment is provided
    cr: monsterData.cr || 1,  // Default to 1 if CR is not provided
    spellLevel: monsterData.spellLevel || 0,  // Default to 0 if spell level is not provided
    source: {
      custom: monsterData.source_custom || "",
      book: monsterData.document__title || "Open5e",  // Use the title from the document or default to "Open5e"
      page: monsterData.page || "",
      license: monsterData.document__license_url || "Unknown License"  // Provide a default license if not specified
    }
  };
}

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
  for (const [skillName, skillInfo] of Object.entries(skillMapping)) {
    const skillValue = monsterData.skills[skillName.toLowerCase()];
    if (skillValue !== undefined) {
      skills[skillInfo.id] = {
        value: skillValue,
        ability: skillInfo.ability,
        bonuses: {
          check: "0",
          passive: ""
        },
        roll: {
          min: null,
          max: null,
          mode: 0
        }
      };
    } else {
      skills[skillInfo.id] = {
        value: 0,
        ability: skillInfo.ability,
        bonuses: {
          check: "0",
          passive: ""
        },
        roll: {
          min: null,
          max: null,
          mode: 0
        }
      };
    }
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

function parseSenses(senses) {
  console.log("Original senses data:", senses);  // Log the input to see what is being processed

  // Initialize with null or default values as per Foundry VTT requirements
  const senseData = {
    darkvision: null,
    blindsight: null,
    tremorsense: null,
    truesight: null,
    'passive perception': null  // Treat passive Perception as a special case if needed
  };

  if (!senses) {
    console.log("No senses data provided");
    return senseData;
  }

  // Regex to match each type of sense and extract the numeric value
  const senseRegex = /(\w+)\s(\d+)\sft\.|passive perception (\d+)/g;
  let match;

  while ((match = senseRegex.exec(senses)) !== null) {
    if (match[1] && match[2]) {
      // Map senses like "darkvision 60 ft."
      const senseType = match[1].toLowerCase();
      const senseValue = parseInt(match[2], 10);
      if (senseData.hasOwnProperty(senseType)) {
        senseData[senseType] = senseValue;
        console.log(`Parsed ${senseType}: ${senseValue} ft.`);
      }
    } else if (match[3]) {
      // Handle "passive Perception 9"
      senseData['passive Perception'] = parseInt(match[3], 10);
      console.log(`Parsed passive Perception: ${match[3]}`);
    }
  }

  console.log("Parsed senses data:", senseData);
  return senseData;
}

export function extractResources(monsterData) {
  let legendaryActions = 0;
  let legendaryResistances = 0;
  let lairActions = false;
  let lairInitiative = null;

  // Loop through special abilities to find relevant details
  monsterData.special_abilities?.forEach(ability => {
    // Checking for Legendary Resistance
    if (ability.name.toLowerCase().includes("legendary resistance")) {
      const resistanceMatch = ability.name.match(/(\d+)\/Day/i);  // Attempt to extract the number from the name field
      legendaryResistances = resistanceMatch ? parseInt(resistanceMatch[1], 10) : legendaryResistances;
    }
    if (ability.name.toLowerCase().includes("lair actions")) {
      lairActions = true;
      const initiativeMatch = ability.desc.match(/at initiative count (\d+)/i);
      lairInitiative = initiativeMatch ? parseInt(initiativeMatch[1], 10) : lairInitiative;
    }
  });

  // Extract number of legendary actions if explicitly stated in any description (fallback method)
  monsterData.legendary_actions?.forEach(action => {
    if (action.name.includes("can take")) {
      const actionMatch = action.desc.match(/can take (\d+) legendary actions/i);
      legendaryActions = actionMatch ? parseInt(actionMatch[1], 10) : 3; // Default to 3 if not specifically mentioned
    }
  });

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

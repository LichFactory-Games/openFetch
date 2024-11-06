import { ensureCreaturesFolder, createItemsForActor } from './itemCreation.js';
import { mapSize, mapAbilities, mapAttributes, mapDetails, mapSavingThrows, mapSkills, mapTraitData, mapImage, extractResources, extractBonuses } from './monsterData.js';

// actorCreation.js

function validateMonsterData(monsterData) {
  const validations = {
    name: {
      value: monsterData.name,
      fallback: "Unknown Monster",
      validate: (v) => typeof v === 'string' && v.length > 0
    },
    type: {
      value: monsterData.type,
      fallback: "unknown",
      validate: (v) => typeof v === 'string' && v.length > 0
    },
    size: {
      value: monsterData.size,
      fallback: "med",
      validate: (v) => typeof v === 'string' && v.length > 0
    },
    alignment: {
      value: monsterData.alignment,
      fallback: "unaligned",
      validate: (v) => typeof v === 'string'
    }
  };

  const issues = [];
  const cleanData = { ...monsterData };

  // Validate and fix each field
  for (const [field, validation] of Object.entries(validations)) {
    if (!validation.validate(validation.value)) {
      issues.push(`${field} (using fallback: ${validation.fallback})`);
      cleanData[field] = validation.fallback;
    }
  }

  // Log issues if any were found
  if (issues.length > 0) {
    console.warn(`Data validation issues for ${monsterData.name || 'unnamed monster'}:`, issues);
    ui.notifications.warn(`Some monster data was invalid or missing. Fallback values were used for: ${issues.join(', ')}`);
  }

  return cleanData;
}

export async function createFoundryActor(monsterData) {
  try {
    // Validate and clean the data
    const cleanedData = validateMonsterData(monsterData);

    const folder = await ensureCreaturesFolder();
    const monsterImage = await mapImage(cleanedData.name);

    // Create default ability scores if missing
    const abilities = cleanedData.strength ?
          mapAbilities(cleanedData) :
          getDefaultAbilities();

    // Create default attributes if missing
    const attributes = {
      ac: {
        flat: cleanedData.armor_class || 10,
        calc: "natural",
        formula: ""
      },
      hp: {
        value: cleanedData.hit_points || 10,
        max: cleanedData.hit_points || 10,
        temp: 0,
        tempmax: 0,
        formula: cleanedData.hit_dice || ""
      },
      ...getDefaultAttributes()
    };

    const actorData = {
      name: cleanedData.name,
      type: "npc",
      folder: folder.id,
      img: monsterImage || "icons/svg/mystery-man.svg",
      system: {
        abilities,
        attributes,
        details: mapDetails(cleanedData),
        traits: {
          ...mapTraitData(cleanedData),
          size: mapSize(cleanedData.size)
        },
        skills: mapSkills(cleanedData)
      }
    };

    const actor = await Actor.create(actorData);

    // Only try to create items if we successfully created the actor
    if (actor) {
      try {
        await createItemsForActor(actor, cleanedData);
      } catch (itemError) {
        console.error("Error creating items for actor:", itemError);
        ui.notifications.warn(`Actor created but there were issues creating some items for ${cleanedData.name}`);
      }
    }

    ui.notifications.notify(`${actor.name} successfully created!`);
    return actor;

  } catch (error) {
    console.error('Error in createFoundryActor:', error);
    ui.notifications.error(`Failed to create ${monsterData.name || 'monster'}: ${error.message}`);
    throw error;
  }
}

// Add these helper functions to provide default values when data is missing
function getDefaultAbilities() {
  return {
    str: { value: 10, mod: 0 },
    dex: { value: 10, mod: 0 },
    con: { value: 10, mod: 0 },
    int: { value: 10, mod: 0 },
    wis: { value: 10, mod: 0 },
    cha: { value: 10, mod: 0 }
  };
}

function getDefaultAttributes() {
  return {
    movement: {
      walk: 30,
      swim: 0,
      fly: 0,
      climb: 0,
      burrow: 0
    },
    senses: {
      darkvision: 0,
      blindsight: 0,
      tremorsense: 0,
      truesight: 0
    },
    spellcasting: "",
    death: {
      success: 0,
      failure: 0
    }
  };
}


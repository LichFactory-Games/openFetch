import { calculateProficiencyBonus, abilityMapping } from "./monsterData.js";


function normalizeText(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
}

// Put fetched monsters in "Creatures" Folder
export async function ensureCreaturesFolder() {
  // Check if the "Creatures" folder already exists
  let folder = game.folders.find(f => f.name === "Creatures" && f.type === "Actor");

  // If it doesn't exist, create it
  if (!folder) {
    folder = await Folder.create({
      name: "Creatures",
      type: "Actor",
      parent: null  // or set a specific parent folder ID if nested
    });
  }
  return folder;
}

export async function createItemsForActor(actor, monsterData) {
  // Define the mapping of categories to item types and additional properties
  const categories = {
    actions: { type: 'feat', activationType: 'action' },
    bonus_actions: { type: 'feat', activationType: 'bonus' },
    reactions: { type: 'feat', activationType: 'reaction' },
    legendary_actions: { type: 'feat', activationType: 'legendary' },
    lair_actions: { type: 'feat', activationType: 'lair' },
    special_abilities: { type: 'feat', activationType: '' } // May vary
  };

  // Keep track of created item names to avoid duplicates
  const createdItemNames = new Set();

  for (const [category, config] of Object.entries(categories)) {
    const abilities = monsterData[category] || [];

    for (const ability of abilities) {
      const itemName = ability.name;

      // Check for duplicates
      if (createdItemNames.has(itemName)) {
        console.log(`Skipping duplicate item: ${itemName}`);
        continue;
      }

      // Mark this item as created
      createdItemNames.add(itemName);

      // Create the item
      await createItem(actor, ability, config, monsterData);
    }
  }
}


async function fetchIcon(actionName, monsterName) {
  console.log(`Searching for icon for action: ${actionName} of monster: ${monsterName}`);

  // Step 1: Try to find a matching monster in the SRD
  const monsterPack = game.packs.get('dnd5e.monsters');
  if (monsterPack) {
    const monsterIndex = await monsterPack.getIndex({ fields: ['name', 'items'] });
    let matchingMonster = monsterIndex.find(m => normalizeText(m.name) === normalizeText(monsterName));

    // If no exact match, try partial match
    if (!matchingMonster) {
      matchingMonster = monsterIndex.find(m =>
        normalizeText(m.name).includes(normalizeText(monsterName)) ||
          normalizeText(monsterName).includes(normalizeText(m.name))
      );
    }

    if (matchingMonster) {
      console.log(`Found matching monster in SRD: ${matchingMonster.name}`);

      // Fetch the full monster data to access its items
      const monster = await monsterPack.getDocument(matchingMonster._id);
      const matchingItem = monster.items.find(item => normalizeText(item.name) === normalizeText(actionName));

      if (matchingItem) {
        console.log(`Found matching item: ${matchingItem.name}, Icon: ${matchingItem.img}`);
        return matchingItem.img;
      }
    }
  }

  // Step 2: If no match in SRD monster, fall back to searching all compendiums
  console.log("No match found in SRD monster, falling back to general search");
  return fallbackIconSearch(actionName);
}



async function fallbackIconSearch(actionName) {
  const normalizedActionName = normalizeText(actionName);
  const relevantPacks = ['dnd5e.monsters', 'dnd5e.monsterfeatures', 'dnd5e.items', 'dnd5e.spells'];

  for (const packKey of relevantPacks) {
    const pack = game.packs.get(packKey);
    if (pack) {
      const index = await pack.getIndex({ fields: ['name', 'img'] });
      let match = index.find(i => normalizeText(i.name) === normalizedActionName);
      if (!match) {
        match = index.find(i => normalizeText(i.name).includes(normalizedActionName) ||
                           normalizedActionName.includes(normalizeText(i.name)));
      }
      if (match) {
        console.log(`Found icon in ${packKey}: ${match.img}`);
        return match.img;
      }
    }
  }

  console.log(`No icon found for ${actionName}, using default`);
  return "modules/openFetch/icons/default-icon.webp";
}

function calculateAttackBonus(action, monsterData) {
  const attackBonusMatch = action.desc.match(/^\w+ Weapon Attack: \+(\d+) to hit/i);
  const totalAttackBonus = attackBonusMatch ? parseInt(attackBonusMatch[1]) : null;

  if (!totalAttackBonus) return { itemAttackBonus: null, expectedAttackBonus: null };

  const proficiencyBonus = calculateProficiencyBonus(monsterData.challenge_rating);
  const { ability } = parseDamage(action);
  const abilityScore = Number(monsterData[abilityMapping[ability]]);
  const abilityModifier = Math.floor((abilityScore - 10) / 2);

  const expectedAttackBonus = abilityModifier + proficiencyBonus;
  const itemAttackBonus = totalAttackBonus - expectedAttackBonus;

  return { itemAttackBonus: itemAttackBonus > 0 ? itemAttackBonus : null, expectedAttackBonus };
}

function parseDamage(action) {
  const attackRegex = /(Melee|Ranged) Weapon Attack: \+(\d+) to hit/;
  const damageRegex = /(\d+d\d+\s*(?:\+\s*\d+)?)(?:\s+([a-z]+))?/gi;
  const saveRegex = /DC\s+(\d+)\s+([A-Za-z]+)(?:\s+saving throw)/i;

  const attackParts = attackRegex.exec(action.desc);
  let attackType = "other";
  let ability = "default";
  if (attackParts) {
    attackType = attackParts[1].toLowerCase() === "melee" ? "mwak" : "rwak";
    ability = attackType === "mwak" ? "str" : "dex";
  }

  const damageParts = [];
  const splitDamageParts = action.desc.split(" plus ");
  splitDamageParts.forEach(part => {
    let match;
    while ((match = damageRegex.exec(part)) !== null) {
      let formula = match[1].trim();
      let type = match[2] ? match[2].trim() : "";
      if (!type) {
        type = Object.keys(CONFIG.DND5E.damageTypes).find(dt => part.toLowerCase().includes(dt)) || "";
      }
      if (formula) {
        damageParts.push([formula, type]);
      }
    }
  });

  const saveParts = saveRegex.exec(action.desc);
  let saveData = null;
  if (saveParts) {
    saveData = {
      dc: parseInt(saveParts[1]),
      ability: saveParts[2].toLowerCase().slice(0, 3)
    };
  }

  return { attackType, ability, damageParts, saveData };
}

async function createItem(actor, action, config, monsterData) {
  console.log("DEBUG: Monster data before creating items:", monsterData);
  const itemType = config.type || 'feat';
  const activationType = config.activationType || '';
  const { itemAttackBonus } = calculateAttackBonus(action, monsterData);
  let description = handleSpellcasting(action, action.desc || '');
  const icon = await fetchIcon(action.name, monsterData.name);
  const { attackType, ability: attackAbility, damageParts, saveData } = parseDamage(action);
  const additionalProperties = getAdditionalProperties(config, action);

  const newItem = {
    name: action.name,
    type: itemType,
    img: icon,
    system: {
      description: {
        value: description,
        chat: description,
        enrichedText: true
      },
      activation: additionalProperties.activation || {
        type: activationType,
        cost: activationType ? 1 : null,
        condition: ""
      },
      target: {
        value: "1",
        type: "creature",
        units: "",
        prompt: true
      },
      range: {
        value: action.range?.value || 5,
        long: action.range?.long || null,
        units: action.range?.units || "ft"
      },
      damage: {
        parts: damageParts,
        versatile: ""
      },
      ability: attackAbility,
      actionType: saveData ? "save" : attackType,
      attackBonus: itemAttackBonus !== null ? `${itemAttackBonus}` : null,
      proficient: true,
      save: saveData ? {
        ability: saveData.ability,
        dc: saveData.dc,
        scaling: "flat"
      } : null,
      ...additionalProperties
    }
  };

  if (saveData) {
    newItem.system.ability = saveData.ability;
  }

  // Merge any additional properties
  Object.assign(newItem.system, additionalProperties);

  await actor.createEmbeddedDocuments('Item', [newItem]);
  console.log(`Created ${activationType || 'special ability'} item: ${action.name}`);
}

function getAdditionalProperties(config, action) {
  const properties = {};

  // Set properties for specific activation types
  if (config.activationType === 'legendary') {
    properties.activation = {
      type: 'legendary',
      cost: 1,
      condition: ""
    };
  } else if (config.activationType === 'lair') {
    properties.activation = {
      type: 'lair',
      cost: 1,
      condition: ""
    };
  } else if (config.activationType) {
    properties.activation = {
      type: config.activationType,
      cost: 1,
      condition: ""
    };
  }

  // Add any other properties you need based on the action data
  // For example, handling recharge, consumables, etc.

  return properties;
}

function handleSpellcasting(action, description) {
  if (action.name.toLowerCase().includes("spellcasting")) {
    const spellcastingDetails = parseDynamicSpellcasting(description);

    if (spellcastingDetails) {
      // Use formatted spellcasting details
      description = formatDynamicSpellcastingDescription(spellcastingDetails);
      return description; // Return early since we've formatted the description
    }
  }

  // Only replace newlines with <br> if this isn't spellcasting
  description = description.replace(/\n/g, '<br>');
  return description;
}

export function parseDynamicSpellcasting(description) {
  const abilityMatch = description.match(/spellcasting ability is (\w+)/i);
  const dcMatch = description.match(/(?:spell save DC|save DC)\s*(\d+)/i);
  const tohitMatch = description.match(/([+-]?\d+)\s*to hit with spell attacks/i);

  const spellcastingDetails = {
    ability: abilityMatch ? abilityMatch[1] : null,
    dc: dcMatch ? parseInt(dcMatch[1], 10) : null,
    tohit: tohitMatch ? parseInt(tohitMatch[1], 10) : "",
    spells: []
  };

  // Updated regex pattern to capture spell levels and their spells
  const spellcastingRegex = /((?:At will|Cantrips \(at will\)|\d+\/day(?: each)?|\d+(?:st|nd|rd|th)-level \(\d+ slots?\))):\s*([\s\S]*?)(?=(?:At will|Cantrips \(at will\)|\d+\/day(?: each)?|\d+(?:st|nd|rd|th)-level \(\d+ slots?\)|$))/gi;

  let match;
  while ((match = spellcastingRegex.exec(description)) !== null) {
    const level = match[1].trim();
    const spellsText = match[2].trim();

    // Split spells by newline, then trim each spell name
    let spells = spellsText.split('\n').map(spell => spell.trim()).filter(spell => spell.length > 0);

    // If there are no newlines, try splitting by comma
    if (spells.length === 1) {
      spells = spellsText.split(',').map(spell => spell.trim()).filter(spell => spell.length > 0);
    }

    spellcastingDetails.spells.push({ level, spells });
  }

  return spellcastingDetails;
}

export function formatDynamicSpellcastingDescription(spellcastingDetails) {
  let description = '<p>';
  description += `<strong>Spellcasting Ability:</strong> ${spellcastingDetails.ability}<br>`;
  description += `<strong>Spell Save DC:</strong> ${spellcastingDetails.dc || 'N/A'}<br>`;
  description += spellcastingDetails.tohit ? `<strong>Spell Attack To Hit:</strong> +${spellcastingDetails.tohit}<br><br>` : '<br>';

  // Start the Spells section
  spellcastingDetails.spells.forEach((spellGroup, index) => {
    const formattedSpells = spellGroup.spells.join(', ');

    let levelOrUsage;
    let levelType;

    if (spellGroup.level !== undefined) {
      levelOrUsage = spellGroup.level;
      levelType = "Level";
    } else if (spellGroup.usage !== undefined) {
      levelOrUsage = spellGroup.usage;
      levelType = "Usage";
    } else {
      levelOrUsage = "Unknown";
      levelType = "Category";
    }

    // Add levelOrUsage and formatted spells
    description += `<strong>${levelOrUsage}:</strong> ${formattedSpells}`;

    // Always add a line break after each group
    description += '<br><br>';
  });

  // Remove the last <br> tag
  description = description.slice(0, -4);

  description += '</p>';
  return description;
}

import { calculateProficiencyBonus, abilityMapping } from "./monsterData.js";

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


function normalizeText(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '').trim();
}

async function fetchIcon(actionName) {
  // Default icon URL
  let icon = "modules/openFetch/icons/default-icon.webp";


  // List of compendiums to search
  const compendiums = [
    game.packs.get('dnd5e.monsterfeatures'),
    game.packs.get('dnd5e.monsters'),
    game.packs.get('dnd5e.items'),
    game.packs.get('dnd5e.spells')
  ];

  for (let compendium of compendiums) {
    // Get the index of all items in the compendium
    const index = await compendium.getIndex();

    // Try to find an exact match first
    let itemEntry = index.find(i => normalizeText(i.name) === normalizeText(actionName));

    if (itemEntry) {
      const itemDocument = await compendium.getDocument(itemEntry._id);
      icon = itemDocument.img || icon;
      break; // Stop searching if a match is found
    }

    // If no exact match, try to find a partial match where the item name includes the action name
    itemEntry = index.find(i => normalizeText(i.name).includes(normalizeText(actionName)));

    if (itemEntry) {
      const itemDocument = await compendium.getDocument(itemEntry._id);
      icon = itemDocument.img || icon;
      break;
    }

    // Alternatively, check if the action name includes the item name
    itemEntry = index.find(i => normalizeText(actionName).includes(normalizeText(i.name)));

    if (itemEntry) {
      const itemDocument = await compendium.getDocument(itemEntry._id);
      icon = itemDocument.img || icon;
      break;
    }
  }

  return icon;
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

  const attackParts = attackRegex.exec(action.desc);
  let attackType = "other";
  let ability = "default";

  if (attackParts) {
    attackType = attackParts[1].toLowerCase() === "melee" ? "mwak" : "rwak";
    ability = attackType === "mwak" ? "str" : "dex";  // Corrected assignment
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

  return { attackType, ability, damageParts };
}

async function createItem(actor, action, config, monsterData) {
  console.log("DEBUG: Monster data before creating items:", monsterData);

  // Determine the item type and activation type from config
  const itemType = config.type || 'feat';
  const activationType = config.activationType || '';

  // Get attack and ability calculation
  const { itemAttackBonus } = calculateAttackBonus(action, monsterData);

  // Handle spellcasting-specific actions and format description
  let description = handleSpellcasting(action, action.desc || '');

  // Fetch appropriate icon for the action
  const icon = await fetchIcon(action.name);

  // Parse damage and attack details
  const { attackType, ability: attackAbility, damageParts } = parseDamage(action);

  // Create final item object
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
      activation: {
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
      actionType: attackType,
      attackBonus: itemAttackBonus !== null ? `${itemAttackBonus}` : null,
      proficient: true,
      save: {
        ability: action.save_ability?.toLowerCase() || "",
        dc: action.save_dc || null,
        scaling: "flat"
      }
    }
  };

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

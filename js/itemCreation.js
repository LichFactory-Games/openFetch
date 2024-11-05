import { calculateProficiencyBonus, abilityMapping } from "./monsterData.js";
import { processSpecialAbilities } from './monsterData.js';


let iconData = {};  // Define a global variable to store icon data

function normalizeText(text) {
  // Remove content in parentheses and trim white space
  text = text.replace(/\(.*?\)/g, '').trim();

  // Normalize to lowercase and remove non-alphanumeric characters
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

//// Create icon map file

async function fetchAllMonsterItems() {
  const compendiaList = [
    'dnd5e.monsterfeatures', // Monster abilities
    'dnd5e.monsters',        // Monsters
    'dnd5e.items',           // Items
    'dnd5e.spells'           // Spells
  ];

  const monsterItemIcons = {};

  for (const compendiumName of compendiaList) {
    const compendium = game.packs.get(compendiumName);
    if (!compendium) {
      console.warn(`Compendium ${compendiumName} not found, skipping...`);
      continue;
    }

    const index = await compendium.getIndex({ fields: ['name', 'img'] });
    for (const item of index) {
      const normalizedName = normalizeText(item.name);
      monsterItemIcons[normalizedName] = item.img || "icons/svg/mystery-man.svg";
    }
  }

  console.log("Monster item icons fetched:", monsterItemIcons);
  return monsterItemIcons;
}

async function saveIconDataToFile(iconData) {
  const json = JSON.stringify(iconData, null, 2); // Pretty print JSON
  const blob = new Blob([json], { type: 'application/json' });
  const fileName = 'monster-icons.json';

  // Use FilePicker to save the generated file
  const filePicker = new FilePicker({
    type: 'data',
    current: 'modules/openFetch/icons/',
    callback: (path) => console.log(`Icon data saved at ${path}`),
  });

  // Automatically trigger the download
  await filePicker.upload('data', 'modules/openFetch/icons/', blob, { filename: fileName });
  ui.notifications.info("Monster icon data generated. Please check and upload it to the correct directory.");
}
////

//// Fetch item icons
async function loadIconDataFromFile() {
  const path = 'modules/openFetch/icons/monster-icons.json';

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error('File not found');
    const iconData = await response.json();
    console.log('Icon data loaded from file:', iconData);
    return iconData;
  } catch (err) {
    console.warn('Error loading icon data from file:', err);
    return null; // Return null if the file doesn't exist
  }
}

function fetchIconFromStoredData(actionName, iconData) {
  if (!actionName) {
    console.warn('Action name is undefined');
    return "modules/openFetch/icons/default-icon.webp"; // Fallback to default icon
  }

  const normalizedAction = normalizeText(actionName);
  console.log(`Fetching icon for normalized action: ${normalizedAction}`);
  console.log("Available icon data: ", iconData); // Log the iconData to ensure multiattack is present

  return iconData[normalizedAction] || "modules/openFetch/icons/default-icon.webp"; // Fallback to default icon
}

// Ready hook to load or generate icon data
Hooks.once('ready', async function () {
  try {
    // Load icon data from the file
    iconData = await loadIconDataFromFile();
    console.log("Monster item icon data loaded successfully:", iconData);
  } catch (err) {
    console.warn("No monster icon data found. Creating new icon data...");
    iconData = await fetchAllMonsterItems();
    await saveIconDataToFile(iconData);
    console.log("New monster icon data created and saved:", iconData);
  }
});


async function createItem(actor, action, config, monsterData) {
  console.log("openFetch: Monster data before creating items:", monsterData);
  const itemType = config.type || 'feat';
  const activationType = config.activationType || '';
  const { itemAttackBonus } = calculateAttackBonus(action, monsterData);
  let description = handleSpellcasting(action, action.desc || '');
  const icon = fetchIconFromStoredData(action.name, iconData);
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

export async function createItemsForActor(actor, monsterData) {
  // Define the mapping of categories to item types and additional properties
  const categories = {
    actions: { type: 'feat', activationType: 'action' },
    bonus_actions: { type: 'feat', activationType: 'bonus' },
    reactions: { type: 'feat', activationType: 'reaction' },
    legendary_actions: { type: 'feat', activationType: 'legendary' },
    lair_actions: { type: 'feat', activationType: 'lair' },
    special_abilities: { type: 'feat', activationType: '' }
  };

  // Process special abilities first
  const processedAbilities = processSpecialAbilities(monsterData.special_abilities);

  // Keep track of created item names to avoid duplicates
  const createdItemNames = new Set();

  // Create items from processed special abilities
  for (const ability of processedAbilities) {
    if (createdItemNames.has(ability.name)) continue;

    createdItemNames.add(ability.name);

    // Adjust config based on ability type
    const config = {
      type: 'feat',
      activationType: ability.type === 'save' ? 'action' : ''
    };

    await createItem(actor, {
      name: ability.name,
      desc: ability.description
    }, config, monsterData);
  }

  // Create remaining items as before
  for (const [category, config] of Object.entries(categories)) {
    const abilities = monsterData[category] || [];

    for (const ability of abilities) {
      if (createdItemNames.has(ability.name)) continue;
      createdItemNames.add(ability.name);
      await createItem(actor, ability, config, monsterData);
    }
  }
}

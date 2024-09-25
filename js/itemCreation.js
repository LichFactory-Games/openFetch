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
  const categories = ['actions', 'bonus_actions', 'reactions', 'special_abilities'];

  for (const category of categories) {
    const actions = monsterData[category] || [];
    for (const action of actions) {
      await createItem(actor, action, category);
    }
  }
}


function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '').trim();
}

async function fetchIcon(actionName) {
  let icon = "https://cdn.pixabay.com/photo/2017/08/31/04/01/d20-2699387_1280.png";  // Default icon

  // Check if it's a spellcasting action and fetch icon from compendium
  if (actionName.toLowerCase().includes("spellcasting")) {
    const compendiums = [game.packs.get('dnd5e.monsterfeatures'), game.packs.get('dnd5e.items')];

    for (let compendium of compendiums) {
      const index = await compendium.getIndex();
      let itemEntry = index.find(i => normalizeText(i.name) === "spellcasting");

      if (itemEntry) {
        const itemDocument = await compendium.getDocument(itemEntry._id);
        icon = itemDocument.img || icon;
        break;
      }
    }
  }

  return icon;
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

function parseDamage(action) {
  const attackRegex = /(Melee|Ranged) Weapon Attack: \+(\d+) to hit/;
  const damageRegex = /(\d+d\d+\s*(?:\+\s*\d+)?)(?:\s+([a-z]+))?/gi;

  const attackParts = attackRegex.exec(action.desc);
  let attackType = "other";
  let ability = "default";

  if (attackParts) {
    attackType = attackParts[1].toLowerCase() === "melee" ? "mwak" : "rwak";
    ability = `@abilities.${attackType === "mwak" ? "str" : "dex"}.mod`;  // Use dynamic ability modifier
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

async function createItem(actor, action, category) {
  let activationType = category === "actions" ? "action"
      : category === "bonus_actions" ? "bonus"
      : category === "reactions" ? "reaction"
      : "";

  let description = action.desc || "";

  // Handle spellcasting-specific actions
  description = handleSpellcasting(action, description);

  // Fetch appropriate icon for the action
  const icon = await fetchIcon(action.name);

  // Parse damage and attack details
  const { attackType, ability, damageParts } = parseDamage(action);

  // Final item object
  const newItem = {
    name: action.name,
    type: "feat",  // Simplified item type
    img: icon,
    system: {
      description: {
        value: description,
        chat: description,
        enrichedText: true
      },
      activation: {
        type: activationType,
        cost: activationType ? 1 : null
      },
      target: {
        value: "1",
        width: null,
        units: "",
        type: "creature",
        prompt: true
      },
      range: {
        value: action.range?.value || 5,
        long: action.range?.long || null,
        units: action.range?.units || "ft"
      },
      damage: {
        parts: damageParts,
        versatile: ""  // Handle versatile weapons
      },
      ability: ability,
      actionType: attackType,
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

export function parseDynamicSpellcasting(description) {
  // Adjust the regex to capture the spellcasting ability and spell save DC
  const abilityMatch = description.match(/spellcasting ability is (\w+)/i);
  const dcMatch = description.match(/spell save DC (\d+)/i);
  const tohitMatch = description.match(/\+\s*(\d+)\s*to hit with spell attacks/i);

  const spellcastingDetails = {
    ability: abilityMatch ? abilityMatch[1] : null,
    dc: dcMatch ? parseInt(dcMatch[1], 10) : null,
    tohit: tohitMatch ? parseInt(tohitMatch[1], 10) : null,
    spells: []
  };

  // Pattern to match spell levels and their spells, including multiline spells
  const spellcastingRegex = /(Cantrips \(at will\)|\d+(?:st|nd|rd|th)-level \(\d+ slots?\)):\s*([\s\S]*?)(?=\d+(?:st|nd|rd|th)-level|\Z)/gi;
  let match;

  while ((match = spellcastingRegex.exec(description)) !== null) {
    const level = match[1].trim(); // Get the spell level
    const spellsText = match[2];   // Get the spells text, including newlines
    const spells = spellsText.split(/\n+/).map(spell => spell.trim()).filter(spell => spell.length > 0); // Split spells by newlines and clean up
    spellcastingDetails.spells.push({ level, spells }); // Push the level and spells into the array
  }

  return spellcastingDetails;
}


export function formatDynamicSpellcastingDescription(spellcastingDetails) {
  let description = '';
  description += `<p><strong>Spellcasting Ability:</strong> ${spellcastingDetails.ability}<br>`;
  description += `<strong>Spell Save DC:</strong> ${spellcastingDetails.dc}<br>`;
  description += `<strong>Spell Attack To Hit:</strong> +${spellcastingDetails.tohit}<br><br>`;
  // Start the Spells section
  // Add each spell group (Cantrips, 1st-level, etc.) to the description
  spellcastingDetails.spells.forEach((spellGroup, index) => {
    const formattedSpells = spellGroup.spells.join(', ');
    const level = spellGroup.level; // Use the correct property
    // Add level and formatted spells
    description += `<strong>${level}:</strong> ${formattedSpells}`;
    // Add a line break after each group except the last one
    if (index < spellcastingDetails.spells.length - 1) {
      description += '<br><br>';
    }
  });
  description += '</p>';

  return description;
}

import { ensureCreaturesFolder, createItemsForActor } from './itemCreation.js';
import { mapSize, mapAbilities, mapAttributes, mapDetails, mapSavingThrows, mapSkills, mapTraitData, mapImage, extractResources, extractBonuses } from './monsterData.js';


export async function createFoundryActor(monsterData) {
  try {
    // Validate required fields
    const requiredFields = ['name', 'type', 'size', 'alignment'];
    const missingFields = requiredFields.filter(field => !monsterData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const folder = await ensureCreaturesFolder();
    const monsterImage = await mapImage(monsterData.name);

    // Map data with fallbacks
    const actorData = {
      name: monsterData.name,
      type: "npc",
      folder: folder.id,
      img: monsterImage || "icons/svg/mystery-man.svg",
      system: {
        abilities: mapAbilities(monsterData) || getDefaultAbilities(),
        attributes: mapAttributes(monsterData) || getDefaultAttributes(),
        details: mapDetails(monsterData) || getDefaultDetails(),
        traits: {
          ...mapTraitData(monsterData),
          size: mapSize(monsterData.size)
        },
        skills: mapSkills(monsterData) || {},
      }
    };

    const actor = await Actor.create(actorData);
    await createItemsForActor(actor, monsterData);

    return actor;

  } catch (error) {
    console.error('Error creating actor:', error);
    ui.notifications.error(`Failed to create ${monsterData.name}: ${error.message}`);
    throw error;
  }
}

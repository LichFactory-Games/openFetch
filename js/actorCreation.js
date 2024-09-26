import { ensureCreaturesFolder, createItemsForActor } from './itemCreation.js';
import { mapSize, mapAbilities, mapAttributes, mapDetails, mapSavingThrows, mapSkills, mapTraitData, mapImage, extractResources, extractBonuses } from './monsterData.js';

export async function createFoundryActor(monsterData) {
  const folder = await ensureCreaturesFolder();
  const monsterImage = await mapImage(monsterData.name);

  // Map abilities
  const abilities = mapAbilities(monsterData);

  // Update abilities with saving throws
  mapSavingThrows(monsterData, abilities); // Modifies abilities in-place

  const actorData = {
    name: monsterData.name,
    type: "npc",
    folder: folder.id,
    img: monsterImage || "icons/svg/mystery-man.svg",
    system: {
      abilities: abilities, // Use the updated abilities object
      attributes: mapAttributes(monsterData),
      details: mapDetails(monsterData),
      traits: {
        ...mapTraitData(monsterData),
        size: mapSize(monsterData.size)
      },
      skills: mapSkills(monsterData),
      bonuses: extractBonuses(monsterData),
      resources: extractResources(monsterData)
    }
  };

  const actor = await Actor.create(actorData);
  await createItemsForActor(actor, monsterData);

  console.log(`Actor created: ${actor.name}`);
  return actor;
}

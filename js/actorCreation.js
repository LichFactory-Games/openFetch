import { ensureCreaturesFolder, createItemsForActor } from './itemCreation.js';
import { mapSize, mapAbilities, mapAttributes, mapDetails, mapSkills, mapTraitData, mapImage, extractResources, extractBonuses } from './monsterData.js';

export async function createFoundryActor(monsterData) {
  const folder = await ensureCreaturesFolder();
  // Fetch the monster image before creating actorData
  const monsterImage = await mapImage(monsterData.name);

  const actorData = {
    name: monsterData.name,
    type: "npc",
    folder: folder.id,
    img: monsterImage || "icons/svg/mystery-man.svg", // Use the fetched image or default
    system: {
      abilities: mapAbilities(monsterData),
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

import { ensureCreaturesFolder, createItemsForActor } from './itemCreation.js';
import { mapSize, mapAbilities, mapAttributes, mapDetails, mapSkills, mapTraitData, extractResources, extractBonuses } from './monsterData.js';

export async function createFoundryActor(monsterData) {
  const folder = await ensureCreaturesFolder();

  const actorData = {
    name: monsterData.name,
    type: "npc",
    folder: folder.id,
    img: monsterData.img || "icons/svg/mystery-man.svg",
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

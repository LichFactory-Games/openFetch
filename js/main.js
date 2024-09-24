import { MonsterSearchDialog } from './dialog.js';
import { fetchMonsterData } from './fetchHelper.js';
import { createItemsForActor } from './itemCreation.js';
import { mapAbilities, mapAttributes } from './monsterData.js';

Hooks.once('init', async function() {
  console.log("Open5e Module | Initializing");

  // Example of how to trigger the dialog
  new MonsterSearchDialog();
});

async function createActorFromMonsterData(monsterData) {
  const folder = await ensureCreaturesFolder();

  const actorData = {
    name: monsterData.name,
    type: "npc",
    folder: folder.id,
    img: "icons/svg/mystery-man.svg",
    system: {
      abilities: mapAbilities(monsterData),
      attributes: mapAttributes(monsterData),
      details: { alignment: monsterData.alignment || "Unaligned", type: monsterData.type },
    }
  };

  const actor = await Actor.create(actorData);
  await createItemsForActor(actor, monsterData);
}

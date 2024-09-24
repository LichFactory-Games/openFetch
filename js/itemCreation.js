export async function createItemsForActor(actor, monsterData) {
  const categories = ['actions', 'bonus_actions', 'reactions', 'special_abilities'];

  for (const category of categories) {
    const actions = monsterData[category] || [];
    for (const action of actions) {
      await createItem(actor, action, category);
    }
  }
}

async function createItem(actor, action, category) {
  let activationType = category === "actions" ? "action"
      : category === "bonus_actions" ? "bonus"
      : category === "reactions" ? "reaction"
      : "";

  const newItem = {
    name: action.name,
    type: category === "special_abilities" ? "feat" : "feat",
    img: 'icons/svg/magic.svg',
    system: {
      description: { value: action.desc, enrichedText: true },
      activation: { type: activationType, cost: activationType ? 1 : null }
    }
  };
  await actor.createEmbeddedDocuments('Item', [newItem]);
  console.log(`Created ${activationType ? activationType : 'special ability'} item: ${action.name}`);
}

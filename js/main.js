import { MonsterSearchDialog } from './dialog.js';

Hooks.once('init', () => {
  game.keybindings.register('openFetch', 'monsterSearchHotkey', {
    name: 'Monster Search Hotkey',
    hint: 'Hotkey to open the Monster Search dialog',
    editable: [{ key: 'KeyM', modifiers: ['Control'] }], // Set default keybinding
    onDown: () => {
      new MonsterSearchDialog().render(true);
    },
    restricted: false,
    precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL
  });
});

Hooks.once('ready', () => {
  game.openFetch = game.openFetch || {};
  game.openFetch.openMonsterSearch = () => {
    new MonsterSearchDialog().render(true);
  };
});

Hooks.on('renderActorDirectory', (app, html) => {
  if (html.find('.open5e-button').length === 0) {
    const button = $('<button class="open5e-button" style="margin: 5px;">Fetch Open5e Monsters</button>');
    button.on('click', () => new MonsterSearchDialog().render(true));
    html.find('.directory-header').append(button);
  }
});

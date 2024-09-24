import { MonsterSearchDialog } from './dialog.js';

Hooks.on('renderActorDirectory', (app, html) => {
  if (html.find('.monster-search-button').length === 0) {
    const button = $('<button class="monster-search-button" style="margin: 5px;">Search Monsters</button>');

    // Attach the dialog trigger
    button.on('click', () => new MonsterSearchDialog());

    html.find('.directory-footer').append(button);
  }
});

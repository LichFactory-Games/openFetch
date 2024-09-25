import { MonsterSearchDialog } from './dialog.js';

Hooks.on('renderActorDirectory', (app, html) => {
  if (html.find('.open5e-button').length === 0) {
    const button = $('<button class="open5e-button" style="margin: 5px;">Fetch Open5e Monsters</button>');

    // Attach the dialog trigger
    button.on('click', () => new MonsterSearchDialog());

    html.find('.directory-header').append(button);
  }
});

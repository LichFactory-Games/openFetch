import { handleSearchInput } from './fetchhelper.js'; // Import the search handler

export function createFilterSelects() {
  const filterContainer = document.createElement('div');
  filterContainer.className = 'filter-container';

  const crSelect = createSelect('crFilter', 'Challenge Rating', [
    { value: '', text: 'Any CR' },
    { value: '0-5', text: 'CR 0–5' },
    { value: '6-10', text: 'CR 6–10' },
    { value: '11-15', text: 'CR 11–15' },
    { value: '16-20', text: 'CR 16–20' },
    { value: '21-30', text: 'CR 21–30' }
  ]);

  const typeSelect = createSelect('typeFilter', 'Monster Type', [
    { value: '', text: 'Any Type' },
    { value: 'Aberration', text: 'Aberration' },
    { value: 'Beast', text: 'Beast' },
    { value: 'Celestial', text: 'Celestial' },
    { value: 'Construct', text: 'Construct' },
    { value: 'Dragon', text: 'Dragon' },
    { value: 'Elemental', text: 'Elemental' },
    { value: 'Fey', text: 'Fey' },
    { value: 'Fiend', text: 'Fiend' },
    { value: 'Giant', text: 'Giant' },
    { value: 'Humanoid', text: 'Humanoid' },
    { value: 'Monstrosity', text: 'Monstrosity' },
    { value: 'Ooze', text: 'Ooze' },
    { value: 'Plant', text: 'Plant' },
    { value: 'Undead', text: 'Undead' }
  ]);

  const documentSelect = createSelect('documentFilter', 'Source', [
    { value: '', text: 'Any Source' },
    { value: 'wotc-srd', text: '5e SRD' },
    { value: 'tob', text: 'Tome of Beasts' },
    { value: 'tob2', text: 'Tome of Beasts 2' },
    { value: 'tob3', text: 'Tome of Beasts 3' },
    { value: 'cc', text: 'Creature Codex' },
    { value: 'menagerie', text: 'Monstrous Menagerie' },
    { value: 'a5e', text: 'Advanced 5e' }
    // Add more options as needed
  ]);

  filterContainer.appendChild(crSelect);
  filterContainer.appendChild(typeSelect);
  filterContainer.appendChild(documentSelect);

  return filterContainer;
}

function createSelect(id, labelText, options) {
  const container = document.createElement('div');
  container.className = 'form-group';

  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = labelText;

  const select = document.createElement('select');
  select.id = id;

  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option.value;
    optionElement.textContent = option.text;
    select.appendChild(optionElement);
  });

  container.appendChild(label);
  container.appendChild(select);

  // Add event listener to trigger search on filter change
  select.addEventListener('change', () => {
    const searchInput = document.getElementById('monsterName').value || '';
    handleSearchInput(searchInput);
  });

  return container;
}

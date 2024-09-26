import { createFoundryActor } from "./actorCreation.js";
import { state } from './state.js'; // Import shared state


let searchTimeout = null;  // For debouncing the search input

// Handle fetching the monster data after a search
export async function handleFetch(html) {
  console.log('openFetch: In handleFetch, selectedMonsterData:', state.selectedMonsterData);
  if (!state.selectedMonsterData) {
    ui.notifications.warn('Please select a monster from search results.');
    return;
  }
  try {
    // Use the stored monster data to create the actor
    await createFoundryActor(state.selectedMonsterData);
  } catch (error) {
    console.error('Error creating actor:', error);
    ui.notifications.error('Error creating actor: ' + error.message);
  }
}

// Handle search input with debounce
export async function handleSearchInput(value) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = 'Searching...';

    const cr = document.getElementById('crFilter')?.value || '';
    const type = document.getElementById('typeFilter')?.value || '';
    const documentSource = document.getElementById('documentFilter')?.value || '';

    console.log('Search parameters:', { value, cr, type, document: documentSource });

    const searchResults = await searchMonsters(value, { cr, type, document: documentSource, limit: 50 });

    // Prioritize exact matches
    const prioritizedResults = prioritizeExactMatches(searchResults.results, value);

    displaySearchResults(prioritizedResults);
  }, 250);
}

// Perform search request to Open5e API
export async function searchMonsters(query, options = {}) {
  // Remove empty query
  // if (!query || query.trim() === '') {
  //   return { results: [] };
  // }

  const baseUrl = 'https://api.open5e.com/v1/monsters/';
  const params = new URLSearchParams({
    search: query.trim(), // Allow empty query
    ordering: 'challenge_rating,name',
  });

  if (options.limit) params.append('limit', options.limit);

  if (options.cr && options.cr !== '') {
    if (options.cr.includes('-')) {
      const [min, max] = options.cr.split('-');
      params.append('challenge_rating__gte', min);
      params.append('challenge_rating__lte', max);
    } else {
      params.append('challenge_rating', options.cr);
    }
  }

  if (options.type && options.type !== '') params.append('type', options.type);
  if (options.document && options.document !== '') params.append('document__slug', options.document);

  const url = `${baseUrl}?${params.toString()}`;
  console.log('Fetching from URL:', url);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorMessage = `HTTP error! status: ${response.status}`;
      console.error('Error fetching monsters:', errorMessage);
      ui.notifications.error('Error fetching monsters: ' + errorMessage);
      return { results: [] };
    }
    const data = await response.json();
    console.log('API response:', data);
    return data;
  } catch (error) {
    console.error('Error fetching monsters:', error);
    ui.notifications.error('Error fetching monsters: ' + error.message);
    return { results: [] };
  }
}

// Prioritize exact matches in the search results
function prioritizeExactMatches(results, query) {
  const lowerCaseQuery = query.toLowerCase().trim();

  const exactMatches = [];
  const partialMatches = [];

  results.forEach(monster => {
    if (monster.name.toLowerCase() === lowerCaseQuery) {
      exactMatches.push(monster);
    } else {
      partialMatches.push(monster);
    }
  });

  return [...exactMatches, ...partialMatches];
}

// Method to handle the selection of a search result
export function selectResult(monsterOrElement) {
  let monster;
  if (monsterOrElement instanceof Element) {
    // If a DOM element was passed (from keyboard navigation)
    monster = monsterOrElement.monsterData;
  } else {
    // If a monster object was passed (from click event)
    monster = monsterOrElement;
  }

  if (!monster) {
    console.error('Invalid monster data');
    return;
  }

  const monsterNameField = document.getElementById('monsterName');
  const resultsContainer = document.getElementById('searchResults');

  // Store the selected monster data
  state.selectedMonsterData = monster;

  // Display the selected monster's name and source in the input field
  monsterNameField.value = `${monster.name} (Source: ${monster.document__slug ? monster.document__slug.toUpperCase() : 'No Source'})`;

  // Hide the search results container
  resultsContainer.style.display = 'none';

  console.log(`Selected Monster: ${monster.name}, Source: ${monster.document__slug}`);
}

// Display search results in the UI and make them selectable
export function displaySearchResults(results) {
  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = '';  // Clear previous results

  if (results.length === 0) {
    resultsContainer.textContent = 'No monsters found.';
    return;
  }

  // Show the results container
  resultsContainer.style.display = 'block';

  // Loop through the results and create a div for each monster
  results.forEach(monster => {
    const resultDiv = document.createElement('div');
    resultDiv.textContent = `${monster.name} (CR ${monster.challenge_rating || 'Unknown'}) - Source: ${monster.document__slug ? monster.document__slug.toUpperCase() : 'No Source'}`;
    resultDiv.classList.add('search-result');

    // Store the monster data on the div element
    resultDiv.monsterData = monster;

    // Attach a click event listener to the result
    resultDiv.addEventListener('click', () => {
      selectResult(monster);
    });

    resultsContainer.appendChild(resultDiv);
  });
}

import { createFoundryActor } from "./actorCreation.js";
import { state } from './state.js'; // Import shared state


let searchTimeout = null;  // For debouncing the search input
const DEBOUNCE_MS = 300;


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
  // Clear any pending search
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // Don't search for very short terms immediately
  if (value.trim().length < 3) {
    const resultsContainer = document.getElementById('searchResults');
    if (value.trim().length === 0) {
      resultsContainer.innerHTML = 'Type to search...';
    } else {
      resultsContainer.innerHTML = 'Enter at least 3 characters...';
    }
    return;
  }

  searchTimeout = setTimeout(async () => {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = 'Searching...';

    const cr = document.getElementById('crFilter')?.value || '';
    const type = document.getElementById('typeFilter')?.value || '';
    const documentSource = document.getElementById('documentFilter')?.value || '';

    try {
      const data = await searchMonsters(value, { cr, type, document: documentSource, limit: 50 });
      displaySearchResults(data.results || []);
    } catch (error) {
      resultsContainer.innerHTML = 'Search failed. Please try again.';
    }
  }, DEBOUNCE_MS);
}

// Perform search request to Open5e API
async function searchMonsters(query, options = {}) {
  const baseUrl = 'https://api.open5e.com/v1/monsters/';
  const cleanQuery = query.trim().toLowerCase();

  // Minimum length check
  if (cleanQuery.length < 3 && cleanQuery !== '') {
    console.log('[OpenFetch] Search term too short, waiting for more characters');
    ui.notifications.warn('Please enter at least 3 characters to search');
    return { results: [] };
  }

  const params = new URLSearchParams();

  // Handle empty search - return first page of results
  if (cleanQuery === '') {
    params.append('ordering', 'challenge_rating,name');
    if (options.limit) params.append('limit', options.limit);
  }
  // Handle known exact term "priest"
  else if (cleanQuery === 'priest') {
    params.append('slug__in', 'priest');
  }
  // Handle normal searches with protection for short terms
  else {
    // Use exact match for short terms (3 chars)
    if (cleanQuery.length === 3) {
      params.append('name__iexact', cleanQuery);
    }
    // Use contains for longer terms
    else {
      params.append('name__icontains', cleanQuery);
    }
  }

  // Add sorting
  params.append('ordering', 'challenge_rating,name');

  // Add filters
  if (options.limit) params.append('limit', options.limit);
  if (options.cr && options.cr !== '') {
    if (options.cr.includes('-')) {
      const [min, max] = options.cr.split('-');
      params.append('cr__gte', min);
      params.append('cr__lte', max);
    } else {
      params.append('cr', options.cr);
    }
  }
  if (options.type && options.type !== '') {
    params.append('type__iexact', options.type);
  }
  if (options.document && options.document !== '') {
    params.append('document__slug__in', options.document);
  }

  const url = `${baseUrl}?${params.toString()}`;
  console.log('[OpenFetch] Starting request:', {
    originalQuery: query,
    cleanQuery,
    searchLength: cleanQuery.length,
    url
  });

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.error('[OpenFetch] Request error:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        query: cleanQuery
      });

      // If we get a 500 error with a contains search, try exact match
      if (response.status === 500 && params.has('name__icontains')) {
        console.log('[OpenFetch] Retrying with exact match');
        params.delete('name__icontains');
        params.append('name__iexact', cleanQuery);
        return searchMonsters(query, options);
      }

      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('[OpenFetch] Search successful:', {
      resultsCount: data.results?.length || 0,
      query: cleanQuery
    });
    return data;

  } catch (error) {
    console.error('[OpenFetch] Request failed:', {
      error: error.message,
      query: cleanQuery,
      url
    });

    ui.notifications.error('Failed to fetch monsters. Try a more specific search term.');
    return { results: [] };
  }
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

    // Attach a return  event listener to the result
    resultDiv.addEventListener('Enter', () => {
      selectResult(monster);
    });

    resultsContainer.appendChild(resultDiv);
  });
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

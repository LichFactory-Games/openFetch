let searchTimeout = null;  // Declare searchTimeout in a higher context

// Handle fetching the monster data after a search
export async function handleFetch(html) {
  const monsterNameField = document.getElementById('monsterName').value;
  const monsterSource = document.getElementById('monsterSource').value;

  const monsterName = monsterNameField.split(' (Source: ')[0];

  if (!monsterName) {
    ui.notifications.warn('Please select a monster from search results.');
    return;
  }
  try {
    const monsterData = await fetchMonsterData(monsterName, monsterSource); // No 'this' here
    if (monsterData) {
      await createFoundryActor(monsterData);  // No 'this' here
    } else {
      ui.notifications.warn('No results found. Please check the monster name.');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    ui.notifications.error('Error fetching data: ' + error.message);
  }
}

// Fetch monster data from Open5e
export async function fetchMonsterData(monsterName, monsterSource) {
  const url = `https://api.open5e.com/monsters/?search=${encodeURIComponent(monsterName)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch data');

  const data = await response.json();
  const exactMatch = data.results.find(monster =>
    monster.name.toLowerCase() === monsterName.toLowerCase() &&
      monster.document__slug === monsterSource
  );

  return exactMatch;
}

// Handle search input with debounce
export async function handleSearchInput(value) {
  clearTimeout(searchTimeout);  // No 'this' needed here
  searchTimeout = setTimeout(async () => {
    const searchResults = await searchMonsters(value);
    displaySearchResults(searchResults.results);  // Ensure we're passing the correct part of the result
  }, 300);
}

// Perform search request to Open5e API
async function searchMonsters(query) {
  const url = `https://api.open5e.com/monsters/?search=${encodeURIComponent(query)}&ordering=challenge_rating`;
  const response = await fetch(url);
  return await response.json();  // Return the full result
}

// Display search results in the UI
function displaySearchResults(results) {
  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = results.map(monster =>
    `<div>${monster.name} (CR ${monster.challenge_rating || 'Unknown'})</div>`
  ).join('');
}

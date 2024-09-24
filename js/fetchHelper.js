import { createFoundryActor } from "./actorCreation.js";

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
      await createFoundryActor(monsterData);
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

// Method to handle the selection of a search result
export function selectResult(monster) {
  const monsterNameField = document.getElementById('monsterName');
  const monsterSourceField = document.getElementById('monsterSource');
  const resultsContainer = document.getElementById('searchResults');

  // Set the selected monster name and source
  monsterNameField.value = `${monster.name} (Source: ${monster.document__slug.toUpperCase()})`;
  monsterSourceField.value = monster.document__slug;

  // Hide the search results container
  resultsContainer.style.display = 'none';

  console.log(`Selected Monster: ${monster.name}, Source: ${monster.document__slug}`);
}

// Display search results in the UI and make them selectable
function displaySearchResults(results) {
  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = '';  // Clear previous results

  // Loop through the results and create a div for each monster
  results.forEach(monster => {
    const resultDiv = document.createElement('div');
    resultDiv.textContent = `${monster.name} (CR ${monster.challenge_rating || 'Unknown'}) - Source: ${monster.document__slug ? monster.document__slug.toUpperCase() : 'No Source'}`;
    resultDiv.classList.add('search-result');  // Add a class for styling if needed

    // Attach a click event listener to the result
    resultDiv.addEventListener('click', () => {
      selectResult(monster);  // Pass the entire monster data to selectResult
    });

    resultsContainer.appendChild(resultDiv);  // Append the result to the container
  });
}



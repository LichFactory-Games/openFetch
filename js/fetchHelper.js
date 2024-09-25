import { createFoundryActor } from "./actorCreation.js";

let searchTimeout = null;  // For debouncing the search input
let selectedMonsterData = null;  // To store the selected monster data

// Handle fetching the monster data after a search
export async function handleFetch(html) {
  if (!selectedMonsterData) {
    ui.notifications.warn('Please select a monster from search results.');
    return;
  }
  try {
    // Use the stored monster data to create the actor
    await createFoundryActor(selectedMonsterData);
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

    const searchResults = await searchMonsters(value);
    displaySearchResults(searchResults.results);
  }, 250);
}

// Perform search request to Open5e API
export async function searchMonsters(query) {
  const url = `https://api.open5e.com/monsters/?search=${encodeURIComponent(query)}&ordering=challenge_rating`;
  const response = await fetch(url);
  return await response.json();
}

// Method to handle the selection of a search result
export function selectResult(monster) {
  const monsterNameField = document.getElementById('monsterName');
  const resultsContainer = document.getElementById('searchResults');

  // Store the selected monster data
  selectedMonsterData = monster;

  // Display the selected monster's name and source in the input field
  monsterNameField.value = `${monster.name} (Source: ${monster.document__slug.toUpperCase()})`;

  // Hide the search results container
  resultsContainer.style.display = 'none';

  console.log(`Selected Monster: ${monster.name}, Source: ${monster.document__slug}`);
}

// Display search results in the UI and make them selectable
function displaySearchResults(results) {
  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = '';  // Clear previous results


  if (results.length === 0) {
    resultsContainer.textContent = 'No monsters found.';
    return;
  }

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

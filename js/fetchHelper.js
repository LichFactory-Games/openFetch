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

export async function handleSearchInput(value) {
  clearTimeout(this.searchTimeout);
  this.searchTimeout = setTimeout(async () => {
    const searchResults = await searchMonsters(value);
    displaySearchResults(searchResults);
  }, 300);
}

async function searchMonsters(query) {
  const url = `https://api.open5e.com/monsters/?search=${encodeURIComponent(query)}&ordering=challenge_rating`;
  const response = await fetch(url);
  return await response.json();
}

function displaySearchResults(results) {
  const resultsContainer = document.getElementById('searchResults');
  resultsContainer.innerHTML = results.results.map(monster =>
    `<div>${monster.name} (CR ${monster.challenge_rating || 'Unknown'})</div>`
  ).join('');
}

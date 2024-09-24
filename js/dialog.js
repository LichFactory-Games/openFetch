import { handleSearchInput, handleFetch } from './fetchHelper.js';

export class MonsterSearchDialog {
  constructor() {
    this.dialog = new Dialog({
      title: "Fetch and Search for Monster Data",
      content: this.formHTML(),
      buttons: {
        fetch: {
          icon: '<i class="fas fa-search"></i>',
          label: "Fetch",
          callback: (html) => this.handleFetch(html)
        }
      },
      default: "fetch",
      render: (html) => {
        this.setupEventHandlers();  // Attach event handlers after rendering
      },
      close: () => console.log("Dialog closed")
    });

    this.dialog.render(true);
  }

  // Method to generate the HTML content of the form
  formHTML() {
    return `
      <form>
        <div class="form-group" style="margin-bottom: 10px;">
            <label for="searchQuery" style="display: block; margin-bottom: 5px;">Search for Monster:</label>
            <input type="text" name="searchQuery" id="searchQuery" style="width: 100%;">
        </div>
        <div id="searchResults" class="search-results" style="max-height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 5px; margin-bottom: 10px;"></div>
        <div class="form-group">
            <label for="monsterName" style="display: block; margin-bottom: 5px;">Monster Name:</label>
            <input type="text" name="monsterName" id="monsterName" readonly style="width: 100%;">
            <input type="hidden" name="monsterSource" id="monsterSource" readonly>
        </div>
      </form>`;
  }

  // Method to set up event handlers for the search input
  setupEventHandlers() {
    const searchInput = document.getElementById('searchQuery');

    if (searchInput) {
      // Bind the input handler
      searchInput.oninput = () => {
        handleSearchInput(searchInput.value);  // Just call the centralized debounced function
      };

      // Handle keyboard navigation (Arrow Up/Down, Enter)
      searchInput.addEventListener('keydown', (event) => {
        const resultsContainer = document.getElementById('searchResults');
        let activeItem = resultsContainer.querySelector('.active');

        switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (activeItem) {
            const nextItem = activeItem.nextElementSibling;
            if (nextItem) {
              nextItem.classList.add('active');
              activeItem.classList.remove('active');
            }
          } else {
            resultsContainer.firstChild.classList.add('active');
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (activeItem) {
            const prevItem = activeItem.previousElementSibling;
            if (prevItem) {
              prevItem.classList.add('active');
              activeItem.classList.remove('active');
            }
          } else {
            resultsContainer.lastChild.classList.add('active');
          }
          break;

        case 'Enter':
          event.preventDefault();
          if (activeItem) {
            this.selectResult(activeItem);
          }
          break;
        }
      });
    } else {
      console.error("Search input element not found in the DOM.");
    }
  }

  // Method to handle the selection of a search result
  selectResult(activeItem) {
    const monsterName = activeItem.textContent.trim();
    document.getElementById('monsterName').value = monsterName;
    console.log(`Selected Monster: ${monsterName}`);
    // Additional logic to handle selected monster (e.g., fetch monster data)
  }

  // Handle fetching logic
  handleFetch(html) {
    handleFetch();  // Call the external fetch function
  }
}

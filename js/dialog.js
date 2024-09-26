import { handleSearchInput, handleFetch, selectResult } from './fetchHelper.js';
import { createFilterSelects } from './selectors.js';

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
        this.appendFilterSelects(); // Append filter selects after rendering
        this.adjustDialogSize();
        this.focusSearchInput();

      },
      close: () => console.log("Dialog closed")
    });

    this.dialog.render(true);
    // Add a slight delay before focusing the input
    setTimeout(() => this.focusSearchInput(), 100);
  }

  // Method to generate the HTML content of the form
  formHTML() {
    return `
    <form>
      <div class="form-group" style="margin-bottom: 10px;">
        <label for="searchQuery" style="display: block; margin-bottom: 5px;">Search for Monster:</label>
        <input type="text" name="searchQuery" id="searchQuery" style="width: 100%;">
      </div>
      <div id="filterContainer"></div>
<div id="searchResults" class="search-results"></div>
      <div class="form-group">
        <label for="monsterName" style="display: block; margin-bottom: 5px;">Monster Name:</label>
        <input type="text" name="monsterName" id="monsterName" readonly style="width: 100%;">
        <input type="hidden" name="monsterSource" id="monsterSource" readonly>
      </div>
    </form>`;
  }

  adjustDialogSize() {
    const dialogElement = document.querySelector("div.window-app.dialog");
    if (dialogElement) {
      dialogElement.style.width = '600px'; // Initial width
      dialogElement.style.height = 'auto'; // Auto height based on content
      dialogElement.style.resize = 'both'; // Allow resizing both vertically and horizontally
      dialogElement.style.overflow = 'auto'; // Add scroll bars if resized smaller than content
    }
  }

  // Focus the search input
  focusSearchInput() {
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
      searchInput.focus();
    } else {
      console.error("Search input element not found in the DOM.");
    }
  }

  appendFilterSelects() {
    const filterContainer = document.getElementById('filterContainer');
    if (filterContainer) {
      const filterSelects = createFilterSelects();
      filterContainer.appendChild(filterSelects);
    } else {
      console.error("Filter container not found in the DOM.");
    }
  }

  // Method to set up event handlers for the search input
  setupEventHandlers() {
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
      // Bind the input handler
      searchInput.oninput = () => {
        handleSearchInput(searchInput.value);
      };

      // Handle keyboard navigation (Arrow Up/Down, Ctrl+N/P, Enter)
      searchInput.addEventListener('keydown', (event) => {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer || !resultsContainer.children.length) return;

        let activeItem = resultsContainer.querySelector('.active');
        let items = Array.from(resultsContainer.children);

        const isDownKey = event.key === 'ArrowDown' || (event.ctrlKey && event.key === 'n');
        const isUpKey = event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'p');

        if (isDownKey || isUpKey) {
          event.preventDefault();
          this.navigateResults(items, activeItem, isDownKey);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          if (activeItem) {
            selectResult(activeItem);
          }
        }

        console.log('Key pressed:', event.key, 'Ctrl:', event.ctrlKey);
        console.log('Active item:', resultsContainer.querySelector('.active')?.textContent);
      });

      // Remove active class when mouse enters the results container
      const resultsContainer = document.getElementById('searchResults');
      if (resultsContainer) {
        resultsContainer.addEventListener('mouseenter', () => {
          const activeItem = resultsContainer.querySelector('.active');
          if (activeItem) {
            activeItem.classList.remove('active');
          }
        });
      }
    } else {
      console.error("Search input element not found in the DOM.");
    }
  }

  navigateResults(items, activeItem, isDownKey) {
    if (!activeItem) {
      items[isDownKey ? 0 : items.length - 1].classList.add('active');
    } else {
      let currentIndex = items.indexOf(activeItem);
      let newIndex = isDownKey
          ? (currentIndex + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length;
      activeItem.classList.remove('active');
      items[newIndex].classList.add('active');
      items[newIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  // Handle fetching logic
  handleFetch(html) {
    handleFetch();  // Call the external fetch function
  }

}

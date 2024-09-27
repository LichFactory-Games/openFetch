import { handleSearchInput, handleFetch, selectResult } from './fetchHelper.js';
import { createFilterSelects } from './selectors.js';

export class MonsterSearchDialog extends Dialog {
  constructor(dialogData={}, options={}) {
    super({
      title: "Fetch and Search for Monster Data",
      content: MonsterSearchDialog.formHTML(),
      buttons: {
        fetch: {
          icon: '<i class="fas fa-search"></i>',
          label: "Fetch",
          callback: (html) => this.handleFetch(html)
        }
      },
      default: "fetch",
      close: () => console.log("Dialog closed")
    }, options);

    this.render(true);
  }

  static formHTML() {
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

  activateListeners(html) {
    super.activateListeners(html);
    this.setupEventHandlers();
    this.appendFilterSelects();
    this.adjustDialogSize();
    this.focusSearchInput();
  }

  adjustDialogSize() {
    this.element[0].style.width = '600px';
    this.element[0].style.height = 'auto';
    this.element[0].style.resize = 'both';
    this.element[0].style.overflow = 'auto';
  }

  focusSearchInput() {
    const searchInput = this.element[0].querySelector('#searchQuery');
    if (searchInput) {
      searchInput.focus();
    } else {
      console.error("Search input element not found in the DOM.");
    }
  }

  appendFilterSelects() {
    const filterContainer = this.element[0].querySelector('#filterContainer');
    if (filterContainer) {
      const filterSelects = createFilterSelects();
      filterContainer.appendChild(filterSelects);
    } else {
      console.error("Filter container not found in the DOM.");
    }
  }

  setupEventHandlers() {
    const searchInput = this.element[0].querySelector('#searchQuery');
    if (searchInput) {
      searchInput.oninput = () => handleSearchInput(searchInput.value);

      // Remove the keydown event listener from the input
      // and add it to the dialog element instead
      this.element[0].addEventListener('keydown', this._onKeyDown.bind(this));

      const resultsContainer = this.element[0].querySelector('#searchResults');
      if (resultsContainer) {
        resultsContainer.addEventListener('mouseenter', () => {
          const activeItem = resultsContainer.querySelector('.active');
          if (activeItem) activeItem.classList.remove('active');
        });
      }
    } else {
      console.error("Search input element not found in the DOM.");
    }
  }


  _onKeyDown(event) {
    const resultsContainer = this.element[0].querySelector('#searchResults');
    const monsterNameInput = this.element[0].querySelector('#monsterName');

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();

      if (monsterNameInput && monsterNameInput.value) {
        // If a monster is selected (monsterName is populated), trigger the fetch
        this.handleFetch(this.element);
        return;
      } else if (resultsContainer && resultsContainer.children.length) {
        // If no monster is selected yet, but there are search results, select the active one
        const activeItem = resultsContainer.querySelector('.active');
        if (activeItem) selectResult(activeItem);
        return;
      }
    }

    if (!resultsContainer || !resultsContainer.children.length) return;

    const activeItem = resultsContainer.querySelector('.active');
    const items = Array.from(resultsContainer.children);

    const isDownKey = event.key === 'ArrowDown' || (event.ctrlKey && event.key === 'n');
    const isUpKey = event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'p');

    if (isDownKey || isUpKey) {
      event.preventDefault();
      event.stopPropagation();
      this.navigateResults(items, activeItem, isDownKey);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }

    console.log('Key pressed:', event.key, 'Ctrl:', event.ctrlKey);
    console.log('Active item:', resultsContainer.querySelector('.active')?.textContent);
  }

  navigateResults(items, activeItem, isDownKey) {
    let newIndex;
    if (!activeItem) {
      newIndex = isDownKey ? 0 : items.length - 1;
    } else {
      const currentIndex = items.indexOf(activeItem);
      newIndex = isDownKey
        ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
      activeItem.classList.remove('active');
    }
    items[newIndex].classList.add('active');
    items[newIndex].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }


  handleFetch(html) {
    handleFetch();
    this.close(); // Optionally close the dialog after fetching
  }
}

import { handleSearchInput } from './fetchHelper.js';

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
      close: () => console.log("Dialog closed")
    });
    this.dialog.render(true);
  }

  formHTML() {
    return `
      <form>
        <div class="form-group">
          <label for="searchQuery">Search for Monster:</label>
          <input type="text" name="searchQuery" id="searchQuery" style="width: 100%;">
        </div>
        <div id="searchResults" class="search-results"></div>
      </form>`;
  }

  setupEventHandlers() {
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
      searchInput.oninput = () => {
        handleSearchInput(searchInput.value);
      };
    }
  }
}

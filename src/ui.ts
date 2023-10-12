const addSearchInput = (parent: HTMLElement, onInput: { (input: string): void }) => {
  const input = document.createElement('input');
  input.id = 'filter-wt';
  input.className = 'input';
  input.placeholder = 'Search...';
  input.autocomplete = 'off';
  input.style.borderRadius = '1px';

  input.addEventListener('input', (e) => {
    onInput((e.target as HTMLInputElement).value);
  });

  input.addEventListener('mouseenter', (e) => {
    (e.target as HTMLInputElement).focus();
  });

  parent.insertAdjacentElement('beforebegin', input);

  return input;
};

const addLabelTabsContainer = (parent: HTMLElement) => {
  const tabHeader = document.createElement('h4');
  tabHeader.setAttribute('class', 'menu-tabHeader tabs');
  tabHeader.setAttribute('data-xf-init', 'tabs');
  tabHeader.innerHTML = `
<span class="hScroller" data-xf-init="h-scroller">
 <span class="hScroller-scroll" id="label-tabs-container">
 </span><i class="hScroller-action hScroller-action--end" aria-hidden="true"></i><i class="hScroller-action hScroller-action--start" aria-hidden="true"></i>
 </span>
`;

  parent.prepend(tabHeader);

  const container = document.getElementById('label-tabs-container');

  if (container) {
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      // noinspection JSSuspiciousNameCombination
      container.scrollLeft += e.deltaY;
    });
  }
};

const clearTabs = () => {
  const container = document.querySelector('#label-tabs-container');

  if (!container) {
    return;
  }

  container.innerHTML = '';
};

const addTab = (id: string, label: string, onClick: { (): void }) => {
  const container = document.querySelector('#label-tabs-container');

  if (!container) {
    return;
  }

  const tab = document.createElement('a');
  tab.href = '#';
  tab.id = `label-${id}`;
  tab.className = 'tabs-tab';
  tab.setAttribute('role', 'tab');
  tab.innerHTML = label;

  tab.addEventListener('click', (e) => {
    e.preventDefault();
    onClick();
  });

  container.append(tab);
};

const activateTab = (label: string) => {
  const tab = document.getElementById(`label-${label.toLowerCase()}`);

  if (!tab) {
    return false;
  }

  [...document.querySelectorAll(`a[id^="label-"]`)]
    .filter((a) => a.id !== `label-${label.toLowerCase()}`)
    .forEach((a) => {
      if (a.classList.contains('is-active')) {
        a.classList.remove('is-active');
      }
    });

  if (!tab.classList.contains('is-active')) {
    tab.classList.add('is-active');
    return true;
  }

  return false;
};

const addButton = (
  text: string,
  addMargin: boolean,
  onClick: { (el: HTMLAnchorElement): void },
) => {
  const container = document.querySelector('.pageNav');

  if (!container) {
    return;
  }

  const id = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);

  const btn = document.createElement('a');
  btn.href = '#';
  btn.id = `btn-${id}`;
  btn.className = 'pageNav-jump';
  btn.innerHTML = text;

  if (addMargin) {
    btn.style.marginLeft = '6px';
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    onClick(btn);
  });

  container.append(btn);

  return btn;
};

const updateButtonText = (button: HTMLAnchorElement, text: string) => {
  button.innerHTML = text;
};

const ensureButtonsContainerExist = () => {
  if (!document.querySelector('.block-outer > .block-outer-main')) {
    const blockOuterMain = document.createElement('div');
    blockOuterMain.innerHTML = `
<nav class="pageNavWrapper pageNavWrapper--mixed">
  <div class="pageNav  pageNav--skipEnd">
  </div>
</nav>
    `;
    (document.querySelector('.block-outer') as HTMLDivElement).appendChild(blockOuterMain);
  }
};

const removePaginationLinks = () => {
  document.querySelectorAll('.pageNav-main').forEach((nav) => nav.remove());
  document.querySelector('.pageNav > a')?.remove();
  document.querySelector('.block-outer--after > .pageNavWrapper')?.remove();
};

const stylizeBlockContainer = () => {
  const container = document.querySelector('.block-container') as HTMLDivElement;
  container.style.borderRadius = '1px';
};

const createInput = (
  id: string,
  label: string,
  currentValue: string,
  backgroundColor: string = 'transparent',
  placeholder?: string,
) => {
  return `
    <div class="menu-row">
      <div style="font-weight: bold; margin-top:2px; margin-bottom: 8px; color: dodgerblue;">
          ${label}
      </div>
      <input
        id="${id}"
        type="text"
        style="background: ${backgroundColor};"
        class="input"
        autocomplete="off"
        name="keywords"
        placeholder="${placeholder}"
        value="${currentValue}"
      />
    </div>
  `;
};

export {
  activateTab,
  addButton,
  addLabelTabsContainer,
  addSearchInput,
  addTab,
  clearTabs,
  createInput,
  ensureButtonsContainerExist,
  removePaginationLinks,
  stylizeBlockContainer,
  updateButtonText,
};

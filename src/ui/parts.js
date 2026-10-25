const CATEGORY_EN = {
  外部总成: 'EXTERNAL',
  定子总成: 'STATOR',
  转子总成: 'ROTOR',
  支承总成: 'SUPPORT',
  电气接口: 'ELECTRICAL',
};

const CATEGORY_SHORT = {
  外部总成: '外部',
  定子总成: '定子',
  转子总成: '转子',
  支承总成: '支承',
  电气接口: '电气',
};

const escape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

export class PartExplorer {
  constructor({ components, motor, stage, listEl, filtersEl, detailEl, visibleCountEl, onSelect }) {
    this.components = components;
    this.motor = motor;
    this.stage = stage;
    this.listEl = listEl;
    this.filtersEl = filtersEl;
    this.detailEl = detailEl;
    this.visibleCountEl = visibleCountEl;
    this.onSelect = onSelect;
    this.category = '全部';
    this.selectedId = null;
    this.rows = new Map();
    this.active = false;
    this.buildFilters();
    this.buildList();
  }

  buildFilters() {
    const categories = ['全部', ...new Set(this.components.map((c) => c.category))];
    this.filtersEl.innerHTML = '';
    for (const category of categories) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.category = category;
      button.textContent = category === '全部' ? '全部 / ALL' : `${CATEGORY_SHORT[category] ?? category}`;
      button.className = category === '全部' ? 'active' : '';
      button.addEventListener('click', () => {
        this.category = category;
        for (const node of this.filtersEl.children) node.classList.toggle('active', node === button);
        this.applyFilter(true);
      });
      this.filtersEl.appendChild(button);
    }
  }

  buildList() {
    this.listEl.innerHTML = '';
    for (const component of this.components) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'part-row';
      row.dataset.id = component.id;
      row.dataset.category = component.category;
      row.innerHTML = `<span class="part-row-index">${component.index}</span>
        <span class="part-row-name"><b>${escape(component.name)}</b><em>${escape(component.nameEn)}</em></span>
        <span class="part-row-cat">${escape(CATEGORY_SHORT[component.category] ?? component.category)}</span>`;
      row.addEventListener('click', () => this.select(component.id));
      this.listEl.appendChild(row);
      this.rows.set(component.id, { component, row });
    }
    this.visibleCountEl.textContent = String(this.components.length);
  }

  applyFilter(selectFirst = false) {
    let visible = 0;
    for (const { component, row } of this.rows.values()) {
      const show = this.category === '全部' || component.category === this.category;
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    }
    this.visibleCountEl.textContent = String(visible);
    if (selectFirst) {
      const first = this.components.find((c) => this.category === '全部' || c.category === this.category);
      if (first) this.select(first.id);
    } else if (this.selectedId) {
      const selected = this.rows.get(this.selectedId)?.component;
      if (selected && this.category !== '全部' && selected.category !== this.category) {
        const first = this.components.find((c) => c.category === this.category);
        if (first) this.select(first.id);
      }
    }
  }

  setCategory(category) {
    const target = this.components.some((c) => c.category === category) ? category : '全部';
    this.category = target;
    for (const button of this.filtersEl.children) {
      button.classList.toggle('active', button.dataset.category === target);
    }
    this.applyFilter(true);
  }

  activate() {
    this.active = true;
    if (!this.selectedId) this.select('stator-winding');
    else this.select(this.selectedId);
  }

  deactivate() {
    this.active = false;
    this.motor.highlight(null);
    this.stage.clearFocus();
  }

  get current() {
    return this.rows.get(this.selectedId)?.component ?? null;
  }

  select(id, { scroll = true } = {}) {
    const item = this.rows.get(id);
    if (!item) return;
    this.selectedId = id;
    for (const [rowId, { row }] of this.rows) {
      row.classList.toggle('active', rowId === id);
    }
    this.renderDetail(item.component);
    if (this.active) this.motor.highlight(id);
    if (scroll) this.scrollRowIntoView(item.row);
    this.onSelect?.(item.component);
  }

  selectNext(direction) {
    const visible = this.components.filter(
      (c) => this.category === '全部' || c.category === this.category,
    );
    if (!visible.length) return;
    const index = visible.findIndex((c) => c.id === this.selectedId);
    const next = visible[(index + direction + visible.length) % visible.length];
    this.select(next.id);
  }

  scrollRowIntoView(row) {
    if (!row) return;
    const listRect = this.listEl.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const style = getComputedStyle(this.listEl);
    const isRowLayout = style.display.includes('flex') && style.flexDirection === 'row';
    if (isRowLayout) {
      const left =
        this.listEl.scrollLeft +
        (rowRect.left - listRect.left) -
        (this.listEl.clientWidth - rowRect.width) / 2;
      this.listEl.scrollTo({ left, behavior: 'smooth' });
    } else {
      const top =
        this.listEl.scrollTop +
        (rowRect.top - listRect.top) -
        (this.listEl.clientHeight - rowRect.height) / 2;
      this.listEl.scrollTo({ top, behavior: 'smooth' });
    }
  }

  renderDetail(component) {
    const categoryEn = CATEGORY_EN[component.category] ?? 'COMPONENT';
    const facts = component.facts
      .map(
        (fact) => `<div class="part-fact"><span>${escape(fact.label)}</span><b>${escape(fact.value)}</b></div>`,
      )
      .join('');
    const standards = (component.standards ?? [])
      .map((standard) => `<span>${escape(standard)}</span>`)
      .join('');
    this.detailEl.innerHTML = `
      <div class="part-detail-head">
        <div class="part-detail-num">${escape(component.index)}</div>
        <div class="part-detail-cat">${escape(component.category)}<span>${categoryEn} / COMPONENT</span></div>
      </div>
      <h3 class="part-detail-name">${escape(component.name)}</h3>
      <div class="part-detail-en">${escape(component.nameEn)}</div>
      <p class="part-summary">${escape(component.summary)}</p>
      <div class="part-metrics">
        <div class="part-metric"><span>MATERIAL / 材料</span><b>${escape(component.material)}</b></div>
        <div class="part-metric"><span>QUANTITY / 数量</span><b>${escape(component.quantity)} 件</b></div>
        <div class="part-metric"><span>MASS / 质量</span><b>${escape(component.mass)}</b></div>
        <div class="part-metric"><span>SYSTEM / 系统</span><b>${escape(component.category)}</b></div>
      </div>
      <p class="part-detail-body">${escape(component.detail)}</p>
      <div class="part-facts">${facts}</div>
      <div class="part-assembly"><b>ASSEMBLY NOTE / 装配</b>${escape(component.assembly)}</div>
      <div class="part-standards">${standards}</div>
      <div class="part-actions">
        <button type="button" class="primary-action" data-action="focus">聚焦部件</button>
        <button type="button" data-action="prev">← 上一件</button>
        <button type="button" data-action="next">下一件 →</button>
      </div>
    `;
    this.detailEl.querySelector('[data-action="focus"]')?.addEventListener('click', () => {
      this.stage.focusPart(component.id);
    });
    this.detailEl.querySelector('[data-action="prev"]')?.addEventListener('click', () => this.selectNext(-1));
    this.detailEl.querySelector('[data-action="next"]')?.addEventListener('click', () => this.selectNext(1));
    this.detailEl.scrollTop = 0;
  }
}

const STORAGE_KEYS = {
  apiBase: 'mijornalRooms.apiBase',
  token: 'mijornalRooms.token',
  refreshToken: 'mijornalRooms.refreshToken',
  user: 'mijornalRooms.user',
  defaultDeposit: 'mijornalRooms.defaultDeposit',
  minimumMonthlyDays: 'mijornalRooms.minimumMonthlyDays',
};

const DEFAULT_PROXY_PATH = '/mijornalroomsFrontend/api-proxy.php';
const DEFAULT_API_BASE = `http://localhost${DEFAULT_PROXY_PATH}`;
const SETTINGS_SECTION = 'settings';
const STATISTICS_SECTION = 'statistics';
const DEFAULT_TENANT_DEPOSIT_AMOUNT = 100;
const DEFAULT_MINIMUM_MONTHLY_DAYS = 7;

function getSavedApiBase() {
  localStorage.setItem(STORAGE_KEYS.apiBase, DEFAULT_API_BASE);
  return DEFAULT_API_BASE;
}

function getSavedNumber(key, fallback, min = 0, max = Number.POSITIVE_INFINITY) {
  const value = Number.parseFloat(localStorage.getItem(key));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function getDefaultDepositAmount() {
  return getSavedNumber(STORAGE_KEYS.defaultDeposit, DEFAULT_TENANT_DEPOSIT_AMOUNT, 0);
}

function getMinimumMonthlyDays() {
  return Math.round(getSavedNumber(STORAGE_KEYS.minimumMonthlyDays, DEFAULT_MINIMUM_MONTHLY_DAYS, 1, 31));
}

function getStoredSessionValue(key) {
  const value = sessionStorage.getItem(key) || '';
  localStorage.removeItem(key);
  return value;
}

function getStoredSessionUser() {
  const value = sessionStorage.getItem(STORAGE_KEYS.user) || '{}';
  localStorage.removeItem(STORAGE_KEYS.user);
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

const resources = window.resources;
const resourceMenuActions = window.resourceMenuActions;

const state = {
  apiBase: getSavedApiBase(),
  token: getStoredSessionValue(STORAGE_KEYS.token),
  refreshToken: getStoredSessionValue(STORAGE_KEYS.refreshToken),
  user: getStoredSessionUser(),
  activeSection: 'dashboard',
  activeResource: null,
  rows: [],
  editingId: null,
  tenantHouseFilter: null,
  houseStatusFilter: 'activas',
  tenantSortFilter: '',
  liquidationMonthFilter: '',
  accountingStartDateFilter: '',
  accountingEndDateFilter: '',
  expenseTypeFilter: '',
  expenseHouseFilter: '',
  expenseStartDateFilter: '',
  expenseEndDateFilter: '',
  paymentStatusFilter: 'pendientes',
  expenseHouseOptions: [],
  expenseTenantOptions: [],
  expenseConceptOptions: [],
  adminOwnerHouseRows: [],
  adminHouseOwnerRows: [],
  adminHouseRoomRows: [],
  adminRoomTenantRows: [],
  adminPaymentTenantRows: [],
  adminPaymentFilters: {
    q: '',
    month: '',
    year: '',
    concept: '',
    tenant: '',
    house: '',
    includeFuture: false,
  },
  adminPaymentHouseOptions: [],
  adminTenantFilters: {
    q: '',
    id_vivienda: '',
    id_habitacion: '',
    activo: '1',
  },
  adminTenantHouseOptions: [],
  adminTenantRoomOptions: [],
  adminUserFilters: {
    q: '',
    rol: '',
    activo: '1',
  },
  adminOwnerFilters: {
    q: '',
    activo: '1',
  },
  adminOwnerHouseOptions: [],
  adminHouseFilters: {
    q: '',
    activa: '1',
    id_propietario: '',
  },
  adminHouseOwnerOptions: [],
  adminRoomFilters: {
    q: '',
    id_vivienda: '',
    tipo: '',
    ocupada: '',
    activa: '1',
  },
  adminRoomHouseOptions: [],
  adminExpenseFilters: {
    q: '',
    id_vivienda: '',
    tipo: '',
    month: '',
    year: '',
    status: 'pendiente',
  },
  adminExpenseHouseOptions: [],
  adminLiquidationFilters: {
    q: '',
    id_vivienda: '',
    id_propietario: '',
    month: '',
    year: '',
    estado: '',
  },
  adminLiquidationHouseOptions: [],
  adminLiquidationOwnerOptions: [],
  pendingPaymentOptions: [],
  activeExpenseDetailRow: null,
  activePaymentDetailRow: null,
  activeHouseRecordId: null,
  activeHouseDetail: null,
  roomsSelectedHouseId: '',
  editingRoomForm: null,
  roomFormLocked: false,
  activeLiquidationDetailId: null,
  activeTenantDetailId: null,
  tenantAssignmentRows: [],
  resourceAction: null,
  collapsedNavGroups: {},
  availableRooms: [],
  editingTenantFull: null,
  tenantAvatarFile: null,
  editingHouseRooms: [],
  userMenuOpen: false,
};

let healthRetryTimer = null;
const IDLE_LOGOUT_MS = 30 * 60 * 1000;
const IDLE_ACTIVITY_THROTTLE_MS = 1000;
let idleLogoutTimer = null;
let lastUserActivityAt = Date.now();
let lastIdleActivityHandledAt = 0;
let tenantAvatarCrop = null;
let houseAutoSaveTimer = null;
let houseAutoSaveInFlight = false;
let houseAutoSavePending = false;
const avatarObjectUrls = new WeakMap();

const ADMIN_MENU_SECTIONS = {
  dashboard: 'Dashboard',
  users: 'Usuarios',
  tenants: 'Inquilinos',
  owners: 'Propietarios',
  houses: 'Viviendas',
  rooms: 'Habitaciones',
  payments: 'Pagos',
  deposits: 'Fianzas',
  expenses: 'Gastos',
  liquidations: 'Liquidaciones',
};
const ADMIN_MENU_SECTION_KEYS = new Set(Object.keys(ADMIN_MENU_SECTIONS));

const $ = (selector) => document.querySelector(selector);

const apiBaseInput = $('#apiBaseInput');
const defaultDepositInput = $('#defaultDepositInput');
const minimumMonthlyDaysInput = $('#minimumMonthlyDaysInput');
const apiStatus = $('#apiStatus');
const apiDot = $('#apiDot');
const roleBadge = $('#roleBadge');
const sectionEyebrow = $('#sectionEyebrow');
const loginPanel = $('#loginPanel');
const workspace = $('#workspace');
const logoutButton = $('#logoutButton');
const mainNav = $('#mainNav');
const adminNav = $('#adminNav');
const adminView = $('#adminView');
const dashboardView = $('#dashboardView');
const configView = $('#configView');
const statisticsView = $('#statisticsView');
const crudView = $('#crudView');
const resourceForm = $('#resourceForm');
const tableWrap = document.querySelector('.table-wrap');
const tableHead = $('#tableHead');
const tableBody = $('#tableBody');
const expenseTotal = $('#expenseTotal');
const searchInput = $('#searchInput');
const monthFilter = $('#monthFilter');
const tenantSortFilter = $('#tenantSortFilter');
const accountingPeriodFilter = $('#accountingPeriodFilter');
const expenseTypeFilter = $('#expenseTypeFilter');
const paymentStatusFilter = $('#paymentStatusFilter');
const expenseHouseFilter = $('#expenseHouseFilter');
const expenseStartDateFilter = $('#expenseStartDateFilter');
const expenseEndDateFilter = $('#expenseEndDateFilter');
const expenseApplyFilter = $('#expenseApplyFilter');
const expenseFilterBar = $('#expenseFilterBar');
const detailPanel = $('#detailPanel');
const toast = $('#toast');
const splitLayout = document.querySelector('.split');
const resourceDocumentActions = $('#resourceDocumentActions');
const HOUSE_ROOM_TYPES = [
  ['grande', 'Grande'],
  ['mediana', 'Mediana'],
  ['pequena', 'Pequeña'],
];

function setSession(data) {
  state.token = data.token || '';
  state.refreshToken = data.refresh_token || '';
  state.user = data.user || {};
  syncUserFromToken();
  sessionStorage.setItem(STORAGE_KEYS.token, state.token);
  sessionStorage.setItem(STORAGE_KEYS.refreshToken, state.refreshToken);
  sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
  startIdleSession();
}

function clearSession() {
  clearIdleLogoutTimer();
  state.token = '';
  state.refreshToken = '';
  state.user = {};
  sessionStorage.removeItem(STORAGE_KEYS.token);
  sessionStorage.removeItem(STORAGE_KEYS.refreshToken);
  sessionStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
}

function clearIdleLogoutTimer() {
  if (!idleLogoutTimer) return;
  window.clearTimeout(idleLogoutTimer);
  idleLogoutTimer = null;
}

function startIdleSession() {
  lastUserActivityAt = Date.now();
  lastIdleActivityHandledAt = 0;
  scheduleIdleLogout();
}

function scheduleIdleLogout() {
  clearIdleLogoutTimer();
  if (!state.token) return;

  const remainingMs = IDLE_LOGOUT_MS - (Date.now() - lastUserActivityAt);
  if (remainingMs <= 0) {
    logoutDueToInactivity();
    return;
  }

  idleLogoutTimer = window.setTimeout(logoutDueToInactivity, remainingMs);
}

function handleUserActivity() {
  if (!state.token) return;

  const now = Date.now();
  if (now - lastIdleActivityHandledAt < IDLE_ACTIVITY_THROTTLE_MS) return;

  lastIdleActivityHandledAt = now;
  lastUserActivityAt = now;
  scheduleIdleLogout();
}

function logoutDueToInactivity() {
  if (!state.token) return;
  clearSession();
  state.userMenuOpen = false;
  renderAuth();
  showToast('Sesión cerrada por inactividad', 'error');
}

if (state.token && !state.user?.rol) {
  clearSession();
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

function syncUserFromToken() {
  const payload = state.token ? decodeJwtPayload(state.token) : null;
  if (!payload?.rol) return;
  state.user = {
    ...state.user,
    id_usuario: payload.id_usuario,
    email: payload.email || state.user.email,
    rol: payload.rol,
  };
  sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
}

syncUserFromToken();

function getCurrentRole() {
  return state.user?.rol || 'guest';
}

function isAdminMenuMode() {
  return getCurrentRole() === 'admin';
}

function canAccessAdminMenuSection(section) {
  return isAdminMenuMode() && ADMIN_MENU_SECTION_KEYS.has(section);
}

function guardAdminMenuSection(section = 'dashboard') {
  if (canAccessAdminMenuSection(section)) return true;

  adminView?.classList.add('hidden');
  showToast('No tienes permisos para acceder al menú administrador', 'error');
  return false;
}

function canAccessSection(section) {
  if (section === 'dashboard') return true;
  if (section === SETTINGS_SECTION) return true;
  if (section === STATISTICS_SECTION) return true;
  const resource = resources[section];
  return Boolean(resource && (resource.roles || ['admin']).includes(getCurrentRole()));
}

function isResourceReadOnly(resource) {
  return (resource?.readOnlyRoles || []).includes(getCurrentRole());
}

function canMutateRows(resource) {
  return !isResourceReadOnly(resource) && !resource?.disableRowMutations;
}

function canCreateResource(resource) {
  return !isResourceReadOnly(resource) && !resource?.disableCreate;
}

function getResourceActionConfig(section, action) {
  return (resourceMenuActions[section] || []).find((item) => item.action === action) || null;
}

function isNavGroupCollapsed(section) {
  return state.collapsedNavGroups[section] !== false;
}

function collapseAllNavGroups(exceptSection = '') {
  Object.keys(resourceMenuActions).forEach((section) => {
    if (section !== exceptSection) state.collapsedNavGroups[section] = true;
  });
}

function getAccessibleResourceKeys() {
  if (getCurrentRole() === 'inquilino') {
    return ['tenantUserData', 'tenants', 'tenantContracts', 'expenses', 'payments', 'deposits'].filter((key) => canAccessSection(key));
  }
  return Object.keys(resources).filter((key) => canAccessSection(key));
}

function getDashboardResourceKeys() {
  return getAccessibleResourceKeys();
}

function getResourceEndpoint(resource) {
  return resource.endpointByRole?.[getCurrentRole()] || resource.endpoint;
}

function getResourceTitle(resource) {
  return resource.titleByRole?.[getCurrentRole()] || resource.title;
}

function getResourceHint(resource) {
  return resource.hintByRole?.[getCurrentRole()] || resource.hint;
}

function getResourceColumns(resource) {
  return resource.columnsByRole?.[getCurrentRole()] || resource.columns;
}

function getResourceFields(resource) {
  return resource.fieldsByRole?.[getCurrentRole()] || resource.fields;
}

function getRowActions(resource, row) {
  if (resource === resources.tenantContracts && getCurrentRole() === 'inquilino') {
    const actions = [
      {
        action: 'preview-contract',
        id: getValue(row, resource.idKey),
        label: 'Ver contrato',
      },
    ];
    if (getValue(row, 'contrato_firmado_archivo')) {
      actions.push({
        action: 'preview-signed-contract',
        id: getValue(row, resource.idKey),
        label: 'Ver firmado',
      });
    }
    return actions;
  }

  return [];
}

function isHouseResource(resource) {
  return resource === resources.houses;
}

function isLiquidationResource(resource) {
  return resource === resources.ownerLiquidations;
}

function isExpenseFilterResource(resource) {
  return resource === resources.ownerExpenses || resource === resources.expenses;
}

function isPaymentResource(resource) {
  return resource === resources.payments || resource === resources.deposits;
}

function isDepositResource(resource) {
  return resource === resources.deposits;
}

function isFinancialFilterResource(resource) {
  return isExpenseFilterResource(resource) || isPaymentResource(resource);
}

function getRowClass(resource, row = {}) {
  const isActiveHouseRow = isHouseResource(resource)
    && state.activeHouseRecordId
    && String(getValue(row, 'id_vivienda') || '') === String(state.activeHouseRecordId);
  const isActiveTenantRow = resource === resources.tenants
    && state.activeTenantDetailId
    && String(getValue(row, 'id_inquilino') || '') === String(state.activeTenantDetailId);
  const clickable =
    (resource === resources.tenants && !state.resourceAction) ||
    isPaymentResource(resource) ||
    isDepositResource(resource) ||
    (isHouseResource(resource) && (!state.resourceAction || state.resourceAction === 'update')) ||
    isLiquidationResource(resource) ||
    isExpenseFilterResource(resource);
  const classes = [
    clickable ? 'clickable-row' : '',
    isActiveHouseRow ? 'active-house-row' : '',
    isActiveTenantRow ? 'active-tenant-row' : '',
    isExpenseFilterResource(resource) && isCancelledExpense(row) ? 'cancelled-expense-row' : '',
    (isPaymentResource(resource) || isDepositResource(resource) || isExpenseFilterResource(resource)) && getPaymentFilterStatus(row) === 'completados' ? 'completed-payment-row' : '',
  ].filter(Boolean);

  return classes.length ? ` class="${classes.join(' ')}"` : '';
}

function getRowDataAttributes(resource, row) {
  if (resource === resources.tenants && !state.resourceAction) {
    return ` data-action="select-tenant" data-id="${getValue(row, 'id_inquilino')}"`;
  }

  if (isDepositResource(resource)) {
    return ` data-action="open-deposit-detail" data-id="${escapeHtml(row.id_fianza || '')}"`;
  }

  if (isPaymentResource(resource)) {
    return ` data-action="open-payment-detail" data-payment-key="${escapeHtml(row.payment_key || '')}"`;
  }

  if (isHouseResource(resource) && state.resourceAction === 'update') {
    return ` data-action="edit-house" data-id="${getValue(row, 'id_vivienda')}"`;
  }

  if (isHouseResource(resource) && !state.resourceAction) {
    return ` data-action="open-house-detail" data-id="${getValue(row, 'id_vivienda')}"`;
  }

  if (isLiquidationResource(resource)) {
    return ` data-action="open-liquidation-detail" data-id="${getValue(row, 'id_liquidacion')}"`;
  }

  if (isExpenseFilterResource(resource)) {
    return ` data-action="open-expense-detail" data-id="${escapeHtml(row.expense_id || '')}" data-endpoint="${escapeHtml(row.expense_endpoint || '')}"`;
  }

  return '';
}

function applyResourceFilter(rows, resource, options = {}) {
  if (resource === resources.tenants && state.tenantHouseFilter) {
    return rows.filter((row) => String(getValue(row, 'id_vivienda')) === String(state.tenantHouseFilter.id));
  }

  if (resource === resources.ownerLiquidations) {
    return rows.filter((row) => isRowInsideAccountingPeriod(row));
  }

  if (resource === resources.houses && !isAdminMenuMode()) {
    if (state.houseStatusFilter === 'todas') return rows;
    return rows.filter((row) => {
      const active = getValue(row, 'activa');
      const isActive = !(active === false || Number(active) === 0 || String(active).toLowerCase() === 'false');
      return state.houseStatusFilter === 'desactivadas' ? !isActive : isActive;
    });
  }

  if (isFinancialFilterResource(resource)) {
    return rows.filter((row) => {
      const expenseTime = getExpenseDateTime(row);
      const startTime = state.expenseStartDateFilter ? Date.parse(state.expenseStartDateFilter) : 0;
      const endTime = state.expenseEndDateFilter ? Date.parse(state.expenseEndDateFilter) : 0;
      const selectedPaymentStatus = options.forcePaymentStatus || state.paymentStatusFilter;
      const paymentStatus = (isPaymentResource(resource) || isExpenseFilterResource(resource)) && selectedPaymentStatus !== 'todos'
        ? (selectedPaymentStatus || 'pendientes')
        : '';
      return (!state.expenseTypeFilter || row.gasto_de_value === state.expenseTypeFilter)
        && (!paymentStatus || getPaymentFilterStatus(row) === paymentStatus)
        && expenseRowMatchesSelectedHouse(row)
        && (!startTime || (expenseTime && expenseTime >= startTime))
        && (!endTime || (expenseTime && expenseTime <= endTime));
    });
  }

  return rows;
}

function compareText(left, right, key) {
  return String(getValue(left, key) || '').localeCompare(String(getValue(right, key) || ''), 'es', {
    sensitivity: 'base',
  });
}

function compareDate(left, right, key) {
  const leftTime = Date.parse(getValue(left, key) || '') || 0;
  const rightTime = Date.parse(getValue(right, key) || '') || 0;
  return leftTime - rightTime;
}

function sortPaymentsByTenantName(rows = []) {
  return rows.slice().sort((left, right) => {
    const nameCompare = String(left.nombre_inquilino || '').localeCompare(String(right.nombre_inquilino || ''), 'es', {
      sensitivity: 'base',
    });
    if (nameCompare) return nameCompare;
    return getExpenseDateTime(left) - getExpenseDateTime(right);
  });
}

function getExpenseHouseValue(row) {
  return String(row.id_vivienda || row.nombre_vivienda || '');
}

function getExpenseHouseLabel(row) {
  return String(row.nombre_vivienda || row.id_vivienda || 'Sin vivienda');
}

function getExpenseHouseOptionLabel(value) {
  return state.expenseHouseOptions.find((option) => String(option.value) === String(value))?.label || '';
}

function expenseRowMatchesSelectedHouse(row) {
  if (!state.expenseHouseFilter) return true;

  const selectedValue = String(state.expenseHouseFilter);
  const selectedLabel = getExpenseHouseOptionLabel(selectedValue);
  return getExpenseHouseValue(row) === selectedValue
    || (selectedLabel && getExpenseHouseLabel(row) === selectedLabel);
}

function getExpenseDateTime(row) {
  const value = row.fecha_recibo || row.fecha || row.fecha_inicio || row.fecha_fin || row.fecha_pago || '';
  if (!value) return 0;
  const text = String(value);
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return Date.parse(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`);
  const displayMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (displayMatch) return Date.parse(`${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`);
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function parseMoneyValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value || '')
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '');
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  const normalized = hasComma
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : (hasDot ? cleaned : cleaned.replace(',', '.'));
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? number : 0;
}

function isCancelledExpense(row = {}) {
  return String(row.estado || '').toLowerCase() === 'cancelado';
}

function formatExpenseTotal(value) {
  return `${value.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

function updateExpenseTotal(rows, resource) {
  if (!expenseTotal) return;
  const showTotal = isFinancialFilterResource(resource);
  expenseTotal.classList.toggle('hidden', !showTotal);
  if (!showTotal) {
    expenseTotal.innerHTML = '';
    return;
  }

  const forcedPaymentStatus = (isPaymentResource(resource) || isExpenseFilterResource(resource)) && state.paymentStatusFilter === 'completados'
    ? 'completados'
    : 'pendientes';
  const totalRows = isPaymentResource(resource) || isExpenseFilterResource(resource)
    ? applyResourceFilter(state.rows, resource, { forcePaymentStatus: forcedPaymentStatus })
    : rows;
  const total = totalRows
    .filter((row) => !isCancelledExpense(row))
    .reduce((sum, row) => {
      if (isPaymentResource(resource)) {
        return sum + parseMoneyValue(
          forcedPaymentStatus === 'completados'
            ? row.importe_pagado ?? row.importe
            : row.importe_pendiente ?? row.importe,
        );
      }
      return sum + parseMoneyValue(row.importe ?? row.importe_total);
    }, 0);
  const label = isDepositResource(resource)
    ? 'Total fianzas'
    : isPaymentResource(resource)
    ? (forcedPaymentStatus === 'completados' ? 'Total completados' : 'Total pendiente')
    : 'Total gastos';
  expenseTotal.innerHTML = `<span>${label}</span><strong>${formatExpenseTotal(total)}</strong>`;
}

function normalizeOwnerExpenseRows(rows = []) {
  return rows.map((row) => ({
    ...row,
    gasto_de: 'Propietario',
    gasto_de_value: 'propietario',
    concepto: row.concepto || row.descripcion || row.tipo || '',
    importe: row.importe,
    fecha: row.fecha,
    expense_source: 'owner',
    expense_endpoint: resources.ownerExpenses.endpoint,
    expense_id: row.id_gasto_propietario,
  }));
}

function parseTenantExpenseTarget(row = {}) {
  if (String(row.tipo || '').toLowerCase() === 'fianza') {
    return {
      value: 'fianza',
      label: 'Fianza',
      description: row.descripcion || 'Fianza',
    };
  }

  const description = String(row.descripcion || '');
  const match = description.match(/^\[gasto_de:(vivienda|inquilino)\]\s*/);
  const value = row.gasto_de || match?.[1] || (row.id_inquilino ? 'inquilino' : 'vivienda');
  return {
    value,
    label: value === 'inquilino' ? 'Inquilino' : 'Vivienda',
    description: match ? description.replace(match[0], '') : description,
  };
}

function isTenantDepositExpense(row = {}) {
  return String(row.tipo || '').toLowerCase() === 'fianza';
}

function normalizeTenantExpenseRows(rows = []) {
  return rows.map((row) => ({
    ...row,
    ...(() => {
      const target = parseTenantExpenseTarget(row);
      return {
        id_gasto_propietario: `I-${row.id_gasto}`,
        gasto_de: target.label,
        gasto_de_value: target.value,
        concepto: row.concepto || target.description || row.tipo || '',
        descripcion: target.description,
        importe: row.importe_total,
        fecha: row.fecha_inicio,
        expense_source: 'tenant',
        expense_endpoint: resources.expenses.endpoint,
        expense_id: row.id_gasto,
      };
    })(),
  }));
}

async function enrichTenantExpenseRowsWithNames(rows = [], tenants = []) {
  const tenantsById = new Map(normalizeTenantRows(tenants).map((tenant) => [String(tenant.id_inquilino), tenant]));
  const missingIds = Array.from(new Set(rows
    .filter((row) => String(row.gasto_de_value || row.gasto_de || '').toLowerCase() === 'inquilino')
    .filter((row) => !(row.nombre_inquilino || row.nombre) || !(row.apellido1_inquilino || row.apellido1))
    .map((row) => String(row.id_inquilino || ''))
    .filter((id) => id && !tenantsById.has(id))));

  await Promise.all(missingIds.map(async (id) => {
    try {
      const tenant = await request(`${getResourceEndpoint(resources.tenants)}/${encodeURIComponent(id)}`);
      if (tenant?.id_inquilino) tenantsById.set(String(tenant.id_inquilino), tenant);
    } catch {
      // Mantener la fila tal cual si no hay permiso o el inquilino ya no existe.
    }
  }));

  return rows.map((row) => {
    const tenant = tenantsById.get(String(row.id_inquilino || ''));
    return tenant ? {
      ...row,
      nombre_inquilino: row.nombre_inquilino || tenant.nombre,
      apellido1_inquilino: row.apellido1_inquilino || tenant.apellido1,
    } : row;
  });
}

function parseAppDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const text = String(value).trim();
  if (text.includes('T')) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  const displayMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (displayMatch) return new Date(Number(displayMatch[3]), Number(displayMatch[2]) - 1, Number(displayMatch[1]));
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getAppMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getRowMonthData(row = {}) {
  const month = Number(row.mes || row.month);
  const year = Number(row.anio || row.year);
  if (month && year) return { month, year, key: getAppMonthKey(year, month) };

  const date = parseAppDate(row.fecha || row.fecha_inicio || row.fecha_pago || row.created_at);
  if (!date) return { month: 0, year: 0, key: '' };
  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
    key: getAppMonthKey(date.getFullYear(), date.getMonth() + 1),
  };
}

function getTenantDisplayLabel(tenant = {}) {
  return [tenant.nombre, tenant.apellido1, tenant.apellido2].filter(Boolean).join(' ')
    || tenant.email
    || `Inquilino #${tenant.id_inquilino || ''}`.trim();
}

function tenantIsActiveForExpense(tenant = {}) {
  const active = tenant.activo;
  return active === undefined || active === null || active === true || Number(active) === 1 || String(active).toLowerCase() === 'true';
}

function startOfAppDay(date) {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getInclusiveDayCount(startDate, endDate) {
  const start = startOfAppDay(startDate);
  const end = startOfAppDay(endDate);
  if (!start || !end || end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

function getDateOverlap(startA, endA, startB, endB) {
  const start = new Date(Math.max(startOfAppDay(startA)?.getTime() || 0, startOfAppDay(startB)?.getTime() || 0));
  const end = new Date(Math.min(startOfAppDay(endA)?.getTime() || 0, startOfAppDay(endB)?.getTime() || 0));
  if (!startA || !endA || !startB || !endB || end < start) {
    return { start: null, end: null, days: 0 };
  }
  return { start, end, days: getInclusiveDayCount(start, end) };
}

function getMonthRange(year, month) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0),
  };
}

function getTenantStayRange(tenant = {}, fallbackEnd = new Date()) {
  const start = parseAppDate(tenant.fecha_entrada) || parseAppDate(tenant.created_at);
  const end = parseAppDate(tenant.fecha_salida) || fallbackEnd;
  return { start, end };
}

function getTenantOverlapDays(tenant, rangeStart, rangeEnd) {
  const stay = getTenantStayRange(tenant, rangeEnd);
  return getDateOverlap(stay.start, stay.end, rangeStart, rangeEnd).days;
}

function getTenantsForHousePeriod(tenants = [], houseId, rangeStart, rangeEnd) {
  return tenants
    .filter((tenant) => String(tenant.id_vivienda || '') === String(houseId || ''))
    .map((tenant) => ({
      tenant,
      days: getTenantOverlapDays(tenant, rangeStart, rangeEnd),
    }))
    .filter((entry) => entry.days > 0);
}

function getPaymentRowsForTenantMonth(payments, tenantId, monthData) {
  return payments.filter((payment) => {
    if (isCancelledExpense(payment)) return false;
    if (String(payment.id_inquilino || '') !== String(tenantId)) return false;
    const paymentMonth = getRowMonthData(payment);
    return paymentMonth.key && paymentMonth.key === monthData.key;
  });
}

function getPaymentAmount(rows = [], matcher = null) {
  return rows
    .filter((row) => !matcher || matcher(row))
    .reduce((total, row) => total + parseMoneyValue(row.importe ?? row.importe_asignado ?? row.importe_total), 0);
}

function isCompletedPaymentStatus(value) {
  return ['pagado', 'pagada', 'completado', 'completada', 'completo', 'paid']
    .includes(String(value || '').trim().toLowerCase());
}

function getPaidPaymentAmount(row = {}) {
  if (row.importe_pagado !== undefined || row.pagado !== undefined) {
    return parseMoneyValue(row.importe_pagado ?? row.pagado);
  }
  if (isCompletedPaymentStatus(row.estado) || row.fecha_pago) {
    return parseMoneyValue(row.importe ?? row.importe_asignado ?? row.importe_total);
  }
  return 0;
}

function getPaymentSettlementAmount(row = {}) {
  return Math.max(getPaidPaymentAmount(row), 0);
}

function isDepositPaymentRow(row = {}) {
  return String(row.gasto_de_value || '').toLowerCase() === 'fianza'
    || String(row.concepto || '').toLowerCase().includes('fianza')
    || String(row.tipo_movimiento || '').toLowerCase().includes('fianza');
}

function getLedgerPaymentStatus(expectedAmount, paymentRows = []) {
  const validRows = paymentRows.filter((row) => !isCancelledExpense(row));
  const paidAmount = validRows.reduce((total, row) => total + getPaymentSettlementAmount(row), 0);
  return expectedAmount > 0 && paidAmount >= expectedAmount - 0.009 ? 'completados' : 'pendientes';
}

function getPaymentApplicationHistoryFromComments(comments = '') {
  const text = String(comments || '');
  const regex = /Pago aplicado:\s*([0-9]{2}-[0-9]{2}-[0-9]{4})\s*·\s*Importe:\s*([-0-9.,]+)\s*€\s*·\s*Forma de pago:\s*([^\n·]+)/g;
  const rows = [];
  let match = regex.exec(text);
  while (match) {
    rows.push({
      amount: parseMoneyValue(match[2]),
      date: match[1],
      method: match[3].trim(),
      comments: text,
    });
    match = regex.exec(text);
  }
  return rows;
}

function getPaymentHistoryRows(rows = []) {
  return rows
    .filter((row) => getPaidPaymentAmount(row) !== 0 || row.fecha_pago)
    .flatMap((row) => {
      if (Array.isArray(row.payment_history) && row.payment_history.length) {
        return row.payment_history.map((item) => ({
          amount: parseMoneyValue(item.amount ?? item.importe),
          date: item.date || item.fecha || '',
          method: item.method || item.metodo_pago || '',
          user: item.user || item.usuario_nombre || '',
          comments: item.comments || item.comentarios || '',
        }));
      }
      const commentHistory = getPaymentApplicationHistoryFromComments(row.comentarios);
      if (commentHistory.length) {
        const historyTotal = commentHistory.reduce((total, item) => total + parseMoneyValue(item.amount), 0);
        const missingAmount = getPaymentSettlementAmount(row) - historyTotal;
        if (Math.abs(missingAmount) > 0.009) {
          return [
            {
              amount: missingAmount,
              date: row.fecha_pago || row.fecha || '',
              method: String(row.comentarios || '').match(/Forma de pago:\s*([^·\n]+)/)?.[1]?.trim() || 'Pago aplicado anterior',
              comments: row.comentarios || '',
            },
            ...commentHistory,
          ];
        }
        return commentHistory;
      }
      return [{
        amount: getPaidPaymentAmount(row),
        date: row.fecha_pago || row.fecha || '',
        method: /compensad[oa].*fianza/i.test(String(row.comentarios || ''))
          ? 'Compensado con fianza'
          : String(row.comentarios || '').match(/Forma de pago:\s*([^·\n]+)/)?.[1]?.trim() || '',
        comments: row.comentarios || '',
      }];
    })
    .sort((left, right) => getExpenseDateTime(left) - getExpenseDateTime(right));
}

function getPaymentStoredComments(row = {}) {
  if (row.comentarios) return String(row.comentarios);
  const historyComment = (row.payment_history || []).find((item) => item.comments)?.comments;
  return historyComment ? String(historyComment) : '';
}

function getPaymentFilterStatus(row = {}) {
  if (row.estado_pago === 'completados' || row.estado_pago === 'pendientes') return row.estado_pago;
  if (row.id_fianza) {
    return ['pendiente', 'devuelta_parcial'].includes(String(row.estado || '').toLowerCase())
      ? 'pendientes'
      : 'completados';
  }
  if (isCompletedPaymentStatus(row.estado)) return 'completados';
  const expectedAmount = parseMoneyValue(row.importe ?? row.importe_total ?? row.importe_asignado);
  const paidAmount = getPaymentSettlementAmount(row);
  return expectedAmount > 0 && paidAmount >= expectedAmount - 0.009 ? 'completados' : 'pendientes';
}

function getPaymentDateDisplay(rows = []) {
  return rows
    .map((row) => row.fecha_pago || row.fecha || '')
    .filter(Boolean)
    .map(toDisplayDate)
    .join(', ');
}

function getHouseDisplayLabel(house = {}, fallbackTenant = {}) {
  return house.nombre || fallbackTenant.nombre_vivienda || fallbackTenant.id_vivienda || '';
}

function addAppDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isTenantOccupyingDay(tenant, day) {
  const stay = getTenantStayRange(tenant, day);
  const appDay = startOfAppDay(day);
  return Boolean(stay.start && stay.end && appDay >= stay.start && appDay <= stay.end);
}

function parseRoomPriceHistory(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getRoomPriceForDay(roomTenants = [], day, fallbackPrice = 0) {
  const appDay = startOfAppDay(day);
  const history = roomTenants
    .flatMap((tenant) => parseRoomPriceHistory(tenant.precios_habitacion))
    .map((price) => ({
      precio: parseMoneyValue(price.precio),
      start: parseAppDate(price.fecha_inicio),
      end: parseAppDate(price.fecha_fin) || null,
    }))
    .filter((price) => price.precio > 0 && price.start)
    .sort((left, right) => left.start - right.start);

  const segment = history.find((price) => (
    appDay >= startOfAppDay(price.start)
    && (!price.end || appDay <= startOfAppDay(price.end))
  ));

  return segment?.precio || fallbackPrice;
}

function calculateMonthlyRoomRentShares(roomTenants = [], monthRange, fallbackRoomPrice) {
  const monthDays = getInclusiveDayCount(monthRange.start, monthRange.end);
  const fallbackPrice = parseMoneyValue(fallbackRoomPrice);
  const shares = new Map();

  if (!monthDays || fallbackPrice <= 0) return shares;

  for (let day = startOfAppDay(monthRange.start); day <= monthRange.end; day = addAppDays(day, 1)) {
    const occupants = roomTenants.filter((tenant) => isTenantOccupyingDay(tenant, day));
    if (!occupants.length) continue;

    const roomPrice = getRoomPriceForDay(roomTenants, day, fallbackPrice);
    const dailyRoomPrice = roomPrice / monthDays;
    const dailyTenantShare = dailyRoomPrice / occupants.length;
    occupants.forEach((tenant) => {
      const key = String(tenant.id_inquilino || '');
      const current = shares.get(key) || {
        tenant,
        amount: 0,
        days: 0,
        sharedDays: 0,
      };
      current.amount += dailyTenantShare;
      current.days += 1;
      if (occupants.length > 1) current.sharedDays += 1;
      shares.set(key, current);
    });
  }

  const minimumDays = Math.min(getMinimumMonthlyDays(), monthDays);
  shares.forEach((share) => {
    if (share.days >= monthDays && share.sharedDays === 0) {
      share.amount = Array.from({ length: monthDays }, (_, index) => addAppDays(monthRange.start, index))
        .reduce((total, day) => total + (getRoomPriceForDay(roomTenants, day, fallbackPrice) / monthDays), 0);
    }

    if (share.days >= minimumDays) return;
    share.billableDays = minimumDays;
    share.amount = Math.max(share.amount, (fallbackPrice / monthDays) * minimumDays);
  });

  return shares;
}

function getAverageRoomPriceForMonth(roomTenants = [], monthRange, fallbackRoomPrice = 0) {
  const monthDays = getInclusiveDayCount(monthRange.start, monthRange.end);
  if (!monthDays) return parseMoneyValue(fallbackRoomPrice);

  const total = Array.from({ length: monthDays }, (_, index) => addAppDays(monthRange.start, index))
    .reduce((sum, day) => sum + getRoomPriceForDay(roomTenants, day, parseMoneyValue(fallbackRoomPrice)), 0);
  return total / monthDays;
}

function formatRentShareDetail(share, monthDays) {
  const safeMonthDays = Number(monthDays || 0);
  const rawBilledDays = Number(share.billableDays || share.days || 0);
  const billedDays = safeMonthDays ? Math.min(rawBilledDays, safeMonthDays) : rawBilledDays;
  const minimumText = share.billableDays && share.billableDays !== share.days && billedDays < safeMonthDays
    ? `, mínimo ${billedDays} días`
    : '';

  if (safeMonthDays && billedDays >= safeMonthDays && !share.sharedDays) {
    return `${share.amount.toFixed(2)} (mes completo)`;
  }

  const base = `${share.amount.toFixed(2)} (${billedDays}/${safeMonthDays || monthDays} días${minimumText})`;
  return share.sharedDays ? `${base}, ${share.sharedDays} compartidos` : base;
}

function formatPaymentProportionalDetail(amount, occupiedDays, monthDays) {
  const safeMonthDays = Number(monthDays || 0);
  const rawOccupiedDays = Number(occupiedDays || 0);
  const billedDays = safeMonthDays
    ? Math.min(rawOccupiedDays || safeMonthDays, safeMonthDays)
    : rawOccupiedDays;

  if (safeMonthDays && billedDays >= safeMonthDays) {
    return `${amount.toFixed(2)} (mes completo)`;
  }

  return `${amount.toFixed(2)} (${billedDays || safeMonthDays}/${safeMonthDays} días)`;
}

function buildMonthlyLedgerRows(tenants = [], payments = [], houses = []) {
  const rows = [];
  const housesById = new Map(houses.map((house) => [String(house.id_vivienda || ''), house]));
  const tenantsById = new Map(tenants.map((tenant) => [String(tenant.id_inquilino || ''), tenant]));

  payments.forEach((payment) => {
    if (isCancelledExpense(payment)) return;
    if (String(payment.tipo || '').toLowerCase() !== 'alquiler') return;
    const monthData = getRowMonthData(payment);
    const amount = parseMoneyValue(payment.importe_asignado);
    if (amount <= 0.009) return;

    const tenant = tenantsById.get(String(payment.id_inquilino || '')) || payment;
    if (!monthData.key) return;
    const monthRange = getMonthRange(monthData.year, monthData.month);
    const monthDays = getInclusiveDayCount(monthRange.start, monthRange.end);
    const houseId = String(tenant.id_vivienda || '');
    const house = housesById.get(houseId) || {};
    const paidAmount = getPaymentSettlementAmount(payment);
    const pendingAmount = Math.max(amount - paidAmount, 0);
    const receiptDate = `${monthData.year}-${String(monthData.month).padStart(2, '0')}-01`;
    const occupiedDays = Number(payment.dias_ocupacion || 0);

    rows.push({
      payment_key: `rent-payment-${payment.id_pago_inquilino || `${payment.id_inquilino}-${payment.id_habitacion_inquilino}-${monthData.key}`}`,
      id_pago_inquilino: payment.id_pago_inquilino || '',
      id_habitacion_inquilino: payment.id_habitacion_inquilino || '',
      tipo_movimiento: 'Mensualidad inquilino',
      gasto_de_value: 'mensualidad',
      id_inquilino: payment.id_inquilino,
      id_vivienda: houseId,
      nombre_inquilino: getTenantDisplayLabel(tenant),
      nombre_vivienda: getHouseDisplayLabel(house, tenant),
      nombre_propietario: '',
      concepto: payment.concepto || `Mensualidad ${String(monthData.month).padStart(2, '0')}/${monthData.year}`,
      mes: monthData.month,
      anio: monthData.year,
      mensualidad: '',
      parte_proporcional: formatPaymentProportionalDetail(amount, occupiedDays, monthDays),
      importe_total: parseMoneyValue(tenant.precio || amount).toFixed(2),
      importe: amount.toFixed(2),
      importe_pagado: paidAmount.toFixed(2),
      importe_pendiente: pendingAmount.toFixed(2),
      payment_history: getPaymentHistoryRows([payment]),
      comentarios: payment.comentarios || '',
      dias_ocupacion: occupiedDays,
      fecha_recibo: receiptDate,
      fecha_pago: getPaymentDateDisplay([payment]),
      fecha: receiptDate,
      estado_pago: getLedgerPaymentStatus(amount, [payment]),
    });
  });

  return rows;
}

function getExpensePaymentMatcher(expenseRow) {
  const concept = String(expenseRow.concepto || expenseRow.tipo || expenseRow.descripcion || '').trim().toLowerCase();
  return (payment) => {
    const paymentType = String(payment.tipo || '').toLowerCase();
    const paymentConcept = String(payment.concepto || '').trim().toLowerCase();
    const sameExpense = expenseRow.expense_id && String(payment.id_gasto || '') === String(expenseRow.expense_id);
    return sameExpense || (paymentType === 'gasto' && concept && paymentConcept.includes(concept));
  };
}

function getExpensePaymentForTenant(expenseRow, tenant, payments = []) {
  const expenseId = String(expenseRow.expense_id || '');
  const tenantId = String(tenant.id_inquilino || '');
  return payments.find((payment) => (
    expenseId
    && tenantId
    && String(payment.id_gasto || '') === expenseId
    && String(payment.id_inquilino || '') === tenantId
    && parseMoneyValue(payment.importe_asignado ?? payment.importe_pagado ?? payment.importe) > 0
  )) || null;
}

function isSingleTenantExpense(expense = {}) {
  return ['inquilino', 'fianza'].includes(String(expense.gasto_de_value || '').toLowerCase());
}

function buildTenantExpenseLedgerRows(expenses = [], tenants = [], payments = []) {
  const tenantsById = new Map(tenants.map((tenant) => [String(tenant.id_inquilino || ''), tenant]));
  const rows = [];

  normalizeTenantExpenseRows(expenses)
    .filter((expense) => !isCancelledExpense(expense))
    .forEach((expense) => {
      const monthData = getRowMonthData(expense);
      if (!monthData.key) return;
      const expenseStart = parseAppDate(expense.fecha_inicio || expense.fecha);
      const expenseEnd = parseAppDate(expense.fecha_fin) || expenseStart;
      if (!expenseStart || !expenseEnd) return;

      const targetEntries = isSingleTenantExpense(expense)
        ? [tenantsById.get(String(expense.id_inquilino || ''))]
          .filter(Boolean)
          .map((tenant) => ({ tenant, days: getTenantOverlapDays(tenant, expenseStart, expenseEnd) || getInclusiveDayCount(expenseStart, expenseEnd) }))
        : getTenantsForHousePeriod(tenants, expense.id_vivienda, expenseStart, expenseEnd);
      if (!targetEntries.length) return;

      const totalAmount = parseMoneyValue(expense.importe ?? expense.importe_total);
      const totalOccupantDays = targetEntries.reduce((total, entry) => total + entry.days, 0);

      targetEntries.forEach(({ tenant, days }) => {
        const generatedPayment = getExpensePaymentForTenant(expense, tenant, payments);
        const fallbackAmount = isSingleTenantExpense(expense)
          ? totalAmount
          : (totalOccupantDays ? totalAmount * (days / totalOccupantDays) : 0);
        const assignedAmount = generatedPayment
          ? parseMoneyValue(generatedPayment.importe_asignado)
          : fallbackAmount;
        const assignedDays = generatedPayment?.dias_ocupacion || days;
        if (assignedAmount <= 0.009) return;
        const monthPayments = getPaymentRowsForTenantMonth(payments, tenant.id_inquilino, monthData);
        const matchingExpensePayments = monthPayments.filter(getExpensePaymentMatcher(expense));
        const expensePayments = matchingExpensePayments.length ? matchingExpensePayments : [generatedPayment].filter(Boolean);
        const paidAmount = expensePayments.reduce((total, payment) => total + getPaymentSettlementAmount(payment), 0);
        const pendingAmount = Math.max(assignedAmount - paidAmount, 0);
        const paymentComments = Array.from(new Set(expensePayments.map((payment) => payment.comentarios).filter(Boolean))).join('\n');

        rows.push({
          payment_key: `expense-${expense.expense_id}-${tenant.id_inquilino}`,
          id_pago_inquilino: generatedPayment?.id_pago_inquilino || '',
          tipo_movimiento: expense.gasto_de_value === 'fianza'
            ? 'Fianza'
            : expense.gasto_de_value === 'inquilino'
            ? 'Gasto inquilino'
            : 'Gasto vivienda repartido',
          id_inquilino: tenant.id_inquilino,
          id_habitacion_inquilino: tenant.id_habitacion_inquilino || '',
          id_vivienda: expense.id_vivienda || tenant.id_vivienda,
          nombre_inquilino: getTenantDisplayLabel(tenant),
          nombre_vivienda: expense.nombre_vivienda || tenant.nombre_vivienda,
          nombre_propietario: '',
          gasto_de_value: expense.gasto_de_value,
          concepto: expense.concepto || expense.tipo || 'Gasto',
          mes: monthData.month,
          anio: monthData.year,
          mensualidad: '',
          parte_proporcional: expense.gasto_de_value === 'vivienda'
            ? `${assignedAmount.toFixed(2)} (${assignedDays} días imputados)`
            : '',
          importe_total: totalAmount.toFixed(2),
          importe: assignedAmount.toFixed(2),
          importe_pagado: paidAmount.toFixed(2),
          importe_pendiente: pendingAmount.toFixed(2),
          payment_history: getPaymentHistoryRows(expensePayments),
          comentarios: paymentComments,
          dias_ocupacion: assignedDays,
          fecha_recibo: expense.fecha || expense.fecha_inicio,
          fecha_pago: getPaymentDateDisplay(expensePayments),
          fecha: expense.fecha || expense.fecha_inicio,
          tipo_pago: 'gasto',
          id_gasto: expense.expense_id,
          estado_pago: getLedgerPaymentStatus(assignedAmount, expensePayments),
        });
      });
    });

  return rows;
}

function getOwnerDisplayLabel(row = {}) {
  return [row.nombre_propietario, row.apellido1_propietario, row.apellido2_propietario]
    .filter(Boolean)
    .join(' ')
    || [row.propietario_nombre, row.propietario_apellido1, row.propietario_apellido2].filter(Boolean).join(' ')
    || row.nombre
    || row.id_propietario
    || '';
}

function buildOwnerExpenseLedgerRows(ownerExpenses = []) {
  return normalizeOwnerExpenseRows(ownerExpenses)
    .filter((expense) => !isCancelledExpense(expense))
    .map((expense) => {
      const amount = parseMoneyValue(expense.importe ?? expense.importe_total);
      return {
        payment_key: `owner-expense-${expense.expense_id}`,
        tipo_movimiento: 'Gasto propietario',
        gasto_de_value: 'propietario',
        id_vivienda: expense.id_vivienda,
        nombre_inquilino: '',
        nombre_vivienda: expense.nombre_vivienda || '',
        nombre_propietario: getOwnerDisplayLabel(expense),
        concepto: expense.concepto || expense.tipo || 'Gasto propietario',
        mensualidad: '',
        parte_proporcional: '',
        importe_total: amount.toFixed(2),
        importe: amount.toFixed(2),
        fecha_recibo: expense.fecha || '',
        fecha_pago: expense.fecha_pago || '',
        fecha: expense.fecha || '',
        estado_pago: isCompletedPaymentStatus(expense.estado) || expense.fecha_pago ? 'completados' : 'pendientes',
      };
    });
}

function uniqueRowsBy(rows = [], getKey) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = getKey(row);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getTenantExpenseUniqueKey(row = {}) {
  if (row.id_gasto) return `tenant-expense-${row.id_gasto}`;
  return [
    'tenant-expense',
    row.id_inquilino || '',
    row.id_vivienda || '',
    row.concepto || row.tipo || row.descripcion || '',
    row.importe_total || row.importe || '',
    row.fecha_inicio || row.fecha || '',
  ].join('|');
}

function applyTenantContextToFinancialExpense(expense = {}, tenant = {}) {
  return {
    ...expense,
    id_vivienda: expense.id_vivienda || tenant.id_vivienda,
    nombre_vivienda: expense.nombre_vivienda || tenant.nombre_vivienda,
  };
}

function getTenantPaymentUniqueKey(row = {}) {
  if (row.id_pago_inquilino) return `tenant-payment-${row.id_pago_inquilino}`;
  return [
    'tenant-payment',
    row.id_inquilino || '',
    row.concepto || '',
    row.importe || row.importe_asignado || row.importe_pagado || '',
    row.mes || '',
    row.anio || '',
    row.fecha_pago || '',
  ].join('|');
}

async function loadPaymentLedgerRows() {
  const tenantPayload = await request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`);
  const tenantAssignments = getRows(tenantPayload);
  const tenants = normalizeTenantRows(tenantAssignments);
  state.tenantAssignmentRows = tenantAssignments;
  const [paymentPayload, expensePayload, ownerExpensePayload, housePayload] = await Promise.all([
    request(`${getResourceEndpoint(resources.payments)}?page=1&limit=500`).catch(() => null),
    request(`${getResourceEndpoint(resources.expenses)}?page=1&limit=500`).catch(() => null),
    request(`${getResourceEndpoint(resources.ownerExpenses)}?page=1&limit=500`).catch(() => null),
    request(`${getResourceEndpoint(resources.houses)}?page=1&limit=500`).catch(() => null),
  ]);
  const payments = uniqueRowsBy(
    getRows(paymentPayload),
    getTenantPaymentUniqueKey
  );
  const expenses = uniqueRowsBy(
    getRows(expensePayload),
    getTenantExpenseUniqueKey
  ).filter((row) => !isTenantDepositExpense(row));
  const ownerExpenses = getRows(ownerExpensePayload);
  const houses = getRows(housePayload);

  return [
    ...buildMonthlyLedgerRows(tenantAssignments, payments, houses),
    ...buildTenantExpenseLedgerRows(expenses, tenantAssignments, payments),
    ...buildOwnerExpenseLedgerRows(ownerExpenses),
  ].sort((left, right) => getExpenseDateTime(left) - getExpenseDateTime(right));
}

function canCancelExpenseRow(resource, row = {}) {
  return isExpenseFilterResource(resource)
    && canMutateRows(resource)
    && row.expense_endpoint
    && row.expense_id
    && !isCancelledExpense(row);
}

function renderSelectOptions(select, placeholder, options, selectedValue) {
  if (!select) return;
  select.innerHTML = `<option value="">${placeholder}</option>${options.map(({ value, label }) => (
    `<option value="${escapeHtml(value)}" ${String(value) === String(selectedValue) ? 'selected' : ''}>${escapeHtml(label)}</option>`
  )).join('')}`;
}

function getExpenseHouseOptionsFromRows(rows = []) {
  const houses = new Map();

  rows.forEach((row) => {
    const houseValue = getExpenseHouseValue(row);
    if (houseValue) houses.set(houseValue, getExpenseHouseLabel(row));
  });

  return Array.from(houses, ([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'es'));
}

async function loadExpenseHouseOptions(expenseRows = []) {
  if (!isFinancialFilterResource(state.activeResource)) return;

  try {
    const payload = await request(`${getResourceEndpoint(resources.houses)}?page=1&limit=200`);
    const houseRows = getRows(payload);
    state.expenseHouseOptions = houseRows.map((house) => ({
      value: String(house.id_vivienda || house.nombre || ''),
      label: String(house.nombre || house.id_vivienda || 'Sin vivienda'),
    })).filter((house) => house.value);
  } catch (error) {
    state.expenseHouseOptions = [];
  }

  if (!state.expenseHouseOptions.length) {
    state.expenseHouseOptions = getExpenseHouseOptionsFromRows(expenseRows);
  }
}

function updateExpenseFilterOptions(rows = state.rows) {
  if (!isFinancialFilterResource(state.activeResource)) return;
  if (!state.expenseHouseOptions.length) {
    state.expenseHouseOptions = getExpenseHouseOptionsFromRows(rows);
  }

  if (expenseTypeFilter) {
    expenseTypeFilter.classList.toggle('hidden', isDepositResource(state.activeResource));
    if ((!isPaymentResource(state.activeResource) || isDepositResource(state.activeResource)) && state.expenseTypeFilter === 'fianza') {
      state.expenseTypeFilter = '';
    }
    const options = isPaymentResource(state.activeResource) && !isDepositResource(state.activeResource)
      ? [
        { value: 'mensualidad', label: 'Mensualidad' },
        { value: 'vivienda', label: 'Vivienda' },
        { value: 'inquilino', label: 'Inquilino' },
        { value: 'fianza', label: 'Fianza' },
        { value: 'propietario', label: 'Propietario' },
      ]
      : [
        { value: 'vivienda', label: 'Vivienda' },
        { value: 'inquilino', label: 'Inquilino' },
        { value: 'propietario', label: 'Propietario' },
      ];
    renderSelectOptions(expenseTypeFilter, 'Gasto de', options, state.expenseTypeFilter);
  }

  renderSelectOptions(
    expenseHouseFilter,
    'Seleccionar vivienda',
    state.expenseHouseOptions,
    state.expenseHouseFilter
  );
  if (expenseStartDateFilter) expenseStartDateFilter.value = state.expenseStartDateFilter;
  if (expenseEndDateFilter) expenseEndDateFilter.value = state.expenseEndDateFilter;
  if (paymentStatusFilter) {
    const showPaymentStatusFilter = isPaymentResource(state.activeResource) || isExpenseFilterResource(state.activeResource);
    paymentStatusFilter.classList.toggle('hidden', !showPaymentStatusFilter);
    paymentStatusFilter.value = showPaymentStatusFilter ? (state.paymentStatusFilter || 'pendientes') : '';
  }
}

function isTenantActive(row) {
  const value = getValue(row, 'activo');
  return value === true || Number(value) === 1 || String(value).toLowerCase() === 'true';
}

function applyTenantSortFilter(rows) {
  const option = state.tenantSortFilter;
  const filteredRows = option === 'inactivos'
    ? rows.filter((row) => !isTenantActive(row))
    : rows.filter(isTenantActive);

  const sortedRows = filteredRows.slice();
  if (option === 'fecha_entrada_asc') sortedRows.sort((a, b) => compareDate(a, b, 'fecha_entrada'));
  if (option === 'fecha_entrada_desc') sortedRows.sort((a, b) => compareDate(b, a, 'fecha_entrada'));
  if (option === 'nombre_asc') sortedRows.sort((a, b) => compareText(a, b, 'nombre'));
  if (option === 'nombre_desc') sortedRows.sort((a, b) => compareText(b, a, 'nombre'));
  if (option === 'apellido_asc') sortedRows.sort((a, b) => compareText(a, b, 'apellido1'));
  if (option === 'apellido_desc') sortedRows.sort((a, b) => compareText(b, a, 'apellido1'));

  return sortedRows;
}

function updateResourceFilters(resource) {
  if (!monthFilter) return;

  monthFilter.classList.add('hidden');
  monthFilter.value = '';
  accountingPeriodFilter?.classList.toggle('hidden', resource !== resources.ownerLiquidations);

  const showExpenseFilters = isFinancialFilterResource(resource) && !isExpenseCreateMode();
  if (isDepositResource(resource)) state.expenseTypeFilter = '';
  expenseFilterBar?.classList.toggle('hidden', !showExpenseFilters);
  if (expenseTypeFilter) {
    expenseTypeFilter.classList.toggle('hidden', isDepositResource(resource));
    expenseTypeFilter.value = showExpenseFilters && !isDepositResource(resource) ? state.expenseTypeFilter : '';
  }
  const showPaymentStatusFilter = showExpenseFilters && (isPaymentResource(resource) || isExpenseFilterResource(resource));
  if (showPaymentStatusFilter && !state.paymentStatusFilter) state.paymentStatusFilter = 'pendientes';
  if (paymentStatusFilter) {
    paymentStatusFilter.classList.toggle('hidden', !showPaymentStatusFilter);
    paymentStatusFilter.value = showPaymentStatusFilter ? state.paymentStatusFilter : '';
  }

  if (!showExpenseFilters) {
    state.expenseTypeFilter = '';
    state.expenseHouseFilter = '';
    state.expenseStartDateFilter = '';
    state.expenseEndDateFilter = '';
    state.paymentStatusFilter = 'pendientes';
  }
}

function renderHouseSectionActions() {
  if (!resourceDocumentActions) return;
  if (state.activeResource !== resources.houses || !canAccessSection('houses')) return;

  const hasActiveHouse = Boolean(state.activeHouseRecordId);
  resourceDocumentActions.classList.remove('hidden');
  resourceDocumentActions.innerHTML = `
    <label class="inline-filter-label">Mostrar
      <select class="month-filter" data-house-status-filter aria-label="Mostrar viviendas">
        <option value="activas" ${state.houseStatusFilter === 'activas' ? 'selected' : ''}>Activas</option>
        <option value="desactivadas" ${state.houseStatusFilter === 'desactivadas' ? 'selected' : ''}>Desactivadas</option>
        <option value="todas" ${state.houseStatusFilter === 'todas' ? 'selected' : ''}>Todas</option>
      </select>
    </label>
    <button class="button small ${state.resourceAction === 'create' ? 'primary' : 'ghost'}" data-action="house-resource-action" data-resource-action="create" type="button">Crear</button>
    <button class="button small ${state.resourceAction === 'update' ? 'primary' : 'ghost'}" data-action="house-resource-action" data-resource-action="update" type="button" ${hasActiveHouse ? '' : 'disabled'}>Modificar</button>
    <button class="button small ${state.resourceAction === 'delete' ? 'primary danger' : 'ghost danger'}" data-action="house-resource-action" data-resource-action="delete" type="button" ${hasActiveHouse ? '' : 'disabled'}>Eliminar</button>`;
}

function renderTenantSectionActions() {
  if (!resourceDocumentActions) return;
  if (isAdminMenuMode() || state.activeResource !== resources.tenants || !canAccessSection('tenants')) return;

  renderOwnerTenantToolbarActions();
}

function renderOwnerTenantToolbarActions() {
  if (!resourceDocumentActions) return;
  const hasActiveTenant = Boolean(state.activeTenantDetailId);
  resourceDocumentActions.dataset.ownerTenantActions = 'true';
  resourceDocumentActions.classList.remove('hidden');
  resourceDocumentActions.innerHTML = `
    <button class="button small ${state.resourceAction === 'create' ? 'primary' : 'ghost'}" data-action="tenant-resource-action" data-resource-action="create" type="button">Crear</button>
    <button class="button small ${state.resourceAction === 'stay' ? 'primary' : 'ghost'}" data-action="tenant-resource-action" data-resource-action="stay" type="button" ${hasActiveTenant ? '' : 'disabled'}>Nueva estancia</button>
    <button class="button small ${state.resourceAction === 'update' ? 'primary' : 'ghost'}" data-action="tenant-resource-action" data-resource-action="update" type="button" ${hasActiveTenant ? '' : 'disabled'}>Modificar</button>
    <button class="button small ${state.resourceAction === 'delete' ? 'primary danger' : 'ghost danger'}" data-action="tenant-resource-action" data-resource-action="delete" type="button" ${hasActiveTenant ? '' : 'disabled'}>Eliminar</button>`;
}

function clearResourceDocumentActions() {
  if (!resourceDocumentActions) return;
  delete resourceDocumentActions.dataset.ownerTenantActions;
  resourceDocumentActions.classList.add('hidden');
  resourceDocumentActions.innerHTML = '';
}

function syncOwnerTenantToolbarActions() {
  updateTenantSortFilterVisibility();
}

function getRoomActionHouseOptions() {
  const houses = state.adminRoomHouseOptions?.length
    ? state.adminRoomHouseOptions
    : state.rows.map((room) => ({
      id_vivienda: room.id_vivienda,
      nombre: room.nombre_vivienda,
    }));
  const uniqueHouses = new Map();
  houses.forEach((house) => {
    const id = String(house.id_vivienda || '');
    if (!id || uniqueHouses.has(id)) return;
    uniqueHouses.set(id, house);
  });
  return Array.from(uniqueHouses.values())
    .sort((left, right) => String(left.nombre || '').localeCompare(String(right.nombre || ''), 'es'));
}

function renderRoomsSectionActions() {
  if (!resourceDocumentActions) return;
  if (state.activeResource !== resources.rooms || !canAccessSection('rooms')) return;

  const houses = getRoomActionHouseOptions();
  const selectedHouseId = String(
    state.roomsSelectedHouseId
    || state.activeHouseDetail?.houseId
    || ''
  );
  const hasSelectedHouse = Boolean(selectedHouseId);
  const hasSelectedRoom = Boolean(state.activeHouseDetail?.selectedRoomId);
  const houseOptions = houses.map((house) => {
    const id = String(house.id_vivienda || '');
    const label = house.nombre || house.direccion || 'Vivienda sin nombre';
    return `<option value="${escapeHtml(id)}" ${id === selectedHouseId ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');

  resourceDocumentActions.classList.remove('hidden');
  resourceDocumentActions.innerHTML = `
    <label class="inline-filter-label">Vivienda
      <select class="month-filter" data-room-house-selector aria-label="Seleccionar vivienda para habitaciones">
        <option value="">Seleccione vivienda</option>
        ${houseOptions}
      </select>
    </label>
    <button class="button small ${state.resourceAction === 'create' ? 'primary' : 'ghost'}" data-action="room-resource-action" data-resource-action="create" type="button" ${hasSelectedHouse ? '' : 'disabled'}>Crear</button>
    <button class="button small ${state.resourceAction === 'update' ? 'primary' : 'ghost'}" data-action="room-resource-action" data-resource-action="update" type="button" ${hasSelectedRoom ? '' : 'disabled'}>Modificar</button>
    <button class="button small ${state.resourceAction === 'delete' ? 'primary danger' : 'ghost danger'}" data-action="room-resource-action" data-resource-action="delete" type="button" ${hasSelectedRoom ? '' : 'disabled'}>Desactivar</button>`;
}

function updateTenantSortFilterVisibility() {
  if (!tenantSortFilter) return;
  const showTenantFilter = !isAdminMenuMode() && state.activeResource === resources.tenants && !isTenantFullFormMode() && !isTenantStayMode();
  tenantSortFilter.classList.toggle('hidden', !showTenantFilter);
  tenantSortFilter.value = showTenantFilter ? state.tenantSortFilter : '';
  if (showTenantFilter) {
    renderOwnerTenantToolbarActions();
  } else if (resourceDocumentActions?.dataset.ownerTenantActions === 'true') {
    clearResourceDocumentActions();
  }
}

function clearDetailPanel() {
  state.activeLiquidationDetailId = null;
  state.activeTenantDetailId = null;
  state.activeHouseRecordId = null;
  state.activeHouseDetail = null;
  if (tableWrap) tableWrap.classList.remove('hidden');
  splitLayout?.classList.toggle('table-full-width', resourceForm?.classList.contains('hidden'));
  if (state.activeResource !== resources.tenants) clearResourceDocumentActions();
  updateTenantSortFilterVisibility();
  if (state.activeResource === resources.tenants) renderTenantSectionActions();
  if (!detailPanel) return;
  detailPanel.classList.add('hidden');
  detailPanel.innerHTML = '';
}

function updateNavigation() {
  const adminMode = isAdminMenuMode();
  mainNav?.classList.toggle('hidden', adminMode);
  adminNav?.classList.toggle('hidden', !adminMode);

  if (adminMode) {
    adminNav?.querySelectorAll('.nav-link').forEach((button) => button.classList.remove('hidden'));
    return;
  }

  adminView?.classList.add('hidden');

  mainNav?.querySelectorAll('.nav-link').forEach((button) => {
    const resource = resources[button.dataset.section];
    button.classList.toggle('hidden', !canAccessSection(button.dataset.section));
    if (resource) button.textContent = getResourceTitle(resource);
  });

  document.querySelectorAll('.nav-group').forEach((group) => {
    const section = group.dataset.navGroup;
    const accessible = canAccessSection(section);
    group.classList.toggle('hidden', !accessible);
    const submenu = group.querySelector(`[data-nav-submenu="${section}"]`);
    const trigger = group.querySelector(`.nav-link[data-section="${section}"]`);
    const collapsed = isNavGroupCollapsed(section);
    if (submenu) {
      submenu.classList.toggle('hidden', !accessible);
      submenu.classList.toggle('collapsed', collapsed);
    }
    if (trigger) trigger.setAttribute('aria-expanded', String(accessible && !collapsed));
  });

  document.querySelectorAll('.nav-sublink').forEach((button) => {
    const section = button.dataset.section;
    const action = button.dataset.resourceAction;
    const hasAction = (resourceMenuActions[section] || []).some((item) => item.action === action);
    button.classList.toggle('hidden', !canAccessSection(section) || !hasAction);
    const activeAction = state.activeSection === STATISTICS_SECTION && !state.resourceAction ? 'bar' : state.resourceAction;
    button.classList.toggle('active', state.activeSection === section && activeAction === action);
  });
}

function renderAdminSection(section = 'dashboard') {
  if (!guardAdminMenuSection(section)) return;

  const key = ADMIN_MENU_SECTIONS[section] ? section : 'dashboard';
  const title = ADMIN_MENU_SECTIONS[key];
  state.activeSection = key;
  state.resourceAction = null;
  adminView?.classList.remove('hidden');
  dashboardView?.classList.add('hidden');
  statisticsView?.classList.add('hidden');
  crudView?.classList.add('hidden');
  configView?.classList.add('hidden');
  if (detailPanel) detailPanel.classList.add('hidden');
  if (resourceForm) resourceForm.classList.add('hidden');
  if (tableWrap) tableWrap.classList.add('hidden');
  if (sectionEyebrow) sectionEyebrow.textContent = 'Menú administrador';
  $('#sectionTitle').textContent = title;
  adminNav?.querySelectorAll('[data-admin-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminSection === key);
  });
  if (adminView) {
    adminView.innerHTML = `<button class="stat-card" type="button">
      <span>Menú administrador</span>
      <strong>${escapeHtml(title)}</strong>
      <small>Placeholder básico de ${escapeHtml(title)}</small>
    </button>`;
  }
}

function renderAdminDashboardCards(cards) {
  if (!adminView) return;
  adminView.innerHTML = cards.map((card) => `<button class="stat-card" type="button">
    <span>${escapeHtml(card.label)}</span>
    <strong>${escapeHtml(card.value)}</strong>
    <small>${escapeHtml(card.hint)}</small>
  </button>`).join('');
}

function getAdminCurrentTenantAssignments(tenants = []) {
  return normalizeTenantRows(tenants).filter((tenant) => !tenant.fecha_salida && tenant.id_habitacion);
}

function getAdminMonthlyExpensesTotal(ownerExpenses = [], tenantExpenses = []) {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const rows = [
    ...normalizeOwnerExpenseRows(ownerExpenses),
    ...normalizeTenantExpenseRows(tenantExpenses).filter((row) => !isTenantDepositExpense(row)),
  ];

  return rows
    .filter((row) => {
      const date = parseAppDate(row.fecha || row.fecha_inicio || row.fecha_fin);
      return date && date.getMonth() === month && date.getFullYear() === year && !isCancelledExpense(row);
    })
    .reduce((total, row) => total + parseMoneyValue(row.importe ?? row.importe_total), 0);
}

async function loadAdminDashboardSection() {
  if (!guardAdminMenuSection('dashboard')) return;

  state.activeSection = 'dashboard';
  state.resourceAction = null;
  state.activeResource = null;
  state.editingId = null;
  adminView?.classList.remove('hidden');
  dashboardView?.classList.add('hidden');
  statisticsView?.classList.add('hidden');
  crudView?.classList.add('hidden');
  configView?.classList.add('hidden');
  detailPanel?.classList.add('hidden');
  resourceForm?.classList.add('hidden');
  tableWrap?.classList.add('hidden');
  if (sectionEyebrow) sectionEyebrow.textContent = 'Menú administrador';
  $('#sectionTitle').textContent = 'Dashboard';
  adminNav?.querySelectorAll('[data-admin-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminSection === 'dashboard');
  });

  renderAdminDashboardCards([
    { label: 'Usuarios', value: '...', hint: 'Total de usuarios' },
    { label: 'Propietarios', value: '...', hint: 'Total de propietarios' },
    { label: 'Inquilinos', value: '...', hint: 'Total de inquilinos' },
    { label: 'Viviendas', value: '...', hint: 'Total de viviendas' },
    { label: 'Habitaciones', value: '...', hint: 'Total de habitaciones' },
    { label: 'Ocupadas', value: '...', hint: 'Habitaciones ocupadas' },
    { label: 'Libres', value: '...', hint: 'Habitaciones libres' },
    { label: 'Pagos pendientes', value: '...', hint: 'Recibos pendientes' },
    { label: 'Gastos del mes', value: '...', hint: 'Gasto mensual registrado' },
  ]);

  const [users, owners, tenants, houses, rooms, payments, ownerExpenses, tenantExpenses] = await Promise.allSettled([
    request(`${getResourceEndpoint(resources.users)}?page=1&limit=500`),
    request(`${getResourceEndpoint(resources.owners)}?page=1&limit=500`),
    request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`),
    request(`${getResourceEndpoint(resources.houses)}?page=1&limit=500`),
    request(`${getResourceEndpoint(resources.rooms)}?page=1&limit=500`),
    loadPaymentLedgerRows(),
    request(`${getResourceEndpoint(resources.ownerExpenses)}?page=1&limit=500`),
    request(`${getResourceEndpoint(resources.expenses)}?page=1&limit=500`),
  ]);

  const userRows = users.status === 'fulfilled' ? getRows(users.value) : null;
  const ownerRows = owners.status === 'fulfilled' ? getRows(owners.value) : null;
  const tenantRows = tenants.status === 'fulfilled' ? getRows(tenants.value) : null;
  const houseRows = houses.status === 'fulfilled' ? getRows(houses.value) : null;
  const roomRows = rooms.status === 'fulfilled' ? getRows(rooms.value) : null;
  const paymentRows = payments.status === 'fulfilled' ? payments.value : null;
  const ownerExpenseRows = ownerExpenses.status === 'fulfilled' ? getRows(ownerExpenses.value) : null;
  const tenantExpenseRows = tenantExpenses.status === 'fulfilled' ? getRows(tenantExpenses.value) : null;
  const occupiedRooms = tenantRows && roomRows
    ? new Set(getAdminCurrentTenantAssignments(tenantRows).map((tenant) => String(tenant.id_habitacion))).size
    : null;
  const freeRooms = roomRows && occupiedRooms !== null ? Math.max(roomRows.length - occupiedRooms, 0) : null;
  const pendingPayments = paymentRows ? paymentRows.filter((row) => getPaymentFilterStatus(row) === 'pendientes').length : null;
  const hasAnyExpenseRows = ownerExpenseRows || tenantExpenseRows;
  const hasAllExpenseRows = ownerExpenseRows && tenantExpenseRows;
  const monthlyExpenses = hasAnyExpenseRows
    ? formatExpenseTotal(getAdminMonthlyExpensesTotal(ownerExpenseRows || [], tenantExpenseRows || []))
    : null;

  renderAdminDashboardCards([
    { label: 'Usuarios', value: userRows ? String(userRows.length) : '-', hint: userRows ? 'Total de usuarios' : 'Dato no disponible' },
    { label: 'Propietarios', value: ownerRows ? String(ownerRows.length) : '-', hint: ownerRows ? 'Total de propietarios' : 'Dato no disponible' },
    { label: 'Inquilinos', value: tenantRows ? String(normalizeTenantRows(tenantRows).length) : '-', hint: tenantRows ? 'Total de inquilinos' : 'Dato no disponible' },
    { label: 'Viviendas', value: houseRows ? String(houseRows.length) : '-', hint: houseRows ? 'Total de viviendas' : 'Dato no disponible' },
    { label: 'Habitaciones', value: roomRows ? String(roomRows.length) : '-', hint: roomRows ? 'Total de habitaciones' : 'Dato no disponible' },
    { label: 'Ocupadas', value: occupiedRooms !== null ? String(occupiedRooms) : '-', hint: occupiedRooms !== null ? 'Habitaciones ocupadas' : 'Dato no disponible' },
    { label: 'Libres', value: freeRooms !== null ? String(freeRooms) : '-', hint: freeRooms !== null ? 'Habitaciones libres' : 'Dato no disponible' },
    { label: 'Pagos pendientes', value: pendingPayments !== null ? String(pendingPayments) : '-', hint: pendingPayments !== null ? 'Recibos pendientes' : 'Dato no disponible' },
    { label: 'Gastos del mes', value: monthlyExpenses || '-', hint: monthlyExpenses ? (hasAllExpenseRows ? 'Gasto mensual registrado' : 'Dato parcial') : 'Dato no disponible' },
  ]);
}

function renderAdminUserFilters() {
  if (!resourceDocumentActions) return;

  resourceDocumentActions.classList.remove('hidden');
  resourceDocumentActions.innerHTML = `
    <input class="month-filter" data-admin-user-filter="q" type="search" placeholder="Buscar usuario" value="${escapeHtml(state.adminUserFilters.q)}" aria-label="Buscar por nombre, apellidos o email">
    <select class="month-filter" data-admin-user-filter="rol" aria-label="Filtrar por rol">
      <option value="">Rol</option>
      ${['admin', 'propietario', 'inquilino'].map((role) => `<option value="${role}" ${state.adminUserFilters.rol === role ? 'selected' : ''}>${role}</option>`).join('')}
    </select>
    <select class="month-filter" data-admin-user-filter="activo" aria-label="Filtrar por estado">
      <option value="1" ${state.adminUserFilters.activo === '1' ? 'selected' : ''}>Activo</option>
      <option value="0" ${state.adminUserFilters.activo === '0' ? 'selected' : ''}>Inactivo</option>
    </select>`;
}

function renderAdminUsersTable() {
  const columns = ['ID', 'Nombre', 'Apellido 1', 'Apellido 2', 'Email', 'Teléfono', 'Rol', 'Activo', 'Acciones'];

  tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
  tableBody.innerHTML = state.rows.map((row) => {
    const id = getValue(row, 'id_usuario');
    const isActive = Number(getValue(row, 'activo')) === 1 || getValue(row, 'activo') === true;
    return `<tr>
    <td>${escapeHtml(getValue(row, 'id_usuario') ?? '')}</td>
    <td>${escapeHtml(getValue(row, 'nombre') ?? '')}</td>
    <td>${escapeHtml(getValue(row, 'apellido1') ?? '')}</td>
    <td>${escapeHtml(getValue(row, 'apellido2') ?? '')}</td>
    <td>${escapeHtml(getValue(row, 'email') ?? '')}</td>
    <td>${escapeHtml(getValue(row, 'telefono') ?? '')}</td>
    <td>${escapeHtml(getValue(row, 'rol') ?? '')}</td>
    <td>${escapeHtml(formatDisplayValue('activo', getValue(row, 'activo')) ?? '')}</td>
    <td>
      <div class="row-actions">
        <button class="button small ghost" data-action="view-admin-user" data-id="${escapeHtml(id)}" type="button">Ver</button>
        <button class="button small ghost" data-action="edit" data-id="${escapeHtml(id)}" type="button">Editar</button>
        <button class="button small ghost" data-action="toggle-admin-user-active" data-id="${escapeHtml(id)}" data-active="${isActive ? '0' : '1'}" type="button">${isActive ? 'Desactivar' : 'Activar'}</button>
      </div>
    </td>
  </tr>`;
  }).join('');

  if (!state.rows.length) {
    tableBody.innerHTML = `<tr><td class="empty" colspan="${columns.length}">No hay usuarios para mostrar.</td></tr>`;
  }
}

async function fetchAdminUsers() {
  const resource = resources.users;
  const params = new URLSearchParams({ page: '1', limit: '100' });
  const { q, rol, activo } = state.adminUserFilters;
  if (q) params.set('q', q);
  if (rol) params.set('rol', rol);
  if (activo) params.set('activo', activo);

  tableBody.innerHTML = '<tr><td class="empty" colspan="9">Cargando usuarios...</td></tr>';
  detailPanel?.classList.add('hidden');
  const payload = await request(`${getResourceEndpoint(resource)}?${params.toString()}`);
  state.rows = getRows(payload);
  renderAdminUsersTable();
}

async function openAdminUserDetail(id) {
  if (!detailPanel) return;
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = '<p class="detail-loading">Cargando usuario...</p>';
  const row = await request(`/api/user/${id}`);
  if (!row) return;

  detailPanel.innerHTML = `<div class="detail-header">
    <div>
      <p class="eyebrow">Usuario #${escapeHtml(getValue(row, 'id_usuario') || '-')}</p>
      <h3>${escapeHtml([getValue(row, 'nombre'), getValue(row, 'apellido1'), getValue(row, 'apellido2')].filter(Boolean).join(' ') || 'Usuario')}</h3>
    </div>
    <button class="detail-close-button" data-action="close-detail" type="button" aria-label="Cerrar">&times;</button>
  </div>
  ${renderDetailTable('Datos principales', [row], [
    ['email', 'Email'],
    ['telefono', 'Teléfono'],
    ['rol', 'Rol'],
    ['activo', 'Activo'],
    ['created_at', 'Creado'],
    ['updated_at', 'Actualizado'],
  ])}`;
}

async function toggleAdminUserActive(id, active) {
  const action = String(active) === '1' ? 'activar' : 'desactivar';
  const confirmed = window.confirm(`¿Seguro que quieres ${action} este usuario?`);
  if (!confirmed) return;

  await request(`/api/user/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ activo: Number(active) }),
  });
  showToast(String(active) === '1' ? 'Usuario activado' : 'Usuario desactivado');
  await fetchAdminUsers();
}

async function loadAdminUsersSection() {
  if (!guardAdminMenuSection('users')) return;

  const resource = resources.users;
  state.activeSection = 'users';
  state.resourceAction = null;
  state.activeResource = resource;
  state.editingId = null;
  state.roomFormLocked = false;
  adminView?.classList.add('hidden');
  dashboardView?.classList.add('hidden');
  statisticsView?.classList.add('hidden');
  crudView?.classList.remove('hidden');
  configView?.classList.add('hidden');
  detailPanel?.classList.add('hidden');
  resourceForm?.classList.add('hidden');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  updateResourceFilters(resource);
  updateTenantSortFilterVisibility();

  if (searchInput) searchInput.classList.add('hidden');
  const newButton = $('#newButton');
  newButton?.classList.remove('hidden');
  if (sectionEyebrow) sectionEyebrow.textContent = 'Menú administrador';
  $('#sectionTitle').textContent = 'Usuarios';
  $('#resourceTitle').textContent = getResourceTitle(resource);
  $('#resourceHint').textContent = getResourceHint(resource);
  adminNav?.querySelectorAll('[data-admin-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminSection === 'users');
  });

  renderAdminUserFilters();
  tableHead.innerHTML = '<tr><th>ID</th><th>Nombre</th><th>Apellido 1</th><th>Apellido 2</th><th>Email</th><th>Teléfono</th><th>Rol</th><th>Activo</th><th>Acciones</th></tr>';
  tableBody.innerHTML = '<tr><td class="empty" colspan="9">Cargando usuarios...</td></tr>';

  try {
    await fetchAdminUsers();
  } catch (error) {
    state.rows = [];
    tableBody.innerHTML = '<tr><td class="empty" colspan="9">No se pudieron cargar los usuarios. Revisa la conexión o tu sesión de administrador.</td></tr>';
    showToast(error.message || 'No se pudieron cargar los usuarios', 'error');
  }
}

function getOwnerHousesLabel(owner, ownerHouseRows = []) {
  const ownerId = String(owner.id_propietario || '');
  const houseNames = ownerHouseRows
    .filter((row) => String(row.id_propietario || '') === ownerId)
    .map((row) => row.nombre_vivienda || row.id_vivienda)
    .filter(Boolean);

  return houseNames.length ? houseNames.join(', ') : '-';
}

function getOwnerHouseRows(owner, ownerHouseRows = state.adminOwnerHouseRows) {
  const ownerId = String(owner?.id_propietario || owner || '');
  if (!ownerId) return [];
  return ownerHouseRows.filter((row) => String(row.id_propietario || '') === ownerId);
}

function getOwnerFullName(owner) {
  return [getValue(owner, 'nombre'), getValue(owner, 'apellido1'), getValue(owner, 'apellido2')]
    .filter(Boolean)
    .join(' ');
}

function renderAdminOwnerFilters() {
  if (!resourceDocumentActions) return;

  resourceDocumentActions.classList.remove('hidden');
  resourceDocumentActions.innerHTML = `
    <input class="month-filter" data-admin-owner-filter="q" type="search" placeholder="Buscar propietario" value="${escapeHtml(state.adminOwnerFilters.q)}" aria-label="Buscar por nombre, apellidos, email o teléfono">
    <select class="month-filter" data-admin-owner-filter="activo" aria-label="Filtrar por estado">
      <option value="1" ${state.adminOwnerFilters.activo === '1' ? 'selected' : ''}>Activo</option>
      <option value="0" ${state.adminOwnerFilters.activo === '0' ? 'selected' : ''}>Inactivo</option>
    </select>`;
}

function renderAdminOwnersTable(ownerHouseRows = []) {
  const columns = ['Nombre', 'Apellido 1', 'Apellido 2', 'Email', 'Teléfono', 'Activo', 'Viviendas', 'Acciones'];

  tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
  tableBody.innerHTML = state.rows.map((row) => {
    const idOwner = getValue(row, 'id_propietario');
    const idUser = getValue(row, 'id_usuario');
    const isActive = Number(getValue(row, 'activo')) === 1 || getValue(row, 'activo') === true;
    const associatedCount = getValue(row, 'viviendas_asociadas') ?? getOwnerHouseRows(row, ownerHouseRows).length;
    return `<tr>
    <td>${escapeHtml(getValue(row, 'nombre') ?? '')}</td>
    <td>${escapeHtml(getValue(row, 'apellido1') ?? '')}</td>
    <td>${escapeHtml(getValue(row, 'apellido2') ?? '')}</td>
    <td>${escapeHtml(getValue(row, 'email') ?? '')}</td>
    <td>${escapeHtml(getValue(row, 'telefono') ?? '')}</td>
    <td>${escapeHtml(formatDisplayValue('activo', getValue(row, 'activo')) ?? '')}</td>
    <td>${escapeHtml(associatedCount)}</td>
    <td>
      <div class="row-actions">
        <button class="button small ghost" data-action="view-admin-owner" data-id="${escapeHtml(idOwner)}" type="button">Ver</button>
        <button class="button small ghost" data-action="edit" data-id="${escapeHtml(idOwner)}" type="button">Editar</button>
        <button class="button small ghost" data-action="toggle-admin-owner-active" data-id="${escapeHtml(idUser)}" data-active="${isActive ? '0' : '1'}" type="button">${isActive ? 'Desactivar' : 'Activar'}</button>
      </div>
    </td>
  </tr>`;
  }).join('');

  if (!state.rows.length) {
    tableBody.innerHTML = `<tr><td class="empty" colspan="${columns.length}">No hay propietarios para mostrar.</td></tr>`;
  }
}

async function fetchAdminOwners() {
  const resource = resources.owners;
  const params = new URLSearchParams({ page: '1', limit: '100' });
  const { q, activo } = state.adminOwnerFilters;
  if (q) params.set('q', q);
  if (activo) params.set('activo', activo);

  tableBody.innerHTML = '<tr><td class="empty" colspan="8">Cargando propietarios...</td></tr>';
  detailPanel?.classList.add('hidden');

  const [ownersResult, ownerHousesResult] = await Promise.allSettled([
    request(`${getResourceEndpoint(resource)}?${params.toString()}`),
    request('/api/owner-house?page=1&limit=500'),
  ]);

  if (ownersResult.status !== 'fulfilled') {
    throw ownersResult.reason;
  }

  state.rows = getRows(ownersResult.value);
  state.adminOwnerHouseRows = ownerHousesResult.status === 'fulfilled' ? getRows(ownerHousesResult.value) : [];
  renderAdminOwnersTable(state.adminOwnerHouseRows);
}

async function loadAdminOwnerHouseOptions() {
  const payload = await request('/api/house?page=1&limit=500');
  state.adminOwnerHouseOptions = getRows(payload);
  return state.adminOwnerHouseOptions;
}

function renderAdminOwnerForm(owner = {}) {
  const editing = Boolean(state.editingId);
  const houses = state.adminOwnerHouseOptions || [];
  const associatedHouseIds = new Set(getOwnerHouseRows(owner).map((row) => String(row.id_vivienda || '')));
  const houseOptions = houses
    .filter((house) => !editing || !associatedHouseIds.has(String(house.id_vivienda || '')))
    .map((house) => {
      const label = [house.nombre, house.direccion, house.localidad].filter(Boolean).join(' · ') || 'Vivienda sin nombre';
      return `<option value="${escapeHtml(house.id_vivienda)}">${escapeHtml(label)}</option>`;
    })
    .join('');

  resourceForm.classList.remove('hidden');
  resourceForm.classList.remove('house-create-form', 'expense-create-form');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  detailPanel?.classList.add('hidden');

  resourceForm.innerHTML = `<h3>${editing ? 'Editar propietario' : 'Nuevo propietario'}</h3>
    <label>Nombre<input name="nombre" type="text" value="${escapeHtml(getValue(owner, 'nombre') || '')}" required></label>
    <label>Apellido 1<input name="apellido1" type="text" value="${escapeHtml(getValue(owner, 'apellido1') || '')}" required></label>
    <label>Apellido 2<input name="apellido2" type="text" value="${escapeHtml(getValue(owner, 'apellido2') || '')}"></label>
    <label>Email<input name="email" type="email" value="${escapeHtml(getValue(owner, 'email') || '')}" required></label>
    <label>Password<input name="password" type="password" ${editing ? '' : 'required'}></label>
    <label>Teléfono<input name="telefono" type="tel" value="${escapeHtml(getValue(owner, 'telefono') || '')}"></label>
    <label>Activo<select name="activo">
      <option value="1" ${String(getValue(owner, 'activo') ?? '1') === '1' ? 'selected' : ''}>1</option>
      <option value="0" ${String(getValue(owner, 'activo')) === '0' ? 'selected' : ''}>0</option>
    </select></label>
    <label>Empresa<input name="nombre_empres" type="text" value="${escapeHtml(getValue(owner, 'nombre_empres') || '')}"></label>
    <label>CIF<input name="cif" type="text" value="${escapeHtml(getValue(owner, 'cif') || '')}"></label>
    <label>IBAN<input name="iban" type="text" value="${escapeHtml(getValue(owner, 'iban') || '')}"></label>
    <label>Observaciones<textarea name="observaciones">${escapeHtml(getValue(owner, 'observaciones') || '')}</textarea></label>
    <label>Asociar vivienda existente<select name="id_vivienda">
      <option value="">Sin nueva asociación</option>
      ${houseOptions}
    </select></label>
    <label>Porcentaje propiedad<input name="porcentaje_propiedad" type="number" step="any" min="0.01" max="100" value="100"></label>
    <div class="form-actions">
      <button class="button primary" type="submit">${editing ? 'Guardar' : 'Crear'}</button>
      <button class="button ghost" id="cancelEditButton" type="button">Limpiar</button>
    </div>`;
}

async function openAdminOwnerForm(owner = null) {
  await loadAdminOwnerHouseOptions();
  state.editingId = owner ? getValue(owner, 'id_propietario') : null;
  state.resourceAction = owner ? 'update' : 'create';
  renderAdminOwnerForm(owner || {});
}

async function openAdminOwnerDetail(id) {
  if (!detailPanel) return;
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = '<p class="detail-loading">Cargando propietario...</p>';
  const owner = await request(`/api/owner/${id}`);
  const ownerHouses = getOwnerHouseRows(owner, state.adminOwnerHouseRows);

  detailPanel.innerHTML = `<div class="detail-header">
    <div>
      <p class="eyebrow">Propietario</p>
      <h3>${escapeHtml(getOwnerFullName(owner) || 'Propietario')}</h3>
    </div>
    <button class="detail-close-button" data-action="close-detail" type="button" aria-label="Cerrar">&times;</button>
  </div>
  ${renderDetailTable('Datos principales', [owner], [
    ['id_usuario', 'ID usuario'],
    ['email', 'Email'],
    ['telefono', 'Teléfono'],
    ['activo', 'Activo'],
    ['nombre_empres', 'Empresa'],
    ['cif', 'CIF'],
    ['iban', 'IBAN'],
  ])}
  ${renderDetailTable('Viviendas asociadas', ownerHouses, [
    ['nombre_vivienda', 'Vivienda'],
    ['direccion', 'Dirección'],
    ['localidad', 'Ciudad'],
    ['provincia', 'Provincia'],
    ['porcentaje_propiedad', 'Porcentaje'],
  ])}`;
}

async function toggleAdminOwnerActive(idUser, active) {
  const action = String(active) === '1' ? 'activar' : 'desactivar';
  const confirmed = window.confirm(`¿Seguro que quieres ${action} este propietario?`);
  if (!confirmed) return;

  await request(`/api/user/${idUser}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ activo: Number(active) }),
  });
  showToast(String(active) === '1' ? 'Propietario activado' : 'Propietario desactivado');
  await fetchAdminOwners();
}

async function submitAdminOwnerForm() {
  if (!resourceForm.checkValidity()) return;
  const data = Object.fromEntries(new FormData(resourceForm).entries());
  const ownerFields = ['nombre_empres', 'cif', 'iban', 'observaciones'];
  const ownerPayload = {};
  ownerFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) ownerPayload[field] = data[field];
  });

  let idOwner = state.editingId;
  if (state.editingId) {
    const owner = state.rows.find((row) => String(row.id_propietario) === String(state.editingId));
    if (!owner?.id_usuario) throw new Error('No se ha podido encontrar el usuario del propietario');
    const userPayload = {
      nombre: data.nombre,
      apellido1: data.apellido1,
      apellido2: data.apellido2 || '',
      email: data.email,
      telefono: data.telefono || '',
      rol: 'propietario',
      activo: data.activo,
    };
    if (data.password) userPayload.password = data.password;
    await request(`/api/user/${owner.id_usuario}`, {
      method: 'PUT',
      body: JSON.stringify(userPayload),
    });
    if (Object.keys(ownerPayload).length) {
      await request(`/api/owner/${state.editingId}`, {
        method: 'PUT',
        body: JSON.stringify(ownerPayload),
      });
    }
  } else {
    const userResult = await request('/api/user', {
      method: 'POST',
      body: JSON.stringify({
        nombre: data.nombre,
        apellido1: data.apellido1,
        apellido2: data.apellido2 || '',
        email: data.email,
        password: data.password,
        telefono: data.telefono || '',
        rol: 'propietario',
      }),
    });
    const createdUserId = userResult?.user?.id_usuario;
    if (!createdUserId) throw new Error('No se ha podido crear el usuario propietario');
    if (data.activo === '0') {
      await request(`/api/user/${createdUserId}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: 0 }),
      });
    }
    const ownerResult = await request('/api/owner', {
      method: 'POST',
      body: JSON.stringify({
        id_usuario: createdUserId,
        ...ownerPayload,
      }),
    });
    idOwner = ownerResult?.owner?.id_propietario;
  }

  if (data.id_vivienda) {
    if (!idOwner) throw new Error('No se ha podido asociar la vivienda porque falta el propietario');
    await request('/api/owner-house', {
      method: 'POST',
      body: JSON.stringify({
        id_propietario: idOwner,
        id_vivienda: data.id_vivienda,
        porcentaje_propiedad: data.porcentaje_propiedad || 100,
      }),
    });
  }

  showToast(state.editingId ? 'Propietario actualizado' : 'Propietario creado');
  state.editingId = null;
  state.resourceAction = null;
  resourceForm?.classList.add('hidden');
  await fetchAdminOwners();
}

async function loadAdminOwnersSection() {
  if (!guardAdminMenuSection('owners')) return;

  const resource = resources.owners;
  state.activeSection = 'owners';
  state.resourceAction = null;
  state.activeResource = resource;
  state.editingId = null;
  adminView?.classList.add('hidden');
  dashboardView?.classList.add('hidden');
  statisticsView?.classList.add('hidden');
  crudView?.classList.remove('hidden');
  configView?.classList.add('hidden');
  detailPanel?.classList.add('hidden');
  resourceForm?.classList.add('hidden');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  resourceDocumentActions?.classList.add('hidden');
  updateResourceFilters(resource);
  updateTenantSortFilterVisibility();

  if (searchInput) searchInput.classList.add('hidden');
  const newButton = $('#newButton');
  newButton?.classList.remove('hidden');
  if (sectionEyebrow) sectionEyebrow.textContent = 'Menú administrador';
  $('#sectionTitle').textContent = 'Propietarios';
  $('#resourceTitle').textContent = getResourceTitle(resource);
  $('#resourceHint').textContent = getResourceHint(resource);
  adminNav?.querySelectorAll('[data-admin-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminSection === 'owners');
  });

  renderAdminOwnerFilters();
  tableHead.innerHTML = '<tr><th>Nombre</th><th>Apellido 1</th><th>Apellido 2</th><th>Email</th><th>Teléfono</th><th>Activo</th><th>Viviendas</th><th>Acciones</th></tr>';
  tableBody.innerHTML = '<tr><td class="empty" colspan="8">Cargando propietarios...</td></tr>';

  try {
    await fetchAdminOwners();
  } catch (error) {
    state.rows = [];
    state.adminOwnerHouseRows = [];
    tableBody.innerHTML = '<tr><td class="empty" colspan="8">No se pudieron cargar los propietarios. Revisa la conexión o tu sesión de administrador.</td></tr>';
    showToast(error.message || 'No se pudieron cargar los propietarios', 'error');
  }
}

function getAdminTenantStatus(row) {
  if (Number(getValue(row, 'activo')) === 0 || getValue(row, 'activo') === false) return 'Inactivo';
  if (row.fecha_salida) return 'Inactivo';
  if (row.id_habitacion || row.nombre_habitacion || row.nombre_vivienda) return 'Activo';
  return 'No disponible';
}

function renderAdminTenantFilters() {
  if (!resourceDocumentActions) return;

  const houseOptions = (state.adminTenantHouseOptions || [])
    .map((house) => {
      const label = house.nombre || house.direccion || 'Vivienda sin nombre';
      return `<option value="${escapeHtml(house.id_vivienda)}" ${String(state.adminTenantFilters.id_vivienda) === String(house.id_vivienda) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');
  const roomOptions = (state.adminTenantRoomOptions || [])
    .filter((room) => !state.adminTenantFilters.id_vivienda || String(room.id_vivienda) === String(state.adminTenantFilters.id_vivienda))
    .map((room) => {
      const label = [room.nombre_vivienda, room.nombre, room.tipo].filter(Boolean).join(' · ') || 'Habitación sin nombre';
      return `<option value="${escapeHtml(room.id_habitacion)}" ${String(state.adminTenantFilters.id_habitacion) === String(room.id_habitacion) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');

  resourceDocumentActions.classList.remove('hidden');
  resourceDocumentActions.innerHTML = `
    <input class="month-filter" data-admin-tenant-filter="q" type="search" placeholder="Buscar inquilino" value="${escapeHtml(state.adminTenantFilters.q)}" aria-label="Buscar por nombre, apellidos, email, documento o nacionalidad">
    <select class="month-filter" data-admin-tenant-filter="id_vivienda" aria-label="Filtrar por vivienda">
      <option value="">Vivienda</option>
      ${houseOptions}
    </select>
    <select class="month-filter" data-admin-tenant-filter="id_habitacion" aria-label="Filtrar por habitación">
      <option value="">Habitación</option>
      ${roomOptions}
    </select>
    <select class="month-filter" data-admin-tenant-filter="activo" aria-label="Filtrar por estado">
      <option value="1" ${state.adminTenantFilters.activo === '1' ? 'selected' : ''}>Activo</option>
      <option value="0" ${state.adminTenantFilters.activo === '0' ? 'selected' : ''}>Inactivo</option>
      <option value="" ${state.adminTenantFilters.activo === '' ? 'selected' : ''}>Todos</option>
    </select>`;
}

function renderAdminTenantsTable() {
  const columns = [
    'Nombre',
    'Apellido 1',
    'Apellido 2',
    'Email',
    'Teléfono',
    'Nacionalidad',
    'Tipo de identificación',
    'Número de documento',
    'Vivienda actual',
    'Habitación actual',
    'Fecha entrada',
    'Fecha salida',
    'Estado actual',
    'Acciones',
  ];

  tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
  tableBody.innerHTML = state.rows.map((row) => {
    const id = getValue(row, 'id_inquilino');
    const userId = getValue(row, 'id_usuario');
    const isActive = Number(getValue(row, 'activo')) === 1 || getValue(row, 'activo') === true;
    return `<tr>
    <td>${escapeHtml(getValue(row, 'nombre') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'apellido1') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'apellido2') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'email') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'telefono') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'nacionalidad') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'identificacion') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'numero_documento') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'nombre_vivienda') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'nombre_habitacion') || '-')}</td>
    <td>${escapeHtml(formatDisplayValue('fecha_entrada', getValue(row, 'fecha_entrada')) || '-')}</td>
    <td>${escapeHtml(formatDisplayValue('fecha_salida', getValue(row, 'fecha_salida')) || '-')}</td>
    <td>${escapeHtml(getAdminTenantStatus(row))}</td>
    <td>
      <div class="row-actions">
        <button class="button small ghost" data-action="view-admin-tenant" data-id="${escapeHtml(id)}" type="button">Ver</button>
        <button class="button small ghost" data-action="edit" data-id="${escapeHtml(id)}" type="button">Editar</button>
        <button class="button small ghost" data-action="toggle-admin-tenant-active" data-id="${escapeHtml(userId)}" data-active="${isActive ? '0' : '1'}" type="button">${isActive ? 'Desactivar' : 'Activar'}</button>
      </div>
    </td>
  </tr>`;
  }).join('');

  if (!state.rows.length) {
    tableBody.innerHTML = `<tr><td class="empty" colspan="${columns.length}">No hay inquilinos para mostrar.</td></tr>`;
  }
}

async function loadAdminTenantOptions() {
  const [housesResult, roomsResult] = await Promise.allSettled([
    request('/api/house?page=1&limit=500&activa=1'),
    request('/api/room?page=1&limit=500&activa=1'),
  ]);
  state.adminTenantHouseOptions = housesResult.status === 'fulfilled' ? getRows(housesResult.value) : [];
  state.adminTenantRoomOptions = roomsResult.status === 'fulfilled' ? getRows(roomsResult.value) : [];
  renderAdminTenantFilters();
}

async function fetchAdminTenants() {
  const resource = resources.tenants;
  const params = new URLSearchParams({ page: '1', limit: '100' });
  const { q, id_vivienda, id_habitacion, activo } = state.adminTenantFilters;
  if (q) params.set('q', q);
  if (id_vivienda) params.set('id_vivienda', id_vivienda);
  if (id_habitacion) params.set('id_habitacion', id_habitacion);
  if (activo !== '') params.set('activo', activo);

  tableBody.innerHTML = '<tr><td class="empty" colspan="15">Cargando inquilinos...</td></tr>';
  detailPanel?.classList.add('hidden');
  const payload = await request(`${getResourceEndpoint(resource)}?${params.toString()}`);
  state.rows = normalizeTenantRows(getRows(payload));
  renderAdminTenantsTable();
}

function getAdminTenantRoomOptions(selectedHouseId = '') {
  return (state.adminTenantRoomOptions || [])
    .filter((room) => !selectedHouseId || String(room.id_vivienda) === String(selectedHouseId))
    .map((room) => {
      const label = [room.nombre_vivienda, room.nombre, room.tipo, `${formatMoney(room.precio)} €`].filter(Boolean).join(' · ');
      return `<option value="${escapeHtml(room.id_habitacion)}" data-house-id="${escapeHtml(room.id_vivienda || '')}">${escapeHtml(label || 'Habitación sin nombre')}</option>`;
    })
    .join('');
}

function renderAdminTenantForm(tenant = {}) {
  const editing = Boolean(state.editingId);
  const selectedHouseId = String(getValue(tenant, 'id_vivienda') || '');
  const selectedRoomId = String(getValue(tenant, 'id_habitacion') || '');
  const houseOptions = (state.adminTenantHouseOptions || [])
    .map((house) => {
      const label = house.nombre || house.direccion || 'Vivienda sin nombre';
      return `<option value="${escapeHtml(house.id_vivienda)}" ${selectedHouseId === String(house.id_vivienda) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');

  resourceForm.classList.remove('hidden');
  resourceForm.classList.remove('house-create-form', 'expense-create-form');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  detailPanel?.classList.add('hidden');

  resourceForm.innerHTML = `<h3>${editing ? 'Editar inquilino' : 'Nuevo inquilino'}</h3>
    <label>Nombre<input name="nombre" type="text" value="${escapeHtml(getValue(tenant, 'nombre') || '')}" required></label>
    <label>Apellido 1<input name="apellido1" type="text" value="${escapeHtml(getValue(tenant, 'apellido1') || '')}" required></label>
    <label>Apellido 2<input name="apellido2" type="text" value="${escapeHtml(getValue(tenant, 'apellido2') || '')}"></label>
    <label>Email<input name="email" type="email" value="${escapeHtml(getValue(tenant, 'email') || '')}" required></label>
    <label>Password<input name="password" type="password" minlength="8" maxlength="16" ${editing ? '' : 'required'}></label>
    <label>Teléfono<input name="telefono" type="tel" value="${escapeHtml(getValue(tenant, 'telefono') || '')}"></label>
    <label>Nacionalidad<input name="nacionalidad" type="text" value="${escapeHtml(getValue(tenant, 'nacionalidad') || '')}"></label>
    <label>Identificación<select name="identificacion" required>
      <option value="">Selecciona</option>
      ${['dni', 'nie', 'pasaporte'].map((type) => `<option value="${type}" ${getValue(tenant, 'identificacion') === type ? 'selected' : ''}>${type}</option>`).join('')}
    </select></label>
    <label>Número documento<input name="numero_documento" type="text" value="${escapeHtml(getValue(tenant, 'numero_documento') || '')}" required></label>
    <label>Comentario<textarea name="comentario">${escapeHtml(getValue(tenant, 'comentario') || '')}</textarea></label>
    <label>Vivienda<select name="id_vivienda_asignacion" data-admin-tenant-house-select ${editing ? 'disabled' : ''}>
      <option value="">Sin asignar</option>
      ${houseOptions}
    </select></label>
    <label>Habitación<select name="id_habitacion" ${editing ? 'disabled' : ''}>
      <option value="">Sin asignar</option>
      ${getAdminTenantRoomOptions(selectedHouseId)}
    </select></label>
    <label>Fecha entrada<input name="fecha_entrada" type="date" value="${escapeHtml(dateToInputValue(getValue(tenant, 'fecha_entrada')))}" ${editing ? 'disabled' : ''}></label>
    <label>Fecha salida<input name="fecha_salida" type="date" value="${escapeHtml(dateToInputValue(getValue(tenant, 'fecha_salida')))}" ${editing ? 'disabled' : ''}></label>
    <label>Documento<input name="documento" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"></label>
    <div class="form-actions">
      <button class="button primary" type="submit">${editing ? 'Guardar' : 'Crear'}</button>
      <button class="button ghost" id="cancelEditButton" type="button">Limpiar</button>
    </div>`;

  const roomSelect = resourceForm.querySelector('select[name="id_habitacion"]');
  if (roomSelect && selectedRoomId) roomSelect.value = selectedRoomId;
}

async function openAdminTenantForm(tenant = null) {
  await loadAdminTenantOptions();
  state.editingId = tenant ? getValue(tenant, 'id_inquilino') : null;
  state.resourceAction = tenant ? 'update' : 'create';
  renderAdminTenantForm(tenant || {});
}

async function openAdminTenantDetail(id) {
  if (!detailPanel) return;
  state.activeTenantDetailId = id;
  if (state.activeResource === resources.tenants && !isAdminMenuMode()) {
    renderTable();
    renderTenantSectionActions();
  }
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = '<p class="detail-loading">Cargando inquilino...</p>';
  const tenant = await request(`/api/tenant/${id}`);
  const hasDocument = Boolean(tenant.documento_archivo);

  detailPanel.innerHTML = `<div class="detail-header">
    <div>
      <p class="eyebrow">Inquilino</p>
      <h3>${escapeHtml([tenant.nombre, tenant.apellido1, tenant.apellido2].filter(Boolean).join(' ') || 'Inquilino')}</h3>
    </div>
    <button class="detail-close-button" data-action="close-detail" type="button" aria-label="Cerrar">&times;</button>
  </div>
  ${renderDetailTable('Datos personales', [tenant], [
    ['email', 'Email'],
    ['telefono', 'Teléfono'],
    ['activo', 'Activo'],
    ['nacionalidad', 'Nacionalidad'],
    ['identificacion', 'Identificación'],
    ['numero_documento', 'Documento'],
  ])}
  ${renderDetailTable('Estancia actual', [tenant], [
    ['nombre_vivienda', 'Vivienda'],
    ['nombre_habitacion', 'Habitación'],
    ['fecha_entrada', 'Fecha entrada'],
    ['fecha_salida', 'Fecha salida'],
  ])}
  <section class="detail-block">
    <h4>Documento</h4>
    ${hasDocument ? `<button class="button ghost" data-action="preview-tenant-document" data-id="${escapeHtml(id)}" type="button">Ver documento</button>` : '<p class="empty">Sin documento asociado.</p>'}
  </section>`;
}

async function openTenantDetail(rowOrEvent) {
  const id = rowOrEvent?.dataset?.id || rowOrEvent?.id || rowOrEvent;
  if (!id) return;
  await openAdminTenantDetail(id);
}

async function toggleAdminTenantActive(idUser, active) {
  const action = String(active) === '1' ? 'activar' : 'desactivar';
  const confirmed = window.confirm(`¿Seguro que quieres ${action} este inquilino?`);
  if (!confirmed) return;

  await request(`/api/user/${idUser}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ activo: Number(active) }),
  });
  showToast(String(active) === '1' ? 'Inquilino activado' : 'Inquilino desactivado');
  await fetchAdminTenants();
}

async function submitAdminTenantForm() {
  if (!resourceForm.checkValidity()) return;
  const data = new FormData(resourceForm);
  const editing = Boolean(state.editingId);

  if (!editing) {
    ['fecha_entrada', 'fecha_salida'].forEach((key) => {
      const value = data.get(key);
      if (value) data.set(key, inputDateToDisplay(value));
    });
    const documentFile = data.get('documento');
    if (documentFile instanceof File && !documentFile.name) data.delete('documento');
    await request('/api/tenant/full', {
      method: 'POST',
      body: data,
    });
  } else {
    const tenant = state.rows.find((row) => String(row.id_inquilino) === String(state.editingId));
    if (!tenant?.id_usuario) throw new Error('No se ha podido encontrar el usuario del inquilino');
    const password = data.get('password');
    const userPayload = {
      nombre: data.get('nombre'),
      apellido1: data.get('apellido1'),
      apellido2: data.get('apellido2') || '',
      email: data.get('email'),
      telefono: data.get('telefono') || '',
      rol: 'inquilino',
    };
    if (password) userPayload.password = password;
    await request(`/api/user/${tenant.id_usuario}`, {
      method: 'PUT',
      body: JSON.stringify(userPayload),
    });
    await request(`/api/tenant/${state.editingId}`, {
      method: 'PUT',
      body: JSON.stringify({
        nacionalidad: data.get('nacionalidad') || '',
        identificacion: data.get('identificacion'),
        numero_documento: data.get('numero_documento'),
        comentario: data.get('comentario') || '',
      }),
    });
    const documentFile = data.get('documento');
    if (documentFile instanceof File && documentFile.name) {
      const documentData = new FormData();
      documentData.set('documento', documentFile);
      await request(`/api/tenant/${state.editingId}/document`, {
        method: 'POST',
        body: documentData,
      });
    }
  }

  showToast(editing ? 'Inquilino actualizado' : 'Inquilino creado');
  state.editingId = null;
  state.resourceAction = null;
  resourceForm?.classList.add('hidden');
  await fetchAdminTenants();
}

async function loadAdminTenantsSection() {
  if (!guardAdminMenuSection('tenants')) return;

  const resource = resources.tenants;
  state.activeSection = 'tenants';
  state.resourceAction = null;
  state.activeResource = resource;
  state.editingId = null;
  adminView?.classList.add('hidden');
  dashboardView?.classList.add('hidden');
  statisticsView?.classList.add('hidden');
  crudView?.classList.remove('hidden');
  configView?.classList.add('hidden');
  detailPanel?.classList.add('hidden');
  resourceForm?.classList.add('hidden');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  resourceDocumentActions?.classList.add('hidden');
  updateResourceFilters(resource);
  updateTenantSortFilterVisibility();

  if (searchInput) searchInput.classList.add('hidden');
  const newButton = $('#newButton');
  newButton?.classList.remove('hidden');
  if (sectionEyebrow) sectionEyebrow.textContent = 'Menú administrador';
  $('#sectionTitle').textContent = 'Inquilinos';
  $('#resourceTitle').textContent = getResourceTitle(resource);
  $('#resourceHint').textContent = getResourceHint(resource);
  adminNav?.querySelectorAll('[data-admin-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminSection === 'tenants');
  });

  tableHead.innerHTML = '<tr><th>ID inquilino</th><th>Nombre</th><th>Apellido 1</th><th>Apellido 2</th><th>Email</th><th>Teléfono</th><th>Nacionalidad</th><th>Tipo de identificación</th><th>Número de documento</th><th>Vivienda actual</th><th>Habitación actual</th><th>Fecha entrada</th><th>Fecha salida</th><th>Estado actual</th><th>Acciones</th></tr>';
  tableBody.innerHTML = '<tr><td class="empty" colspan="15">Cargando inquilinos...</td></tr>';

  try {
    await loadAdminTenantOptions();
    await fetchAdminTenants();
  } catch (error) {
    state.rows = [];
    tableBody.innerHTML = '<tr><td class="empty" colspan="15">No se pudieron cargar los inquilinos. Revisa la conexión o tu sesión de administrador.</td></tr>';
    showToast(error.message || 'No se pudieron cargar los inquilinos', 'error');
  }
}

function getHouseOwnersLabel(house, ownerHouseRows = []) {
  const houseId = String(house.id_vivienda || '');
  const ownerNames = ownerHouseRows
    .filter((row) => String(row.id_vivienda || '') === houseId)
    .map((row) => [row.nombre_propietario, row.apellido1, row.apellido2].filter(Boolean).join(' ') || row.id_propietario)
    .filter(Boolean);

  return ownerNames.length ? ownerNames.join(', ') : '-';
}

function getHouseRoomCount(house, roomRows = []) {
  const houseId = String(house.id_vivienda || '');
  if (getValue(house, 'habitaciones_asociadas') !== undefined) {
    return String(getValue(house, 'habitaciones_asociadas') || 0);
  }
  const count = roomRows.filter((row) => String(row.id_vivienda || '') === houseId).length;
  return count ? String(count) : '-';
}

function getHouseOwnerRows(house, ownerHouseRows = state.adminHouseOwnerRows) {
  const houseId = String(house?.id_vivienda || house || '');
  if (!houseId) return [];
  return ownerHouseRows.filter((row) => String(row.id_vivienda || '') === houseId);
}

function getPrimaryHouseOwnerId(house) {
  const ownerRows = getHouseOwnerRows(house);
  if (ownerRows.length) return String(ownerRows[0].id_propietario || '');
  const ids = String(getValue(house, 'id_propietarios') || '').split(',').filter(Boolean);
  return ids[0] || '';
}

function getHouseOwnerFullName(row = {}) {
  return [row.nombre_propietario || row.nombre, row.apellido1, row.apellido2]
    .filter(Boolean)
    .join(' ')
    || row.email
    || 'Propietario sin nombre';
}

function getHouseOwnersPercentageTotal(ownerRows = []) {
  return ownerRows.reduce((total, row) => total + Number(row.porcentaje_propiedad || 0), 0);
}

function getHouseOwnerAvailablePercentage(ownerRows = []) {
  return Math.max(0, 100 - getHouseOwnersPercentageTotal(ownerRows));
}

async function loadHouseOwnerAssignmentOptions() {
  if (!isAdminMenuMode()) return [];
  if (state.adminHouseOwnerOptions?.length) return state.adminHouseOwnerOptions;
  const payload = await request('/api/owner?page=1&limit=500&activo=1');
  state.adminHouseOwnerOptions = getRows(payload);
  return state.adminHouseOwnerOptions;
}

function renderHouseOwnersManager(house, ownerRows = []) {
  const houseId = String(getValue(house, 'id_vivienda') || '');
  const totalPercentage = getHouseOwnersPercentageTotal(ownerRows);
  const availablePercentage = getHouseOwnerAvailablePercentage(ownerRows);

  if (!isAdminMenuMode()) {
    return renderDetailTable('Propietarios asociados', ownerRows, [
      ['nombre_propietario', 'Nombre'],
      ['apellido1', 'Apellido 1'],
      ['apellido2', 'Apellido 2'],
      ['porcentaje_propiedad', 'Porcentaje'],
    ]);
  }

  const assignedOwnerIds = new Set(ownerRows.map((row) => String(row.id_propietario || '')));
  const ownerOptions = (state.adminHouseOwnerOptions || [])
    .filter((owner) => !assignedOwnerIds.has(String(owner.id_propietario || '')))
    .map((owner) => {
      const label = getOwnerFullName(owner) || owner.email || 'Propietario sin nombre';
      return `<option value="${escapeHtml(owner.id_propietario)}">${escapeHtml(label)}</option>`;
    })
    .join('');

  const rows = ownerRows.length
    ? ownerRows.map((row) => `<tr>
        <td>${escapeHtml(getHouseOwnerFullName(row))}</td>
        <td>
          <input class="owner-percentage-input" data-owner-house-percentage="${escapeHtml(row.id_propietario_vivienda || '')}" type="number" min="0.01" max="100" step="0.01" value="${escapeHtml(row.porcentaje_propiedad ?? '')}">
        </td>
        <td>
          <div class="row-actions">
            <button class="button small ghost" data-action="update-house-owner" data-owner-house-id="${escapeHtml(row.id_propietario_vivienda || '')}" type="button">Guardar</button>
            <button class="button small danger" data-action="remove-house-owner" data-owner-house-id="${escapeHtml(row.id_propietario_vivienda || '')}" type="button">Quitar</button>
          </div>
        </td>
      </tr>`).join('')
    : '<tr><td class="empty" colspan="3">No hay propietarios asociados.</td></tr>';

  return `<section class="detail-block house-owner-manager" data-house-owner-manager data-house-id="${escapeHtml(houseId)}">
    <div class="detail-block-header">
      <h4>Propietarios asociados</h4>
      <span>${escapeHtml(formatMoney(totalPercentage))}% asignado · ${escapeHtml(formatMoney(availablePercentage))}% libre</span>
    </div>
    <div class="detail-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Propietario</th>
            <th>Porcentaje</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="house-owner-add-row">
      <label>Propietario
        <select data-house-owner-select ${ownerOptions ? '' : 'disabled'}>
          <option value="">${ownerOptions ? 'Selecciona propietario' : 'Sin propietarios disponibles'}</option>
          ${ownerOptions}
        </select>
      </label>
      <label>Porcentaje
        <input data-house-owner-new-percentage type="number" min="0.01" max="100" step="0.01" value="${escapeHtml(availablePercentage || 100)}">
      </label>
      <button class="button primary" data-action="add-house-owner" type="button" ${ownerOptions ? '' : 'disabled'}>Añadir propietario</button>
    </div>
  </section>`;
}

async function reloadHouseOwnerAssignments(houseId) {
  const payload = await request('/api/owner-house?page=1&limit=500');
  state.adminHouseOwnerRows = getRows(payload);
  await openHouseDetail(houseId);
}

async function addHouseOwnerAssignment(root) {
  const houseId = root?.dataset.houseId;
  const ownerId = root?.querySelector('[data-house-owner-select]')?.value;
  const percentage = root?.querySelector('[data-house-owner-new-percentage]')?.value;

  if (!houseId || !ownerId) {
    showToast('Selecciona propietario y porcentaje', 'error');
    return;
  }

  await request('/api/owner-house', {
    method: 'POST',
    body: JSON.stringify({
      id_propietario: ownerId,
      id_vivienda: houseId,
      porcentaje_propiedad: percentage,
    }),
  });
  showToast('Propietario asociado');
  await reloadHouseOwnerAssignments(houseId);
}

async function updateHouseOwnerAssignment(root, ownerHouseId) {
  const houseId = root?.dataset.houseId;
  const input = Array.from(root?.querySelectorAll('[data-owner-house-percentage]') || [])
    .find((item) => String(item.dataset.ownerHousePercentage || '') === String(ownerHouseId || ''));
  const percentage = input?.value;

  if (!ownerHouseId || !percentage) {
    showToast('Indica un porcentaje válido', 'error');
    return;
  }

  await request(`/api/owner-house/${ownerHouseId}`, {
    method: 'PUT',
    body: JSON.stringify({ porcentaje_propiedad: percentage }),
  });
  showToast('Porcentaje actualizado');
  await reloadHouseOwnerAssignments(houseId);
}

async function removeHouseOwnerAssignment(root, ownerHouseId) {
  const houseId = root?.dataset.houseId;
  if (!ownerHouseId || !houseId) return;
  const confirmed = window.confirm('¿Quitar este propietario de la vivienda?');
  if (!confirmed) return;

  await request(`/api/owner-house/${ownerHouseId}`, { method: 'DELETE' });
  showToast('Propietario quitado de la vivienda');
  await reloadHouseOwnerAssignments(houseId);
}

function renderAdminHouseFilters() {
  if (!resourceDocumentActions) return;

  const ownerOptions = (state.adminHouseOwnerOptions || [])
    .map((owner) => {
      const label = getOwnerFullName(owner) || owner.email || 'Propietario sin nombre';
      return `<option value="${escapeHtml(owner.id_propietario)}" ${String(state.adminHouseFilters.id_propietario) === String(owner.id_propietario) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');

  resourceDocumentActions.classList.remove('hidden');
  resourceDocumentActions.innerHTML = `
    <input class="month-filter" data-admin-house-filter="q" type="search" placeholder="Buscar vivienda" value="${escapeHtml(state.adminHouseFilters.q)}" aria-label="Buscar por dirección, ciudad, provincia o código postal">
    <select class="month-filter" data-admin-house-filter="id_propietario" aria-label="Filtrar por propietario">
      <option value="">Propietario</option>
      ${ownerOptions}
    </select>
    <select class="month-filter" data-admin-house-filter="activa" aria-label="Filtrar por estado">
      <option value="1" ${state.adminHouseFilters.activa === '1' ? 'selected' : ''}>Activa</option>
      <option value="0" ${state.adminHouseFilters.activa === '0' ? 'selected' : ''}>Inactiva</option>
    </select>`;
}

function renderAdminHousesTable(ownerHouseRows = [], roomRows = []) {
  const columns = [
    'Dirección',
    'Ciudad',
    'Provincia',
    'Código postal',
    'Propietario asociado',
    'Número de habitaciones',
    'Acciones',
  ];

  tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
  tableBody.innerHTML = state.rows.map((row) => {
    const id = getValue(row, 'id_vivienda');
    const isActive = Number(getValue(row, 'activa')) === 1 || getValue(row, 'activa') === true;
    return `<tr>
    <td>${escapeHtml(getValue(row, 'direccion') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'localidad') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'provincia') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'codigo_postal') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'propietarios_asociados') || getHouseOwnersLabel(row, ownerHouseRows))}</td>
    <td>${escapeHtml(getHouseRoomCount(row, roomRows))}</td>
    <td>
      <div class="row-actions">
        <button class="button small ghost" data-action="view-admin-house" data-id="${escapeHtml(id)}" type="button">Ver</button>
        <button class="button small ghost" data-action="edit" data-id="${escapeHtml(id)}" type="button">Editar</button>
        <button class="button small ghost" data-action="toggle-admin-house-active" data-id="${escapeHtml(id)}" data-active="${isActive ? '0' : '1'}" type="button">${isActive ? 'Desactivar' : 'Activar'}</button>
      </div>
    </td>
  </tr>`;
  }).join('');

  if (!state.rows.length) {
    tableBody.innerHTML = `<tr><td class="empty" colspan="${columns.length}">No hay viviendas para mostrar.</td></tr>`;
  }
}

async function loadAdminHouseOwnerOptions() {
  const payload = await request('/api/owner?page=1&limit=500&activo=1');
  state.adminHouseOwnerOptions = getRows(payload);
  renderAdminHouseFilters();
  return state.adminHouseOwnerOptions;
}

async function fetchAdminHouses() {
  const resource = resources.houses;
  const params = new URLSearchParams({ page: '1', limit: '100' });
  const { q, activa, id_propietario } = state.adminHouseFilters;
  if (q) params.set('q', q);
  if (activa) params.set('activa', activa);
  if (id_propietario) params.set('id_propietario', id_propietario);

  tableBody.innerHTML = '<tr><td class="empty" colspan="7">Cargando viviendas...</td></tr>';
  detailPanel?.classList.add('hidden');

  const [housesResult, ownerHousesResult, roomsResult] = await Promise.allSettled([
    request(`${getResourceEndpoint(resource)}?${params.toString()}`),
    request('/api/owner-house?page=1&limit=500'),
    request(`${getResourceEndpoint(resources.rooms)}?page=1&limit=500`),
  ]);

  if (housesResult.status !== 'fulfilled') {
    throw housesResult.reason;
  }

  state.rows = getRows(housesResult.value);
  state.adminHouseOwnerRows = ownerHousesResult.status === 'fulfilled' ? getRows(ownerHousesResult.value) : [];
  state.adminHouseRoomRows = roomsResult.status === 'fulfilled' ? getRows(roomsResult.value) : [];
  renderAdminHousesTable(state.adminHouseOwnerRows, state.adminHouseRoomRows);
}

function renderAdminHouseForm(house = {}) {
  const editing = Boolean(state.editingId);
  const selectedOwnerId = getPrimaryHouseOwnerId(house);
  const ownerOptions = (state.adminHouseOwnerOptions || [])
    .map((owner) => {
      const label = getOwnerFullName(owner) || owner.email || 'Propietario sin nombre';
      return `<option value="${escapeHtml(owner.id_propietario)}" ${String(selectedOwnerId) === String(owner.id_propietario) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');

  resourceForm.classList.remove('hidden');
  resourceForm.classList.remove('house-create-form', 'expense-create-form');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  detailPanel?.classList.add('hidden');

  resourceForm.innerHTML = `<h3>${editing ? 'Editar vivienda' : 'Nueva vivienda'}</h3>
    <label>Dirección<input name="direccion" type="text" value="${escapeHtml(getValue(house, 'direccion') || '')}" required></label>
    <label>Ciudad<input name="localidad" type="text" value="${escapeHtml(getValue(house, 'localidad') || '')}" required></label>
    <label>Provincia<input name="provincia" type="text" value="${escapeHtml(getValue(house, 'provincia') || '')}" required></label>
    <label>CP<input name="codigo_postal" type="text" value="${escapeHtml(getValue(house, 'codigo_postal') || '')}"></label>
    <label>Descripción<textarea name="descripcion">${escapeHtml(getValue(house, 'descripcion') || '')}</textarea></label>
    <label>Activa<select name="activa">
      <option value="1" ${String(getValue(house, 'activa') ?? '1') === '1' ? 'selected' : ''}>1</option>
      <option value="0" ${String(getValue(house, 'activa')) === '0' ? 'selected' : ''}>0</option>
    </select></label>
    <label>Propietario<select name="id_propietario" ${editing ? '' : 'required'}>
      <option value="">${editing ? 'Sin cambio' : 'Selecciona'}</option>
      ${ownerOptions}
    </select></label>
    <div class="form-actions">
      <button class="button primary" type="submit">${editing ? 'Guardar' : 'Crear'}</button>
      <button class="button ghost" id="cancelEditButton" type="button">Limpiar</button>
    </div>`;
}

async function openAdminHouseForm(house = null) {
  await loadAdminHouseOwnerOptions();
  state.editingId = house ? getValue(house, 'id_vivienda') : null;
  state.resourceAction = house ? 'update' : 'create';
  renderAdminHouseForm(house || {});
}

async function openHouseDetail(id) {
  if (!detailPanel) return;
  state.activeHouseRecordId = id;
  state.resourceAction = null;
  renderHouseSectionActions();
  if (state.activeResource === resources.houses && !isAdminMenuMode()) renderTable();
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = '<p class="detail-loading">Cargando vivienda...</p>';
  const house = await request(`/api/house/${id}`);
  const [ownerHousePayload, roomsPayload] = await Promise.all([
    state.adminHouseOwnerRows.length
      ? Promise.resolve(state.adminHouseOwnerRows)
      : request('/api/owner-house?page=1&limit=500').catch(() => []),
    state.adminHouseRoomRows.length
      ? Promise.resolve(state.adminHouseRoomRows)
      : request(`${getResourceEndpoint(resources.rooms)}?page=1&limit=500`).catch(() => []),
  ]);
  if (isAdminMenuMode()) {
    await loadHouseOwnerAssignmentOptions().catch(() => []);
  }
  const ownerHouseRows = getRows(ownerHousePayload);
  const allRoomRows = getRows(roomsPayload);
  const ownerRows = getHouseOwnerRows(house, ownerHouseRows);
  const roomRows = allRoomRows.filter((row) => String(row.id_vivienda || '') === String(id));
  const houseSummary = {
    ...house,
    habitaciones_asociadas: getHouseRoomCount(house, roomRows),
    activa: formatDisplayValue('activa', house.activa),
    created_at: formatDateTimeDisplay(house.created_at),
    updated_at: formatDateTimeDisplay(house.updated_at),
  };
  const houseRoomRows = roomRows.map((room) => ({
    ...room,
    activa: formatDisplayValue('activa', room.activa),
  }));
  const isHouseActive = !(house.activa === false || Number(house.activa) === 0 || String(house.activa).toLowerCase() === 'false');
  const houseDescription = String(getValue(house, 'descripcion') || '').trim();

  detailPanel.innerHTML = `<div class="detail-header">
    <div>
      <p class="eyebrow">Vivienda</p>
      <h3>${escapeHtml(getValue(house, 'nombre') || getValue(house, 'direccion') || 'Vivienda')}</h3>
    </div>
    <div class="detail-header-actions">
      ${isHouseActive ? '' : `<button class="button primary" data-action="activate-house-detail" data-house-id="${escapeHtml(id)}" type="button">Activar</button>`}
      <button class="detail-close-button" data-action="close-detail" type="button" aria-label="Cerrar">&times;</button>
    </div>
  </div>
  <section class="detail-block house-description-block">
    <h4>Descripción</h4>
    <p>${escapeHtml(houseDescription || 'Sin descripción')}</p>
  </section>
  ${renderDetailTable('Datos principales', [houseSummary], [
    ['nombre', 'Nombre'],
    ['direccion', 'Dirección'],
    ['localidad', 'Ciudad'],
    ['provincia', 'Provincia'],
    ['codigo_postal', 'CP'],
    ['activa', 'Activa'],
    ['habitaciones_asociadas', 'Habitaciones'],
    ['created_at', 'Creada'],
    ['updated_at', 'Actualizada'],
  ])}
  ${renderHouseOwnersManager(house, ownerRows)}
  ${renderDetailTable(`Habitaciones asociadas (${escapeHtml(houseSummary.habitaciones_asociadas || houseRoomRows.length)})`, houseRoomRows, [
    ['nombre', 'Nombre'],
    ['tipo', 'Tipo'],
    ['numero_camas', 'Camas'],
    ['precio', 'Precio actual'],
    ['activa', 'Activa'],
  ])}`;
}

const openAdminHouseDetail = openHouseDetail;

async function toggleAdminHouseActive(id, active) {
  const action = String(active) === '1' ? 'activar' : 'desactivar';
  const confirmed = window.confirm(`¿Seguro que quieres ${action} esta vivienda?`);
  if (!confirmed) return;

  await request(`/api/house/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ activa: Number(active) }),
  });
  showToast(String(active) === '1' ? 'Vivienda activada' : 'Vivienda desactivada');
  await fetchAdminHouses();
}

async function openActiveHouseEditForm() {
  const id = state.activeHouseRecordId;
  if (!id) {
    showToast('Abre primero una vivienda para modificarla', 'error');
    return;
  }

  const row = state.rows.find((item) => String(getValue(item, 'id_vivienda')) === String(id))
    || await request(`/api/house/${id}`);
  state.resourceAction = 'update';
  state.editingId = id;
  state.editingHouseRooms = await loadHouseRooms(id);
  renderHouseSectionActions();
  renderForm(row);
  resourceForm?.classList.remove('hidden');
  detailPanel?.classList.add('hidden');
  tableWrap?.classList.add('hidden');
  splitLayout?.classList.remove('table-full-width', 'house-list-layout');
  splitLayout?.classList.add('tenant-create-layout');
}

async function deactivateHouseRecord(id, options = {}) {
  const confirmed = options.skipConfirm
    || window.confirm('¿Eliminar esta vivienda? Se desactivará y dejará de mostrarse.');
  if (!confirmed) return false;

  await request(`/api/house/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ activa: 0 }),
  });
  showToast('Vivienda desactivada');
  return true;
}

async function deactivateActiveHouseRecord() {
  const id = state.activeHouseRecordId;
  if (!id) {
    showToast('Abre primero una vivienda para eliminarla', 'error');
    return;
  }

  const deactivated = await deactivateHouseRecord(id);
  if (!deactivated) return;
  state.activeHouseRecordId = null;
  await loadRows();
  renderHouseSectionActions();
}

async function activateHouseFromDetail(id) {
  if (!id) return;
  await request(`/api/house/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ activa: 1 }),
  });
  showToast('Vivienda activada');
  await loadRows();
  if (state.houseStatusFilter !== 'desactivadas') {
    await openHouseDetail(id);
  } else {
    clearDetailPanel();
    renderHouseSectionActions();
  }
}

async function submitAdminHouseForm() {
  if (!resourceForm.checkValidity()) return;
  const data = Object.fromEntries(new FormData(resourceForm).entries());
  const housePayload = {
    nombre: data.direccion,
    direccion: data.direccion,
    localidad: data.localidad,
    provincia: data.provincia,
    codigo_postal: data.codigo_postal || '',
    descripcion: data.descripcion || '',
    activa: data.activa,
  };
  const currentOwnerId = state.editingId
    ? getPrimaryHouseOwnerId(state.rows.find((row) => String(row.id_vivienda) === String(state.editingId)) || {})
    : '';

  if (data.id_propietario && currentOwnerId && currentOwnerId !== String(data.id_propietario)) {
    throw new Error('Cambiar propietario requiere revisar histórico; no se ha modificado la asociación existente');
  }

  let idHouse = state.editingId;
  if (state.editingId) {
    await request(`/api/house/${state.editingId}`, {
      method: 'PUT',
      body: JSON.stringify(housePayload),
    });
  } else {
    const result = await request('/api/house', {
      method: 'POST',
      body: JSON.stringify(housePayload),
    });
    idHouse = result?.house?.id_vivienda;
  }

  if (data.id_propietario) {
    if (!currentOwnerId) {
      if (!idHouse) throw new Error('No se ha podido asociar propietario porque falta la vivienda');
      await request('/api/owner-house', {
        method: 'POST',
        body: JSON.stringify({
          id_propietario: data.id_propietario,
          id_vivienda: idHouse,
          porcentaje_propiedad: 100,
        }),
      });
    }
  }

  showToast(state.editingId ? 'Vivienda actualizada' : 'Vivienda creada');
  state.editingId = null;
  state.resourceAction = null;
  resourceForm?.classList.add('hidden');
  await fetchAdminHouses();
}

async function loadAdminHousesSection() {
  if (!guardAdminMenuSection('houses')) return;

  const resource = resources.houses;
  state.activeSection = 'houses';
  state.resourceAction = null;
  state.activeResource = resource;
  state.editingId = null;
  adminView?.classList.add('hidden');
  dashboardView?.classList.add('hidden');
  statisticsView?.classList.add('hidden');
  crudView?.classList.remove('hidden');
  configView?.classList.add('hidden');
  detailPanel?.classList.add('hidden');
  resourceForm?.classList.add('hidden');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  resourceDocumentActions?.classList.add('hidden');
  updateResourceFilters(resource);
  updateTenantSortFilterVisibility();

  if (searchInput) searchInput.classList.add('hidden');
  const newButton = $('#newButton');
  newButton?.classList.remove('hidden');
  if (sectionEyebrow) sectionEyebrow.textContent = 'Menú administrador';
  $('#sectionTitle').textContent = 'Viviendas';
  $('#resourceTitle').textContent = getResourceTitle(resource);
  $('#resourceHint').textContent = getResourceHint(resource);
  adminNav?.querySelectorAll('[data-admin-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminSection === 'houses');
  });

  tableHead.innerHTML = '<tr><th>Dirección</th><th>Ciudad</th><th>Provincia</th><th>Código postal</th><th>Propietario asociado</th><th>Número de habitaciones</th><th>Acciones</th></tr>';
  tableBody.innerHTML = '<tr><td class="empty" colspan="7">Cargando viviendas...</td></tr>';

  try {
    await loadAdminHouseOwnerOptions();
    await fetchAdminHouses();
  } catch (error) {
    state.rows = [];
    state.adminHouseOwnerRows = [];
    state.adminHouseRoomRows = [];
    tableBody.innerHTML = '<tr><td class="empty" colspan="7">No se pudieron cargar las viviendas. Revisa la conexión o tu sesión de administrador.</td></tr>';
    showToast(error.message || 'No se pudieron cargar las viviendas', 'error');
  }
}

function roomIsOccupied(room, tenantRows = []) {
  const roomId = String(room.id_habitacion || '');
  return tenantRows.some((tenant) => String(tenant.id_habitacion || '') === roomId && !tenant.fecha_salida);
}

function getRoomFreeBeds(room, tenantRows = []) {
  const roomId = String(room.id_habitacion || '');
  const totalBeds = Number(room.numero_camas || 0);
  if (!roomId || !totalBeds) return Math.max(totalBeds, 0);
  const occupiedBeds = tenantRows.filter((tenant) => (
    String(tenant.id_habitacion || '') === roomId
    && !tenant.fecha_salida
    && Number(tenant.activo ?? 1) !== 0
  )).length;
  return Math.max(totalBeds - occupiedBeds, 0);
}

function addRoomAvailability(rows = [], tenantRows = []) {
  return rows.map((row) => ({
    ...row,
    camas_libres: getRoomFreeBeds(row, tenantRows),
  }));
}

function renderAdminRoomFilters() {
  if (!resourceDocumentActions) return;

  const houseOptions = (state.adminRoomHouseOptions || [])
    .map((house) => {
      const label = house.nombre || house.direccion || 'Vivienda sin nombre';
      return `<option value="${escapeHtml(house.id_vivienda)}" ${String(state.adminRoomFilters.id_vivienda) === String(house.id_vivienda) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');

  resourceDocumentActions.classList.remove('hidden');
  resourceDocumentActions.innerHTML = `
    <input class="month-filter" data-admin-room-filter="q" type="search" placeholder="Buscar habitación" value="${escapeHtml(state.adminRoomFilters.q)}" aria-label="Buscar por nombre">
    <select class="month-filter" data-admin-room-filter="id_vivienda" aria-label="Filtrar por vivienda">
      <option value="">Vivienda</option>
      ${houseOptions}
    </select>
    <select class="month-filter" data-admin-room-filter="tipo" aria-label="Filtrar por tipo">
      <option value="">Tipo</option>
      ${['grande', 'mediana', 'pequena'].map((type) => `<option value="${type}" ${state.adminRoomFilters.tipo === type ? 'selected' : ''}>${type}</option>`).join('')}
    </select>
    <select class="month-filter" data-admin-room-filter="ocupada" aria-label="Filtrar por ocupación">
      <option value="">Ocupación</option>
      <option value="1" ${state.adminRoomFilters.ocupada === '1' ? 'selected' : ''}>Ocupada</option>
      <option value="0" ${state.adminRoomFilters.ocupada === '0' ? 'selected' : ''}>Libre</option>
    </select>
    <select class="month-filter" data-admin-room-filter="activa" aria-label="Filtrar por estado">
      <option value="1" ${state.adminRoomFilters.activa === '1' ? 'selected' : ''}>Activa</option>
      <option value="0" ${state.adminRoomFilters.activa === '0' ? 'selected' : ''}>Inactiva</option>
    </select>`;
}

function renderAdminRoomsTable(tenantRows = []) {
  const columns = [
    'Vivienda',
    'Nombre',
    'Tipo',
    'Número de camas',
    'Precio',
    'Camas libres',
  ];
  const occupancyFilter = state.adminRoomFilters.ocupada;
  const filteredRows = occupancyFilter === ''
    ? state.rows
    : state.rows.filter((row) => String(roomIsOccupied(row, tenantRows) ? '1' : '0') === occupancyFilter);

  tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
  tableBody.innerHTML = filteredRows.map((row) => {
    return `<tr>
      <td>${escapeHtml(getValue(row, 'nombre_vivienda') || getValue(row, 'id_vivienda') || '-')}</td>
      <td>${escapeHtml(getValue(row, 'nombre') || '-')}</td>
      <td>${escapeHtml(getValue(row, 'tipo') || '-')}</td>
      <td>${escapeHtml(getValue(row, 'numero_camas') ?? '-')}</td>
      <td>${escapeHtml(formatDisplayValue('precio', getValue(row, 'precio')) || '-')}</td>
      <td>${escapeHtml(getValue(row, 'camas_libres') ?? getRoomFreeBeds(row, tenantRows))}</td>
    </tr>`;
  }).join('');

  if (!filteredRows.length) {
    tableBody.innerHTML = `<tr><td class="empty" colspan="${columns.length}">No hay habitaciones para mostrar.</td></tr>`;
  }
}

async function loadAdminRoomHouseOptions() {
  const payload = await request('/api/house?page=1&limit=500&activa=1');
  state.adminRoomHouseOptions = getRows(payload);
  return state.adminRoomHouseOptions;
}

async function fetchAdminRooms() {
  const resource = resources.rooms;
  const params = new URLSearchParams({ page: '1', limit: '500' });
  const { q, id_vivienda, tipo, activa } = state.adminRoomFilters;
  if (q) params.set('q', q);
  if (id_vivienda) params.set('id_vivienda', id_vivienda);
  if (tipo) params.set('tipo', tipo);
  if (activa) params.set('activa', activa);

  tableBody.innerHTML = '<tr><td class="empty" colspan="6">Cargando habitaciones...</td></tr>';
  detailPanel?.classList.add('hidden');

  const [roomsResult, tenantsResult] = await Promise.allSettled([
    request(`${getResourceEndpoint(resource)}?${params.toString()}`),
    request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`),
  ]);

  if (roomsResult.status !== 'fulfilled') {
    throw roomsResult.reason;
  }

  state.adminRoomTenantRows = tenantsResult.status === 'fulfilled' ? normalizeTenantRows(getRows(tenantsResult.value)) : [];
  state.rows = addRoomAvailability(getRows(roomsResult.value), state.adminRoomTenantRows);
  renderAdminRoomsTable(state.adminRoomTenantRows);
  await openRoomsSectionHouseDetail();
}

function renderAdminRoomForm(room = {}) {
  const editing = Boolean(state.editingId);
  const useRoomMenuHouse = state.activeSection === 'rooms' && !isAdminMenuMode();
  const selectedHouseId = String(getValue(room, 'id_vivienda') || state.roomsSelectedHouseId || '');
  const priceStartDate = dateToInputValue(getValue(room, 'fecha_precio_desde'));
  const houseOptions = (state.adminRoomHouseOptions || [])
    .map((house) => {
      const label = house.nombre || house.direccion || 'Vivienda sin nombre';
      return `<option value="${escapeHtml(house.id_vivienda)}" ${selectedHouseId === String(house.id_vivienda) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');

  resourceForm.classList.remove('hidden');
  resourceForm.classList.remove('house-create-form', 'expense-create-form', 'house-edit-form');
  resourceForm.classList.add('room-edit-form');
  tableWrap?.classList.add('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  detailPanel?.classList.toggle('hidden', !useRoomMenuHouse);

  resourceForm.innerHTML = `<div class="form-header room-form-header">
      <h3>${editing ? 'Modificar habitación' : 'Nueva habitación'}</h3>
      <button class="detail-close-button room-form-close-button" id="cancelEditButton" type="button" aria-label="Cerrar">&times;</button>
    </div>
    ${editing ? `<input name="precio_original" type="hidden" value="${escapeHtml(getValue(room, 'precio') || '')}">` : ''}
    ${useRoomMenuHouse
      ? `<input name="id_vivienda" type="hidden" value="${escapeHtml(selectedHouseId)}">`
      : `<label>Vivienda<select name="id_vivienda" required>
          <option value="">Selecciona</option>
          ${houseOptions}
        </select></label>`}
    <div class="room-form-grid">
      <label>Nombre<input name="nombre" type="text" value="${escapeHtml(getValue(room, 'nombre') || '')}" data-normalize-case="first-upper" required></label>
      <label>Tipo<select name="tipo" required>
        <option value="">Selecciona</option>
        ${['grande', 'mediana', 'pequena'].map((type) => `<option value="${type}" ${getValue(room, 'tipo') === type ? 'selected' : ''}>${type}</option>`).join('')}
      </select></label>
      <label>Número de camas<input name="numero_camas" type="number" min="1" step="1" value="${escapeHtml(getValue(room, 'numero_camas') || '')}" required></label>
      <label>Precio habitación<input name="precio" type="number" min="0" step="0.01" value="${escapeHtml(getValue(room, 'precio') || '')}" required></label>
      <label>Aplicar precio desde<input name="fecha_precio_desde" type="date" value="${escapeHtml(priceStartDate || todayInputValue())}" ${editing ? '' : 'required'}></label>
      <label>Activa<select name="activa">
        <option value="1" ${String(getValue(room, 'activa') ?? '1') === '1' ? 'selected' : ''}>Sí</option>
        <option value="0" ${String(getValue(room, 'activa')) === '0' ? 'selected' : ''}>No</option>
      </select></label>
    </div>
    <div class="form-actions">
      <button class="button primary" type="submit">${editing ? 'Guardar' : 'Crear'}</button>
    </div>`;
}

function renderRoomInlineForm(room = {}) {
  const editing = Boolean(state.editingId);
  const selectedHouseId = String(getValue(room, 'id_vivienda') || state.roomsSelectedHouseId || '');
  const priceStartDate = dateToInputValue(getValue(room, 'fecha_precio_desde'));
  const roomName = getValue(room, 'nombre') || '';
  const locked = Boolean(state.roomFormLocked);
  const disabledAttr = locked ? 'disabled' : '';

  return `<form class="resource-form room-edit-form" data-room-inline-form>
    <div class="form-header room-form-header">
      <h3>${editing ? 'Modificar habitación' : 'Nueva habitación'}</h3>
      <button class="detail-close-button room-form-close-button" data-action="close-room-form" type="button" aria-label="Cerrar">&times;</button>
    </div>
    <input name="id_vivienda" type="hidden" value="${escapeHtml(selectedHouseId)}">
    ${editing ? `<input name="precio_original" type="hidden" value="${escapeHtml(getValue(room, 'precio') || '')}">` : ''}
    <div class="room-form-grid">
      <label>Nombre<input name="nombre" type="text" value="${escapeHtml(roomName)}" data-normalize-case="first-upper" ${disabledAttr} required></label>
      <label>Tipo<select name="tipo" ${disabledAttr} required>
        <option value="">Selecciona</option>
        ${['grande', 'mediana', 'pequena'].map((type) => `<option value="${type}" ${getValue(room, 'tipo') === type ? 'selected' : ''}>${type}</option>`).join('')}
      </select></label>
      <label>Número de camas<input name="numero_camas" type="number" min="1" step="1" value="${escapeHtml(getValue(room, 'numero_camas') || '')}" ${disabledAttr} required></label>
      <label>Precio habitación<input name="precio" type="number" min="0" step="0.01" value="${escapeHtml(getValue(room, 'precio') || '')}" ${disabledAttr} required></label>
      <label>Aplicar precio desde<input name="fecha_precio_desde" type="date" value="${escapeHtml(priceStartDate || todayInputValue())}" ${disabledAttr} ${editing ? '' : 'required'}></label>
      <label>Activa<select name="activa" ${disabledAttr}>
        <option value="1" ${String(getValue(room, 'activa') ?? '1') === '1' ? 'selected' : ''}>Sí</option>
        <option value="0" ${String(getValue(room, 'activa')) === '0' ? 'selected' : ''}>No</option>
      </select></label>
    </div>
    <div class="form-actions">
      <button class="button primary" type="submit" ${disabledAttr}>${locked ? 'Creada' : editing ? 'Guardar' : 'Crear'}</button>
    </div>
  </form>`;
}

function getNextRoomDefaultName(rooms = []) {
  const usedNumbers = new Set();
  rooms.forEach((room) => {
    const match = String(room.nombre || '').trim().match(/^habitaci[oó]n\s+(\d+)$/i);
    if (match) usedNumbers.add(Number(match[1]));
  });

  if (!usedNumbers.size) {
    return `Habitación ${rooms.length + 1}`;
  }

  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;
  return `Habitación ${nextNumber}`;
}

async function openAdminRoomForm(room = null, options = {}) {
  await loadAdminRoomHouseOptions();
  const editing = Boolean(room && getValue(room, 'id_habitacion'));
  state.editingId = editing ? getValue(room, 'id_habitacion') : null;
  state.resourceAction = editing ? 'update' : 'create';
  state.roomFormLocked = false;
  if (options.inline || (state.activeSection === 'rooms' && !isAdminMenuMode())) {
    state.editingRoomForm = room || {};
    resourceForm?.classList.add('hidden');
    if (resourceForm) resourceForm.innerHTML = '';
    renderHouseDetail();
    renderRoomsSectionActions();
    return;
  }
  renderAdminRoomForm(room || {});
}

async function openAdminRoomDetail(id) {
  if (!detailPanel) return;
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = '<p class="detail-loading">Cargando habitación...</p>';
  const room = await request(`/api/room/${id}`);
  const occupied = roomIsOccupied(room, state.adminRoomTenantRows);

  detailPanel.innerHTML = `<div class="detail-header">
    <div>
      <p class="eyebrow">Habitación</p>
      <h3>${escapeHtml(getValue(room, 'nombre') || 'Habitación')}</h3>
    </div>
    <button class="detail-close-button" data-action="close-detail" type="button" aria-label="Cerrar">&times;</button>
  </div>
  ${renderDetailTable('Datos principales', [{ ...room, ocupacion: occupied ? 'Ocupada' : 'Libre' }], [
    ['nombre_vivienda', 'Vivienda'],
    ['nombre', 'Nombre'],
    ['tipo', 'Tipo'],
    ['numero_camas', 'Número de camas'],
    ['precio', 'Precio'],
    ['ocupacion', 'Estado ocupación'],
    ['activa', 'Activa'],
    ['created_at', 'Creada'],
    ['updated_at', 'Actualizada'],
  ])}`;
}

async function toggleAdminRoomActive(id, active) {
  const action = String(active) === '1' ? 'activar' : 'desactivar';
  const confirmed = window.confirm(`¿Seguro que quieres ${action} esta habitación?`);
  if (!confirmed) return;

  await request(`/api/room/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ activa: Number(active) }),
  });
  showToast(String(active) === '1' ? 'Habitación activada' : 'Habitación desactivada');
  await fetchAdminRooms();
}

async function submitAdminRoomForm(form = resourceForm) {
  if (!form?.checkValidity()) return;
  normalizeCaseFields(form);
  const data = Object.fromEntries(new FormData(form).entries());
  const inlineRoomForm = form.matches?.('[data-room-inline-form]');
  const wasCreating = !state.editingId;
  const currentPrice = Number(data.precio || 0);
  const originalPrice = data.precio_original === undefined || data.precio_original === ''
    ? currentPrice
    : Number(data.precio_original || 0);
  if (state.editingId && currentPrice !== originalPrice && !data.fecha_precio_desde) {
    showToast('Indica la fecha desde la que se aplica el precio', 'error');
    const dateInput = form.querySelector('[name="fecha_precio_desde"]');
    dateInput?.focus();
    dateInput?.showPicker?.();
    return;
  }
  const payload = {
    id_vivienda: data.id_vivienda,
    nombre: data.nombre,
    tipo: data.tipo,
    numero_camas: data.numero_camas,
    precio: data.precio,
    activa: data.activa,
  };
  if (!state.editingId && data.fecha_precio_desde) {
    payload.fecha_precio_desde = inputDateToDisplay(data.fecha_precio_desde);
  }
  if (state.editingId && currentPrice !== originalPrice && data.fecha_precio_desde) {
    payload.fecha_precio_desde = inputDateToDisplay(data.fecha_precio_desde);
  }

  await request(state.editingId ? `/api/room/${state.editingId}` : '/api/room', {
    method: state.editingId ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });

  showToast(state.editingId ? 'Habitación actualizada' : 'Habitación creada');
  if (inlineRoomForm && wasCreating) {
    const houseId = data.id_vivienda || state.roomsSelectedHouseId || state.activeHouseDetail?.houseId || '';
    const houseName = state.activeHouseDetail?.houseName || 'Vivienda sin nombre';
    state.editingId = null;
    state.resourceAction = 'create';
    state.roomFormLocked = true;
    state.editingRoomForm = {
      ...payload,
      id_vivienda: houseId,
      fecha_precio_desde: data.fecha_precio_desde,
      precio_original: data.precio,
    };
    resourceForm?.classList.add('hidden');
    if (houseId) {
      await loadHouseDetail(houseId, houseName);
    } else {
      renderHouseDetail();
      renderRoomsSectionActions();
    }
    return;
  }
  state.editingId = null;
  state.resourceAction = null;
  state.editingRoomForm = null;
  state.roomFormLocked = false;
  resourceForm?.classList.add('hidden');
  if (isAdminMenuMode()) {
    await fetchAdminRooms();
  } else {
    await loadRows();
  }
}

async function loadAdminRoomsSection() {
  if (!guardAdminMenuSection('rooms')) return;

  const resource = resources.rooms;
  state.activeSection = 'rooms';
  state.resourceAction = null;
  state.activeResource = resource;
  state.editingId = null;
  adminView?.classList.add('hidden');
  dashboardView?.classList.add('hidden');
  statisticsView?.classList.add('hidden');
  crudView?.classList.remove('hidden');
  configView?.classList.add('hidden');
  detailPanel?.classList.add('hidden');
  resourceForm?.classList.add('hidden');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  resourceDocumentActions?.classList.add('hidden');
  updateResourceFilters(resource);
  updateTenantSortFilterVisibility();

  if (searchInput) searchInput.classList.add('hidden');
  const newButton = $('#newButton');
  newButton?.classList.add('hidden');
  if (sectionEyebrow) sectionEyebrow.textContent = 'Menú administrador';
  $('#sectionTitle').textContent = 'Habitaciones';
  $('#resourceTitle').textContent = getResourceTitle(resource);
  $('#resourceHint').textContent = getResourceHint(resource);
  adminNav?.querySelectorAll('[data-admin-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminSection === 'rooms');
  });

  tableHead.innerHTML = '<tr><th>Vivienda</th><th>Nombre</th><th>Tipo</th><th>Número de camas</th><th>Precio</th><th>Camas libres</th></tr>';
  tableBody.innerHTML = '<tr><td class="empty" colspan="6">Cargando habitaciones...</td></tr>';

  try {
    await loadAdminRoomHouseOptions();
    await fetchAdminRooms();
  } catch (error) {
    state.rows = [];
    state.adminRoomTenantRows = [];
    tableBody.innerHTML = '<tr><td class="empty" colspan="6">No se pudieron cargar las habitaciones. Revisa la conexión o tu sesión de administrador.</td></tr>';
    showToast(error.message || 'No se pudieron cargar las habitaciones', 'error');
  }
}

function getAdminPaymentTenantMap() {
  return new Map((state.adminPaymentTenantRows || []).map((tenant) => [String(tenant.id_inquilino || ''), tenant]));
}

function getAdminPaymentHouseOptions() {
  const houses = new Map();
  (state.adminPaymentHouseOptions || []).forEach((house) => {
    const id = String(house.id_vivienda || '');
    if (!id) return;
    houses.set(id, house.nombre || house.direccion || 'Vivienda sin nombre');
  });
  (state.adminPaymentTenantRows || []).forEach((tenant) => {
    const id = String(tenant.id_vivienda || '');
    if (!id || houses.has(id)) return;
    houses.set(id, tenant.nombre_vivienda || 'Vivienda sin nombre');
  });
  state.rows.forEach((row) => {
    const id = String(row.id_vivienda || '');
    if (!id || houses.has(id)) return;
    houses.set(id, row.nombre_vivienda || 'Vivienda sin nombre');
  });
  return Array.from(houses.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label, 'es'));
}

function getAdminPaymentTenantName(row, tenantMap = getAdminPaymentTenantMap()) {
  const tenant = tenantMap.get(String(row.id_inquilino || ''));
  return row.nombre_inquilino
    || [row.nombre, row.apellido1, row.apellido2].filter(Boolean).join(' ')
    || (tenant ? getTenantDisplayLabel(tenant) : '')
    || '-';
}

function getAdminPaymentHouseName(row, tenantMap = getAdminPaymentTenantMap()) {
  const tenant = tenantMap.get(String(row.id_inquilino || ''));
  return row.nombre_vivienda || tenant?.nombre_vivienda || '-';
}

function getAdminPaymentPeriod(row) {
  const month = Number(row.mes || 0);
  const year = Number(row.anio || 0);
  if (!month || !year) return { start: '', end: '', date: null };
  const range = getMonthRange(year, month);
  return {
    start: formatDisplayValue('fecha_inicio', range.start),
    end: formatDisplayValue('fecha_fin', range.end),
    date: range.start,
  };
}

function adminPaymentIsFuture(row) {
  const { date } = getAdminPaymentPeriod(row);
  if (!date) return false;
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return date > currentMonth;
}

function getAdminPaymentAmount(row) {
  return row.importe_asignado ?? row.importe ?? row.importe_total ?? '';
}

function formatAdminPaymentAmount(row) {
  const amount = getAdminPaymentAmount(row);
  return amount === '' || amount === null || amount === undefined ? '-' : formatMoney(amount);
}

function renderAdminPaymentFilters() {
  if (!resourceDocumentActions) return;
  const tenantMap = getAdminPaymentTenantMap();
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const years = Array.from(new Set(state.rows.map((row) => row.anio).filter(Boolean))).sort((a, b) => Number(b) - Number(a));
  const currentYear = new Date().getFullYear();
  if (!years.includes(currentYear)) years.unshift(currentYear);
  const tenants = Array.from(new Map((state.adminPaymentTenantRows.length ? state.adminPaymentTenantRows : state.rows)
    .filter((row) => row.id_inquilino)
    .map((row) => [
      String(row.id_inquilino),
      {
        id: String(row.id_inquilino),
        label: getAdminPaymentTenantName(row, tenantMap),
      },
    ])).values()).sort((left, right) => left.label.localeCompare(right.label, 'es'));
  const houses = getAdminPaymentHouseOptions();

  resourceDocumentActions.classList.remove('hidden');
  resourceDocumentActions.innerHTML = `
    <input class="month-filter" data-admin-payment-filter="q" type="search" placeholder="Buscar pago" value="${escapeHtml(state.adminPaymentFilters.q)}" aria-label="Buscar por inquilino, vivienda, concepto o comentarios">
    <select class="month-filter" data-admin-payment-filter="tenant" aria-label="Filtrar por inquilino">
      <option value="">Inquilino</option>
      ${tenants.map((tenant) => `<option value="${escapeHtml(tenant.id)}" ${String(state.adminPaymentFilters.tenant) === tenant.id ? 'selected' : ''}>${escapeHtml(tenant.label)}</option>`).join('')}
    </select>
    <select class="month-filter" data-admin-payment-filter="house" aria-label="Filtrar por vivienda">
      <option value="">Vivienda</option>
      ${houses.map((house) => `<option value="${escapeHtml(house.id)}" ${String(state.adminPaymentFilters.house) === house.id ? 'selected' : ''}>${escapeHtml(house.label)}</option>`).join('')}
    </select>
    <select class="month-filter" data-admin-payment-filter="concept" aria-label="Filtrar por concepto">
      <option value="">Concepto</option>
      ${['alquiler', 'gasto'].map((concept) => `<option value="${concept}" ${state.adminPaymentFilters.concept === concept ? 'selected' : ''}>${concept}</option>`).join('')}
    </select>
    <select class="month-filter" data-admin-payment-filter="month" aria-label="Filtrar por mes">
      <option value="">Mes</option>
      ${months.map((month) => `<option value="${escapeHtml(month)}" ${String(state.adminPaymentFilters.month) === String(month) ? 'selected' : ''}>${escapeHtml(month)}</option>`).join('')}
    </select>
    <input class="month-filter" data-admin-payment-filter="year" type="number" min="2000" max="2100" placeholder="Año" value="${escapeHtml(state.adminPaymentFilters.year)}" aria-label="Filtrar por año">
    <label class="month-filter">
      <input type="checkbox" data-admin-payment-filter="includeFuture" ${state.adminPaymentFilters.includeFuture ? 'checked' : ''}>
      Futuros
    </label>`;
}

function renderAdminPaymentTotal(rows = state.rows) {
  if (!expenseTotal) return;
  const total = rows
    .filter((row) => String(row.estado || '').toLowerCase() !== 'cancelado')
    .reduce((sum, row) => sum + parseMoneyValue(getAdminPaymentAmount(row)), 0);
  expenseTotal.classList.remove('hidden');
  expenseTotal.innerHTML = `<span>Total pagos filtrados</span><strong>${formatExpenseTotal(total)}</strong>`;
}

function renderAdminPaymentsTable() {
  const columns = [
    'ID pago',
    'Inquilino',
    'Vivienda',
    'Periodo inicio',
    'Periodo fin',
    'Concepto',
    'Importe',
    'Comentarios',
    'Acciones',
  ];
  const tenantMap = getAdminPaymentTenantMap();

  tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
  tableBody.innerHTML = state.rows.map((row) => {
    const period = getAdminPaymentPeriod(row);
    const id = getValue(row, 'id_pago_inquilino');
    const cancelled = String(row.estado || '').toLowerCase() === 'cancelado';
    return `<tr>
      <td>${escapeHtml(getValue(row, 'id_pago_inquilino') || '-')}</td>
      <td>${escapeHtml(getAdminPaymentTenantName(row, tenantMap))}</td>
      <td>${escapeHtml(getAdminPaymentHouseName(row, tenantMap))}</td>
      <td>${escapeHtml(period.start || '-')}</td>
      <td>${escapeHtml(period.end || '-')}</td>
      <td>${escapeHtml(getValue(row, 'tipo') || getValue(row, 'concepto') || '-')}</td>
      <td>${escapeHtml(formatAdminPaymentAmount(row))}</td>
      <td>${escapeHtml(getValue(row, 'comentarios') || '-')}</td>
      <td>
        <div class="row-actions">
          <button class="button small ghost" data-action="view-admin-payment" data-id="${escapeHtml(id)}" type="button">Ver</button>
          <button class="button small ghost" data-action="edit" data-id="${escapeHtml(id)}" type="button">Editar</button>
          <button class="button small ghost" data-action="cancel-admin-payment" data-id="${escapeHtml(id)}" type="button" ${cancelled ? 'disabled' : ''}>${cancelled ? 'Anulado' : 'Anular'}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  if (!state.rows.length) {
    tableBody.innerHTML = `<tr><td class="empty" colspan="${columns.length}">No hay pagos de inquilinos para mostrar.</td></tr>`;
  }

  renderAdminPaymentTotal(state.rows);
}

async function loadAdminPaymentOptions() {
  const [tenantsResult, housesResult] = await Promise.allSettled([
    request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`),
    request(`${getResourceEndpoint(resources.houses)}?page=1&limit=500&activa=1`),
  ]);

  state.adminPaymentTenantRows = tenantsResult.status === 'fulfilled' ? normalizeTenantRows(getRows(tenantsResult.value)) : [];
  state.adminPaymentHouseOptions = housesResult.status === 'fulfilled' ? getRows(housesResult.value) : [];
  renderAdminPaymentFilters();
}

async function fetchAdminPayments() {
  const params = new URLSearchParams({ page: '1', limit: '500' });
  const { q, tenant, house, concept, month, year, includeFuture } = state.adminPaymentFilters;
  if (q) params.set('q', q);
  if (tenant) params.set('id_inquilino', tenant);
  if (house) params.set('id_vivienda', house);
  if (concept) params.set('concepto', concept);
  if (month) params.set('mes', month);
  if (year) params.set('anio', year);
  if (includeFuture) params.set('include_futuros', '1');

  tableBody.innerHTML = '<tr><td class="empty" colspan="9">Cargando pagos de inquilinos...</td></tr>';
  detailPanel?.classList.add('hidden');
  const payload = await request(`${getResourceEndpoint(resources.payments)}?${params.toString()}`);
  state.rows = getRows(payload).map((row) => ({
    ...row,
    payment_key: row.payment_key || row.id_pago_inquilino,
  }));
  renderAdminPaymentFilters();
  renderAdminPaymentsTable();
}

function getAdminPaymentSelectedTenant(payment = {}) {
  return state.adminPaymentTenantRows.find((tenant) => (
    String(tenant.id_inquilino || '') === String(getValue(payment, 'id_inquilino') || '')
      && (!payment.id_vivienda || String(tenant.id_vivienda || '') === String(payment.id_vivienda))
  )) || state.adminPaymentTenantRows.find((tenant) => String(tenant.id_inquilino || '') === String(getValue(payment, 'id_inquilino') || ''));
}

function renderAdminPaymentForm(payment = {}) {
  const editing = Boolean(state.editingId);
  const selectedTenant = getAdminPaymentSelectedTenant(payment);
  const selectedTenantId = String(getValue(payment, 'id_inquilino') || selectedTenant?.id_inquilino || '');
  const selectedHouseId = String(getValue(payment, 'id_vivienda') || selectedTenant?.id_vivienda || '');
  const tenantOptions = state.adminPaymentTenantRows
    .map((tenant) => `<option value="${escapeHtml(tenant.id_inquilino)}" ${selectedTenantId === String(tenant.id_inquilino) ? 'selected' : ''}>${escapeHtml(getTenantDisplayLabel(tenant))}</option>`)
    .join('');
  const houseOptions = getAdminPaymentHouseOptions()
    .map((house) => `<option value="${escapeHtml(house.id)}" ${selectedHouseId === house.id ? 'selected' : ''}>${escapeHtml(house.label)}</option>`)
    .join('');
  const paymentDate = dateToInputValue(getValue(payment, 'fecha_pago')) || '';

  resourceForm.classList.remove('hidden');
  resourceForm.classList.remove('house-create-form', 'expense-create-form');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  detailPanel?.classList.add('hidden');

  resourceForm.innerHTML = `<h3>${editing ? 'Editar pago' : 'Nuevo pago'}</h3>
    <label>Inquilino<select name="id_inquilino" required>
      <option value="">Selecciona</option>
      ${tenantOptions}
    </select></label>
    <label>Vivienda<select name="id_vivienda" required>
      <option value="">Selecciona</option>
      ${houseOptions}
    </select></label>
    <label>Concepto<select name="tipo" required>
      ${['alquiler', 'gasto'].map((type) => `<option value="${type}" ${String(getValue(payment, 'tipo') || 'alquiler') === type ? 'selected' : ''}>${type}</option>`).join('')}
    </select></label>
    <label>Mes<input name="mes" type="number" min="1" max="12" value="${escapeHtml(getValue(payment, 'mes') || new Date().getMonth() + 1)}" required></label>
    <label>Año<input name="anio" type="number" min="2000" max="2100" value="${escapeHtml(getValue(payment, 'anio') || new Date().getFullYear())}" required></label>
    <label>Importe<input name="importe_asignado" type="number" min="0" step="0.01" value="${escapeHtml(getAdminPaymentAmount(payment) || '')}" required></label>
    <label>Importe pagado<input name="importe_pagado" type="number" min="0" step="0.01" value="${escapeHtml(getValue(payment, 'importe_pagado') || '0')}" required></label>
    <label>Estado<select name="estado">
      ${['pendiente', 'parcial', 'pagado', 'cancelado'].map((status) => `<option value="${status}" ${String(getValue(payment, 'estado') || 'pendiente') === status ? 'selected' : ''}>${status}</option>`).join('')}
    </select></label>
    <label>Fecha pago<input name="fecha_pago" type="date" value="${escapeHtml(paymentDate)}"></label>
    <label>Comentarios<textarea name="comentarios">${escapeHtml(getValue(payment, 'comentarios') || '')}</textarea></label>
    <div class="form-actions">
      <button class="button primary" type="submit">${editing ? 'Guardar' : 'Crear'}</button>
      <button class="button ghost" id="cancelEditButton" type="button">Limpiar</button>
    </div>`;
}

async function openAdminPaymentForm(payment = null) {
  await loadAdminPaymentOptions();
  state.editingId = payment ? getValue(payment, 'id_pago_inquilino') : null;
  state.resourceAction = payment ? 'update' : 'create';
  renderAdminPaymentForm(payment || {});
}

async function openAdminPaymentDetail(id) {
  if (!detailPanel) return;
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = '<p class="detail-loading">Cargando pago...</p>';
  const payment = await request(`/api/tenant-payment/${id}`);
  const period = getAdminPaymentPeriod(payment);

  detailPanel.innerHTML = `<div class="detail-header">
    <div>
      <p class="eyebrow">Pago #${escapeHtml(getValue(payment, 'id_pago_inquilino') || '-')}</p>
      <h3>${escapeHtml(getAdminPaymentTenantName(payment))}</h3>
    </div>
    <button class="detail-close-button" data-action="close-detail" type="button" aria-label="Cerrar">&times;</button>
  </div>
  ${renderDetailTable('Datos principales', [{
    ...payment,
    periodo_inicio: period.start,
    periodo_fin: period.end,
    importe: getAdminPaymentAmount(payment),
  }], [
    ['id_inquilino', 'ID inquilino'],
    ['nombre_inquilino', 'Inquilino'],
    ['nombre_vivienda', 'Vivienda'],
    ['periodo_inicio', 'Periodo inicio'],
    ['periodo_fin', 'Periodo fin'],
    ['tipo', 'Concepto'],
    ['importe', 'Importe'],
    ['importe_pagado', 'Importe pagado'],
    ['estado', 'Estado'],
    ['comentarios', 'Comentarios'],
  ])}`;
}

async function cancelAdminPayment(id) {
  const confirmed = window.confirm('¿Seguro que quieres anular este pago? Se conservará en el histórico como cancelado.');
  if (!confirmed) return;

  await request(`/api/tenant-payment/${id}`, {
    method: 'DELETE',
  });
  showToast('Pago anulado');
  await fetchAdminPayments();
}

async function submitAdminPaymentForm() {
  if (!resourceForm.checkValidity()) return;
  const data = Object.fromEntries(new FormData(resourceForm).entries());
  const selectedTenant = state.adminPaymentTenantRows.find((tenant) => (
    String(tenant.id_inquilino || '') === String(data.id_inquilino || '')
      && (!data.id_vivienda || String(tenant.id_vivienda || '') === String(data.id_vivienda))
  )) || state.adminPaymentTenantRows.find((tenant) => String(tenant.id_inquilino || '') === String(data.id_inquilino || ''));

  const payload = {
    id_inquilino: data.id_inquilino,
    id_habitacion_inquilino: selectedTenant?.id_habitacion_inquilino || null,
    tipo: data.tipo,
    concepto: data.tipo,
    mes: data.mes,
    anio: data.anio,
    importe_asignado: data.importe_asignado,
    importe_pagado: data.importe_pagado || 0,
    estado: data.estado || 'pendiente',
    fecha_pago: data.fecha_pago ? inputDateToDisplay(data.fecha_pago) : null,
    comentarios: data.comentarios || '',
  };

  await request(state.editingId ? `/api/tenant-payment/${state.editingId}` : '/api/tenant-payment', {
    method: state.editingId ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });

  showToast(state.editingId ? 'Pago actualizado' : 'Pago creado');
  state.editingId = null;
  state.resourceAction = null;
  resourceForm?.classList.add('hidden');
  await fetchAdminPayments();
}

async function loadAdminPaymentsSection() {
  if (!guardAdminMenuSection('payments')) return;

  const resource = resources.payments;
  state.activeSection = 'payments';
  state.resourceAction = null;
  state.activeResource = resource;
  state.editingId = null;
  adminView?.classList.add('hidden');
  dashboardView?.classList.add('hidden');
  statisticsView?.classList.add('hidden');
  crudView?.classList.remove('hidden');
  configView?.classList.add('hidden');
  detailPanel?.classList.add('hidden');
  resourceForm?.classList.add('hidden');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  updateResourceFilters(resource);
  expenseFilterBar?.classList.add('hidden');
  updateTenantSortFilterVisibility();

  if (searchInput) searchInput.classList.add('hidden');
  const newButton = $('#newButton');
  newButton?.classList.remove('hidden');
  if (sectionEyebrow) sectionEyebrow.textContent = 'Menú administrador';
  $('#sectionTitle').textContent = 'Pagos de inquilinos';
  $('#resourceTitle').textContent = 'Pagos de inquilinos';
  $('#resourceHint').textContent = 'Gestión básica de pagos guardados';
  adminNav?.querySelectorAll('[data-admin-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminSection === 'payments');
  });

  try {
    await loadAdminPaymentOptions();
    await fetchAdminPayments();
  } catch (error) {
    state.rows = [];
    state.adminPaymentTenantRows = [];
    state.adminPaymentHouseOptions = [];
    expenseTotal?.classList.add('hidden');
    resourceDocumentActions?.classList.add('hidden');
    tableHead.innerHTML = '<tr><th>ID pago</th><th>Inquilino</th><th>Vivienda</th><th>Periodo inicio</th><th>Periodo fin</th><th>Concepto</th><th>Importe</th><th>Comentarios</th><th>Acciones</th></tr>';
    tableBody.innerHTML = '<tr><td class="empty" colspan="9">No se pudieron cargar los pagos de inquilinos. Revisa la conexión o tu sesión de administrador.</td></tr>';
    showToast(error.message || 'No se pudieron cargar los pagos de inquilinos', 'error');
  }
}

async function loadAdminDepositsSection() {
  if (!guardAdminMenuSection('deposits')) return;

  const resource = resources.deposits;
  state.activeSection = 'deposits';
  state.resourceAction = null;
  state.activeResource = resource;
  state.editingId = null;
  adminView?.classList.add('hidden');
  dashboardView?.classList.add('hidden');
  statisticsView?.classList.add('hidden');
  crudView?.classList.remove('hidden');
  configView?.classList.add('hidden');
  detailPanel?.classList.add('hidden');
  resourceForm?.classList.add('hidden');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  updateResourceFilters(resource);
  updateTenantSortFilterVisibility();

  if (searchInput) searchInput.classList.remove('hidden');
  $('#newButton')?.classList.add('hidden');
  if (sectionEyebrow) sectionEyebrow.textContent = 'Menú administrador';
  $('#sectionTitle').textContent = 'Fianzas';
  $('#resourceTitle').textContent = 'Fianzas';
  $('#resourceHint').textContent = 'Fianzas de inquilinos';
  adminNav?.querySelectorAll('[data-admin-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminSection === 'deposits');
  });

  try {
    await loadRows();
  } catch (error) {
    state.rows = [];
    expenseTotal?.classList.add('hidden');
    resourceDocumentActions?.classList.add('hidden');
    tableHead.innerHTML = '<tr><th>Inquilino</th><th>Vivienda</th><th>Concepto</th><th>Estado</th><th>Pendiente</th><th>Fecha</th></tr>';
    tableBody.innerHTML = '<tr><td class="empty" colspan="6">No se pudieron cargar las fianzas.</td></tr>';
    showToast(error.message || 'No se pudieron cargar las fianzas', 'error');
  }
}

function getAdminExpenseDate(row) {
  return parseAppDate(row.fecha_inicio || row.fecha_fin || row.created_at);
}

function formatAdminExpenseAmount(row) {
  const amount = getValue(row, 'importe_total');
  return amount === '' || amount === null || amount === undefined ? '-' : formatMoney(amount);
}

function getAdminExpenseStatus(row = {}) {
  const status = String(getValue(row, 'estado') || '').toLowerCase();
  if (isCancelledExpense(row)) return 'cancelado';
  if (isCompletedPaymentStatus(status)) return 'pagado';
  return 'pendiente';
}

function getFilteredAdminExpenseRows(rows = state.rows) {
  const selectedStatus = state.adminExpenseFilters.status || 'pendiente';
  if (selectedStatus === 'todos') return rows;
  return rows.filter((row) => getAdminExpenseStatus(row) === selectedStatus);
}

function renderAdminExpenseFilters() {
  if (!resourceDocumentActions) return;
  const houseOptions = (state.adminExpenseHouseOptions || [])
    .map((house) => {
      const label = house.nombre || house.direccion || 'Vivienda sin nombre';
      return `<option value="${escapeHtml(house.id_vivienda)}" ${String(state.adminExpenseFilters.id_vivienda) === String(house.id_vivienda) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1)
    .map((month) => `<option value="${month}" ${String(state.adminExpenseFilters.month) === String(month) ? 'selected' : ''}>${month}</option>`)
    .join('');

  resourceDocumentActions.classList.remove('hidden');
  resourceDocumentActions.innerHTML = `
    <input class="month-filter" data-admin-expense-filter="q" type="search" placeholder="Buscar gasto" value="${escapeHtml(state.adminExpenseFilters.q)}" aria-label="Buscar por tipo, vivienda o comentario">
    <select class="month-filter" data-admin-expense-filter="id_vivienda" aria-label="Filtrar por vivienda">
      <option value="">Vivienda</option>
      ${houseOptions}
    </select>
    <select class="month-filter" data-admin-expense-filter="tipo" aria-label="Filtrar por tipo">
      <option value="">Tipo</option>
      ${['electricidad', 'agua', 'gas', 'internet', 'comunidad', 'fianza', 'otros'].map((type) => `<option value="${type}" ${state.adminExpenseFilters.tipo === type ? 'selected' : ''}>${type}</option>`).join('')}
    </select>
    <select class="month-filter" data-admin-expense-filter="month" aria-label="Filtrar por mes">
      <option value="">Mes</option>
      ${monthOptions}
    </select>
    <input class="month-filter" data-admin-expense-filter="year" type="number" min="2000" max="2100" placeholder="Año" value="${escapeHtml(state.adminExpenseFilters.year)}" aria-label="Filtrar por año">
    <select class="month-filter" data-admin-expense-filter="status" aria-label="Filtrar por estado">
      <option value="pendiente" ${state.adminExpenseFilters.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
      <option value="pagado" ${state.adminExpenseFilters.status === 'pagado' ? 'selected' : ''}>Pagado</option>
      <option value="todos" ${state.adminExpenseFilters.status === 'todos' ? 'selected' : ''}>Todos</option>
    </select>`;
}

function renderAdminExpenseTotal(rows = state.rows) {
  if (!expenseTotal) return;
  const total = rows
    .filter((row) => !isCancelledExpense(row))
    .reduce((sum, row) => sum + parseMoneyValue(getValue(row, 'importe_total')), 0);
  expenseTotal.classList.remove('hidden');
  expenseTotal.innerHTML = `<span>Total gastos filtrados</span><strong>${formatExpenseTotal(total)}</strong>`;
}

function renderAdminExpensesTable() {
  const rows = getFilteredAdminExpenseRows(state.rows);
  const columns = [
    'ID gasto',
    'Vivienda',
    'Tipo',
    'Fecha inicio',
    'Fecha fin',
    'Importe total',
    'Estado',
    'Acciones',
  ];

  tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
  tableBody.innerHTML = rows.map((row) => {
    const id = getValue(row, 'id_gasto');
    const cancelled = isCancelledExpense(row);
    const expenseStatus = getAdminExpenseStatus(row);
    const rowClass = [
      cancelled ? 'cancelled-expense-row' : '',
      expenseStatus === 'pagado' ? 'completed-payment-row' : '',
    ].filter(Boolean).join(' ');
    return `<tr class="${escapeHtml(rowClass)}">
    <td>${escapeHtml(getValue(row, 'id_gasto') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'nombre_vivienda') || getValue(row, 'id_vivienda') || '-')}</td>
    <td>${escapeHtml(getValue(row, 'tipo') || '-')}</td>
    <td>${escapeHtml(formatDisplayValue('fecha_inicio', getValue(row, 'fecha_inicio')) || '-')}</td>
    <td>${escapeHtml(formatDisplayValue('fecha_fin', getValue(row, 'fecha_fin')) || '-')}</td>
    <td>${escapeHtml(formatAdminExpenseAmount(row))}</td>
    <td>${escapeHtml(expenseStatus === 'pagado' ? 'Pagado' : expenseStatus === 'cancelado' ? 'Cancelado' : 'Pendiente')}</td>
    <td>
      <div class="row-actions">
        <button class="button small ghost" data-action="view-admin-expense" data-id="${escapeHtml(id)}" type="button">Ver</button>
        <button class="button small ghost" data-action="edit" data-id="${escapeHtml(id)}" type="button">Editar</button>
        <button class="button small ghost" data-action="cancel-admin-expense" data-id="${escapeHtml(id)}" type="button" ${cancelled ? 'disabled' : ''}>${cancelled ? 'Anulado' : 'Anular'}</button>
      </div>
    </td>
  </tr>`;
  }).join('');

  if (!rows.length) {
    tableBody.innerHTML = `<tr><td class="empty" colspan="${columns.length}">No hay gastos para mostrar.</td></tr>`;
  }

  renderAdminExpenseTotal(rows);
}

async function loadAdminExpenseHouseOptions() {
  const payload = await request('/api/house?page=1&limit=500&activa=1');
  state.adminExpenseHouseOptions = getRows(payload);
  renderAdminExpenseFilters();
  return state.adminExpenseHouseOptions;
}

async function fetchAdminExpenses() {
  const params = new URLSearchParams({ page: '1', limit: '500' });
  const { q, id_vivienda, tipo, month, year } = state.adminExpenseFilters;
  if (q) params.set('q', q);
  if (id_vivienda) params.set('id_vivienda', id_vivienda);
  if (tipo) params.set('tipo', tipo);
  if (month) params.set('mes', month);
  if (year) params.set('anio', year);

  tableBody.innerHTML = '<tr><td class="empty" colspan="7">Cargando gastos...</td></tr>';
  detailPanel?.classList.add('hidden');
  const payload = await request(`${getResourceEndpoint(resources.expenses)}?${params.toString()}`);
  state.rows = getRows(payload);
  renderAdminExpensesTable();
}

function renderAdminExpenseForm(expense = {}) {
  const editing = Boolean(state.editingId);
  const selectedHouseId = String(getValue(expense, 'id_vivienda') || '');
  const houseOptions = (state.adminExpenseHouseOptions || [])
    .map((house) => {
      const label = house.nombre || house.direccion || 'Vivienda sin nombre';
      return `<option value="${escapeHtml(house.id_vivienda)}" ${selectedHouseId === String(house.id_vivienda) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');

  resourceForm.classList.remove('hidden');
  resourceForm.classList.remove('house-create-form', 'expense-create-form');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  detailPanel?.classList.add('hidden');

  resourceForm.innerHTML = `<h3>${editing ? 'Editar gasto' : 'Nuevo gasto'}</h3>
    <label>Vivienda<select name="id_vivienda" required>
      <option value="">Selecciona</option>
      ${houseOptions}
    </select></label>
    <label>Tipo<select name="tipo" required>
      ${['electricidad', 'agua', 'gas', 'internet', 'comunidad', 'fianza', 'otros'].map((type) => `<option value="${type}" ${String(getValue(expense, 'tipo') || 'otros') === type ? 'selected' : ''}>${type}</option>`).join('')}
    </select></label>
    <label>Fecha inicio<input name="fecha_inicio" type="date" value="${escapeHtml(dateToInputValue(getValue(expense, 'fecha_inicio')) || todayInputValue())}" required></label>
    <label>Fecha fin<input name="fecha_fin" type="date" value="${escapeHtml(dateToInputValue(getValue(expense, 'fecha_fin')) || todayInputValue())}" required></label>
    <label>Importe total<input name="importe_total" type="number" min="0.01" step="0.01" value="${escapeHtml(getValue(expense, 'importe_total') || '')}" required></label>
    <label>Comentarios<textarea name="descripcion">${escapeHtml(getValue(expense, 'descripcion') || '')}</textarea></label>
    <label>Estado<select name="estado">
      ${['pendiente', 'repartido', 'pagado', 'cancelado'].map((status) => `<option value="${status}" ${String(getValue(expense, 'estado') || 'pendiente') === status ? 'selected' : ''}>${status}</option>`).join('')}
    </select></label>
    <div class="form-actions">
      <button class="button primary" type="submit">${editing ? 'Guardar' : 'Crear'}</button>
      <button class="button ghost" id="cancelEditButton" type="button">Limpiar</button>
    </div>`;
}

async function openAdminExpenseForm(expense = null) {
  await loadAdminExpenseHouseOptions();
  state.editingId = expense ? getValue(expense, 'id_gasto') : null;
  state.resourceAction = expense ? 'update' : 'create';
  renderAdminExpenseForm(expense || {});
}

async function openAdminExpenseDetail(id) {
  if (!detailPanel) return;
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = '<p class="detail-loading">Cargando gasto...</p>';
  const expense = await request(`/api/tenant-expense/${id}`);

  detailPanel.innerHTML = `<div class="detail-header">
    <div>
      <p class="eyebrow">Gasto #${escapeHtml(getValue(expense, 'id_gasto') || '-')}</p>
      <h3>${escapeHtml(getValue(expense, 'nombre_vivienda') || getValue(expense, 'id_vivienda') || 'Gasto')}</h3>
    </div>
    <button class="detail-close-button" data-action="close-detail" type="button" aria-label="Cerrar">&times;</button>
  </div>
  ${renderDetailTable('Datos principales', [expense], [
    ['nombre_vivienda', 'Vivienda'],
    ['tipo', 'Tipo'],
    ['fecha_inicio', 'Fecha inicio'],
    ['fecha_fin', 'Fecha fin'],
    ['importe_total', 'Importe total'],
    ['descripcion', 'Comentarios'],
    ['estado', 'Estado'],
    ['created_at', 'Creado'],
    ['updated_at', 'Actualizado'],
  ])}`;
}

async function cancelAdminExpense(id) {
  const confirmed = window.confirm('¿Seguro que quieres anular este gasto? Se conservará en el histórico como cancelado.');
  if (!confirmed) return;

  await request(`/api/tenant-expense/${id}`, {
    method: 'DELETE',
  });
  showToast('Gasto anulado');
  await fetchAdminExpenses();
}

async function submitAdminExpenseForm() {
  if (!resourceForm.checkValidity()) return;
  const data = Object.fromEntries(new FormData(resourceForm).entries());
  const payload = {
    id_vivienda: data.id_vivienda,
    tipo: data.tipo,
    fecha_inicio: inputDateToDisplay(data.fecha_inicio),
    fecha_fin: inputDateToDisplay(data.fecha_fin),
    importe_total: data.importe_total,
    descripcion: data.descripcion || '',
    estado: data.estado || 'pendiente',
    gasto_de: 'vivienda',
  };

  await request(state.editingId ? `/api/tenant-expense/${state.editingId}` : '/api/tenant-expense', {
    method: state.editingId ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });

  showToast(state.editingId ? 'Gasto actualizado' : 'Gasto creado');
  state.editingId = null;
  state.resourceAction = null;
  resourceForm?.classList.add('hidden');
  await fetchAdminExpenses();
}

async function loadAdminExpensesSection() {
  if (!guardAdminMenuSection('expenses')) return;

  const resource = resources.expenses;
  state.activeSection = 'expenses';
  state.resourceAction = null;
  state.activeResource = resource;
  state.editingId = null;
  adminView?.classList.add('hidden');
  dashboardView?.classList.add('hidden');
  statisticsView?.classList.add('hidden');
  crudView?.classList.remove('hidden');
  configView?.classList.add('hidden');
  detailPanel?.classList.add('hidden');
  resourceForm?.classList.add('hidden');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  updateResourceFilters(resource);
  expenseFilterBar?.classList.add('hidden');
  updateTenantSortFilterVisibility();

  if (searchInput) searchInput.classList.add('hidden');
  const newButton = $('#newButton');
  newButton?.classList.remove('hidden');
  if (sectionEyebrow) sectionEyebrow.textContent = 'Menú administrador';
  $('#sectionTitle').textContent = 'Gastos';
  $('#resourceTitle').textContent = 'Gastos';
  $('#resourceHint').textContent = 'Gestión básica de gastos';
  adminNav?.querySelectorAll('[data-admin-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminSection === 'expenses');
  });

  try {
    await loadAdminExpenseHouseOptions();
    await fetchAdminExpenses();
  } catch (error) {
    state.rows = [];
    expenseTotal?.classList.add('hidden');
    resourceDocumentActions?.classList.add('hidden');
    tableHead.innerHTML = '<tr><th>ID gasto</th><th>Vivienda</th><th>Tipo</th><th>Fecha inicio</th><th>Fecha fin</th><th>Importe total</th><th>Acciones</th></tr>';
    tableBody.innerHTML = '<tr><td class="empty" colspan="7">No se pudieron cargar los gastos. Revisa la conexión o tu sesión de administrador.</td></tr>';
    showToast(error.message || 'No se pudieron cargar los gastos', 'error');
  }
}

function getAdminLiquidationPeriod(row) {
  const month = Number(row.mes || 0);
  const year = Number(row.anio || 0);
  if (!month || !year) return { start: '', end: '' };
  const range = getMonthRange(year, month);
  return {
    start: formatDisplayValue('fecha_inicio', range.start),
    end: formatDisplayValue('fecha_fin', range.end),
  };
}

function formatAdminLiquidationAmount(value) {
  return value === '' || value === null || value === undefined ? '-' : formatMoney(value);
}

function getAdminLiquidationOwnerName(row = {}) {
  return [row.nombre_propietario, row.apellido1, row.apellido2].filter(Boolean).join(' ')
    || row.id_propietario
    || '-';
}

function renderAdminLiquidationFilters() {
  if (!resourceDocumentActions) return;
  const houseOptions = (state.adminLiquidationHouseOptions || [])
    .map((house) => {
      const label = house.nombre || house.direccion || 'Vivienda sin nombre';
      return `<option value="${escapeHtml(house.id_vivienda)}" ${String(state.adminLiquidationFilters.id_vivienda) === String(house.id_vivienda) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');
  const ownerOptions = (state.adminLiquidationOwnerOptions || [])
    .map((owner) => {
      const label = getOwnerFullName(owner) || owner.email || 'Propietario sin nombre';
      return `<option value="${escapeHtml(owner.id_propietario)}" ${String(state.adminLiquidationFilters.id_propietario) === String(owner.id_propietario) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');
  const monthOptions = Array.from({ length: 12 }, (_, index) => index + 1)
    .map((month) => `<option value="${month}" ${String(state.adminLiquidationFilters.month) === String(month) ? 'selected' : ''}>${month}</option>`)
    .join('');

  resourceDocumentActions.classList.remove('hidden');
  resourceDocumentActions.innerHTML = `
    <input class="month-filter" data-admin-liquidation-filter="q" type="search" placeholder="Buscar liquidación" value="${escapeHtml(state.adminLiquidationFilters.q)}" aria-label="Buscar por vivienda, propietario o periodo">
    <select class="month-filter" data-admin-liquidation-filter="id_vivienda" aria-label="Filtrar por vivienda">
      <option value="">Vivienda</option>
      ${houseOptions}
    </select>
    <select class="month-filter" data-admin-liquidation-filter="id_propietario" aria-label="Filtrar por propietario">
      <option value="">Propietario</option>
      ${ownerOptions}
    </select>
    <select class="month-filter" data-admin-liquidation-filter="month" aria-label="Filtrar por mes">
      <option value="">Mes</option>
      ${monthOptions}
    </select>
    <input class="month-filter" data-admin-liquidation-filter="year" type="number" min="2000" max="2100" placeholder="Año" value="${escapeHtml(state.adminLiquidationFilters.year)}" aria-label="Filtrar por año">
    <select class="month-filter" data-admin-liquidation-filter="estado" aria-label="Filtrar por estado">
      <option value="">Activas</option>
      <option value="activa" ${state.adminLiquidationFilters.estado === 'activa' ? 'selected' : ''}>Activas</option>
      <option value="cancelada" ${state.adminLiquidationFilters.estado === 'cancelada' ? 'selected' : ''}>Canceladas</option>
    </select>
    <button class="button small ghost" data-action="generate-admin-liquidation" type="button">Generar liquidación</button>`;
}

function renderAdminLiquidationTotals(rows = state.rows) {
  if (!expenseTotal) return;
  const totals = rows
    .filter((row) => String(getValue(row, 'estado') || 'activa').toLowerCase() !== 'cancelada')
    .reduce((acc, row) => {
      acc.income += parseMoneyValue(getValue(row, 'ingresos_alquiler'));
      acc.expenses += parseMoneyValue(getLiquidationExpensesTotal(row));
      acc.benefit += parseMoneyValue(getValue(row, 'beneficio'));
      return acc;
    }, { income: 0, expenses: 0, benefit: 0 });
  expenseTotal.classList.remove('hidden');
  expenseTotal.innerHTML = `<span>Totales filtrados</span><strong>Ingresos ${formatExpenseTotal(totals.income)} · Gastos ${formatExpenseTotal(totals.expenses)} · Beneficio ${formatExpenseTotal(totals.benefit)}</strong>`;
}

function renderAdminLiquidationsTable() {
  const columns = [
    'ID liquidación',
    'Vivienda',
    'Propietario',
    'Periodo inicio',
    'Periodo fin',
    'Ingresos',
    'Gastos',
    'Beneficio',
    'Estado',
    'Acciones',
  ];

  tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>`;
  tableBody.innerHTML = state.rows.map((row) => {
    const id = getValue(row, 'id_liquidacion');
    const period = getAdminLiquidationPeriod(row);
    const cancelled = String(getValue(row, 'estado') || 'activa').toLowerCase() === 'cancelada';
    return `<tr>
      <td>${escapeHtml(getValue(row, 'id_liquidacion') || '-')}</td>
      <td>${escapeHtml(getValue(row, 'nombre_vivienda') || getValue(row, 'id_vivienda') || '-')}</td>
      <td>${escapeHtml(getAdminLiquidationOwnerName(row))}</td>
      <td>${escapeHtml(period.start || '-')}</td>
      <td>${escapeHtml(period.end || '-')}</td>
      <td>${escapeHtml(formatAdminLiquidationAmount(getValue(row, 'ingresos_alquiler')))}</td>
      <td>${escapeHtml(formatAdminLiquidationAmount(getLiquidationExpensesTotal(row)))}</td>
      <td>${escapeHtml(formatAdminLiquidationAmount(getValue(row, 'beneficio')))}</td>
      <td>${cancelled ? 'Cancelada' : 'Activa'}</td>
      <td>
        <div class="row-actions">
          <button class="button small ghost" data-action="view-admin-liquidation" data-id="${escapeHtml(id)}" type="button">Ver</button>
          <button class="button small ghost" data-action="edit" data-id="${escapeHtml(id)}" type="button">Editar</button>
          <button class="button small ghost" data-action="toggle-admin-liquidation-state" data-id="${escapeHtml(id)}" data-state="${cancelled ? 'cancelada' : 'activa'}" type="button">${cancelled ? 'Reactivar' : 'Cancelar'}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  if (!state.rows.length) {
    tableBody.innerHTML = `<tr><td class="empty" colspan="${columns.length}">No hay liquidaciones para mostrar.</td></tr>`;
  }

  renderAdminLiquidationTotals(state.rows);
}

async function loadAdminLiquidationOptions() {
  const [housesPayload, ownersPayload] = await Promise.all([
    request('/api/house?page=1&limit=500&activa=1'),
    request('/api/owner?page=1&limit=500&activo=1'),
  ]);
  state.adminLiquidationHouseOptions = getRows(housesPayload);
  state.adminLiquidationOwnerOptions = getRows(ownersPayload);
  renderAdminLiquidationFilters();
}

async function fetchAdminLiquidations() {
  const params = new URLSearchParams({ page: '1', limit: '500' });
  const { q, id_vivienda, id_propietario, month, year, estado } = state.adminLiquidationFilters;
  if (q) params.set('q', q);
  if (id_vivienda) params.set('id_vivienda', id_vivienda);
  if (id_propietario) params.set('id_propietario', id_propietario);
  if (month) params.set('mes', month);
  if (year) params.set('anio', year);
  if (estado) params.set('estado', estado);

  tableBody.innerHTML = '<tr><td class="empty" colspan="10">Cargando liquidaciones...</td></tr>';
  detailPanel?.classList.add('hidden');
  const payload = await request(`${getResourceEndpoint(resources.ownerLiquidations)}?${params.toString()}`);
  state.rows = getRows(payload);
  renderAdminLiquidationsTable();
}

function renderAdminLiquidationForm(liquidation = {}) {
  const editing = Boolean(state.editingId);
  const selectedHouseId = String(getValue(liquidation, 'id_vivienda') || '');
  const selectedOwnerId = String(getValue(liquidation, 'id_propietario') || '');
  const houseOptions = (state.adminLiquidationHouseOptions || [])
    .map((house) => {
      const label = house.nombre || house.direccion || 'Vivienda sin nombre';
      return `<option value="${escapeHtml(house.id_vivienda)}" ${selectedHouseId === String(house.id_vivienda) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');
  const ownerOptions = (state.adminLiquidationOwnerOptions || [])
    .map((owner) => {
      const label = getOwnerFullName(owner) || owner.email || 'Propietario sin nombre';
      return `<option value="${escapeHtml(owner.id_propietario)}" ${selectedOwnerId === String(owner.id_propietario) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    })
    .join('');

  resourceForm.classList.remove('hidden');
  resourceForm.classList.remove('house-create-form', 'expense-create-form');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  detailPanel?.classList.add('hidden');

  resourceForm.innerHTML = `<h3>${editing ? 'Editar liquidación' : 'Nueva liquidación'}</h3>
    <label>Vivienda<select name="id_vivienda" required>
      <option value="">Selecciona</option>
      ${houseOptions}
    </select></label>
    <label>Propietario<select name="id_propietario" required>
      <option value="">Selecciona</option>
      ${ownerOptions}
    </select></label>
    <label>Mes<input name="mes" type="number" min="1" max="12" value="${escapeHtml(getValue(liquidation, 'mes') || '')}" required></label>
    <label>Año<input name="anio" type="number" min="2000" max="2100" value="${escapeHtml(getValue(liquidation, 'anio') || new Date().getFullYear())}" required></label>
    <label>Ingresos<input name="ingresos_alquiler" type="number" step="0.01" value="${escapeHtml(getValue(liquidation, 'ingresos_alquiler') || '0')}" required></label>
    <label>Gastos vivienda<input name="gastos_vivienda" type="number" min="0" step="0.01" value="${escapeHtml(getValue(liquidation, 'gastos_vivienda') || '0')}" required></label>
    <label>Gastos recuperados<input name="gastos_recuperados" type="number" min="0" step="0.01" value="${escapeHtml(getValue(liquidation, 'gastos_recuperados') || '0')}" required></label>
    <label>Pagos pendientes<input name="pagos_pendientes" type="number" min="0" step="0.01" value="${escapeHtml(getValue(liquidation, 'pagos_pendientes') || '0')}" required></label>
    <label>Beneficio<input name="beneficio" type="number" step="0.01" value="${escapeHtml(getValue(liquidation, 'beneficio') || '')}" required></label>
    <label>Porcentaje propiedad<input name="porcentaje_propiedad" type="number" min="0" max="100" step="0.01" value="${escapeHtml(getValue(liquidation, 'porcentaje_propiedad') || '100')}" required></label>
    <label>Importe propietario<input name="importe_propietario" type="number" min="0" step="0.01" value="${escapeHtml(getValue(liquidation, 'importe_propietario') || '0')}" required></label>
    <label>Estado<select name="estado">
      ${['activa', 'cancelada'].map((status) => `<option value="${status}" ${String(getValue(liquidation, 'estado') || 'activa') === status ? 'selected' : ''}>${status}</option>`).join('')}
    </select></label>
    <div class="form-actions">
      <button class="button primary" type="submit">${editing ? 'Guardar' : 'Crear'}</button>
      <button class="button ghost" id="cancelEditButton" type="button">Limpiar</button>
    </div>`;
}

async function openAdminLiquidationForm(liquidation = null) {
  await loadAdminLiquidationOptions();
  state.editingId = liquidation ? getValue(liquidation, 'id_liquidacion') : null;
  state.resourceAction = liquidation ? 'update' : 'create';
  renderAdminLiquidationForm(liquidation || {});
}

async function openAdminLiquidationDetail(id) {
  if (!detailPanel) return;
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = '<p class="detail-loading">Cargando liquidación...</p>';
  const liquidation = await request(`/api/owner-liquidation/${id}`);
  const period = getAdminLiquidationPeriod(liquidation);

  detailPanel.innerHTML = `<div class="detail-header">
    <div>
      <p class="eyebrow">Liquidación #${escapeHtml(getValue(liquidation, 'id_liquidacion') || '-')}</p>
      <h3>${escapeHtml(getValue(liquidation, 'nombre_vivienda') || getValue(liquidation, 'id_vivienda') || 'Liquidación')}</h3>
    </div>
    <button class="detail-close-button" data-action="close-detail" type="button" aria-label="Cerrar">&times;</button>
  </div>
  ${renderDetailTable('Datos principales', [{
    ...liquidation,
    propietario: getAdminLiquidationOwnerName(liquidation),
    periodo_inicio: period.start || '-',
    periodo_fin: period.end || '-',
    gastos: getLiquidationExpensesTotal(liquidation),
    estado_logico: String(getValue(liquidation, 'estado') || 'activa').toLowerCase() === 'cancelada' ? 'Cancelada' : 'Activa',
  }], [
    ['nombre_vivienda', 'Vivienda'],
    ['propietario', 'Propietario'],
    ['periodo_inicio', 'Periodo inicio'],
    ['periodo_fin', 'Periodo fin'],
    ['ingresos_alquiler', 'Ingresos'],
    ['gastos', 'Gastos'],
    ['beneficio', 'Beneficio'],
    ['importe_propietario', 'Importe propietario'],
    ['estado_logico', 'Estado'],
    ['created_at', 'Creado'],
    ['updated_at', 'Actualizado'],
  ])}`;
}

async function toggleAdminLiquidationState(id, currentState) {
  const nextState = currentState === 'cancelada' ? 'activa' : 'cancelada';
  const confirmed = window.confirm(nextState === 'cancelada' ? '¿Cancelar esta liquidación?' : '¿Reactivar esta liquidación?');
  if (!confirmed) return;

  await request(`/api/owner-liquidation/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: nextState }),
  });
  showToast(nextState === 'cancelada' ? 'Liquidación cancelada' : 'Liquidación reactivada');
  await fetchAdminLiquidations();
}

function renderAdminLiquidationGenerationForm() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const houseOptions = (state.adminLiquidationHouseOptions || [])
    .map((house) => {
      const label = house.nombre || house.direccion || 'Vivienda sin nombre';
      return `<option value="${escapeHtml(house.id_vivienda)}">${escapeHtml(label)}</option>`;
    })
    .join('');

  state.editingId = null;
  state.resourceAction = 'generate';
  resourceForm.classList.remove('hidden');
  resourceForm.classList.remove('house-create-form', 'expense-create-form');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  detailPanel?.classList.add('hidden');

  resourceForm.innerHTML = `<h3>Generar liquidación</h3>
    <label>Vivienda<select name="id_vivienda" required>
      <option value="">Selecciona</option>
      ${houseOptions}
    </select></label>
    <label>Mes<input name="mes" type="number" min="1" max="12" value="${escapeHtml(currentMonth)}" required></label>
    <label>Año<input name="anio" type="number" min="2000" max="2100" value="${escapeHtml(currentYear)}" required></label>
    <div class="form-actions">
      <button class="button primary" type="submit">Generar</button>
      <button class="button ghost" id="cancelEditButton" type="button">Limpiar</button>
    </div>`;
}

function renderAdminLiquidationGenerationResult(result = {}) {
  if (!detailPanel) return;
  const summary = result.resumen || {};
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = `<div class="detail-header">
    <div>
      <p class="eyebrow">Liquidación generada</p>
      <h3>${escapeHtml(result.msg || 'Resultado')}</h3>
    </div>
    <button class="detail-close-button" data-action="close-detail" type="button" aria-label="Cerrar">&times;</button>
  </div>
  ${renderDetailTable('Resumen', [summary], [
    ['periodo_inicio', 'Periodo inicio'],
    ['periodo_fin', 'Periodo fin'],
    ['ingresos', 'Ingresos'],
    ['gastos', 'Gastos'],
    ['beneficio', 'Beneficio'],
  ])}`;
}

async function submitAdminLiquidationGenerationForm() {
  if (!resourceForm.checkValidity()) return;
  const data = Object.fromEntries(new FormData(resourceForm).entries());
  const confirmed = window.confirm('Si ya existe una liquidación para esa vivienda y periodo, se recalculará. ¿Continuar?');
  if (!confirmed) return;

  const result = await request('/api/owner-liquidation/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  showToast(result?.msg || 'Liquidación generada');
  state.resourceAction = null;
  resourceForm?.classList.add('hidden');
  await fetchAdminLiquidations();
  renderAdminLiquidationGenerationResult(result);
}

async function submitAdminLiquidationForm() {
  if (!resourceForm.checkValidity()) return;
  if (state.resourceAction === 'generate') {
    await submitAdminLiquidationGenerationForm();
    return;
  }
  const data = Object.fromEntries(new FormData(resourceForm).entries());

  await request(state.editingId ? `/api/owner-liquidation/${state.editingId}` : '/api/owner-liquidation', {
    method: state.editingId ? 'PUT' : 'POST',
    body: JSON.stringify(data),
  });

  showToast(state.editingId ? 'Liquidación actualizada' : 'Liquidación creada');
  state.editingId = null;
  state.resourceAction = null;
  resourceForm?.classList.add('hidden');
  await fetchAdminLiquidations();
}

async function loadAdminLiquidationsSection() {
  if (!guardAdminMenuSection('liquidations')) return;

  const resource = resources.ownerLiquidations;
  state.activeSection = 'liquidations';
  state.resourceAction = null;
  state.activeResource = resource;
  state.editingId = null;
  adminView?.classList.add('hidden');
  dashboardView?.classList.add('hidden');
  statisticsView?.classList.add('hidden');
  crudView?.classList.remove('hidden');
  configView?.classList.add('hidden');
  detailPanel?.classList.add('hidden');
  resourceForm?.classList.add('hidden');
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout', 'house-list-layout');
  updateResourceFilters(resource);
  accountingPeriodFilter?.classList.add('hidden');
  expenseFilterBar?.classList.add('hidden');
  updateTenantSortFilterVisibility();

  if (searchInput) searchInput.classList.add('hidden');
  const newButton = $('#newButton');
  newButton?.classList.remove('hidden');
  if (sectionEyebrow) sectionEyebrow.textContent = 'Menú administrador';
  $('#sectionTitle').textContent = 'Liquidaciones propietarios';
  $('#resourceTitle').textContent = 'Liquidaciones propietarios';
  $('#resourceHint').textContent = 'Gestión básica de liquidaciones guardadas';
  adminNav?.querySelectorAll('[data-admin-section]').forEach((button) => {
    button.classList.toggle('active', button.dataset.adminSection === 'liquidations');
  });

  try {
    await loadAdminLiquidationOptions();
    await fetchAdminLiquidations();
  } catch (error) {
    state.rows = [];
    expenseTotal?.classList.add('hidden');
    resourceDocumentActions?.classList.add('hidden');
    tableHead.innerHTML = '<tr><th>ID liquidación</th><th>Vivienda</th><th>Propietario</th><th>Periodo inicio</th><th>Periodo fin</th><th>Ingresos</th><th>Gastos</th><th>Beneficio</th><th>Estado</th><th>Acciones</th></tr>';
    tableBody.innerHTML = '<tr><td class="empty" colspan="10">No se pudieron cargar las liquidaciones. Revisa la conexión o tu sesión de administrador.</td></tr>';
    showToast(error.message || 'No se pudieron cargar las liquidaciones', 'error');
  }
}

function showToast(message, type = 'info') {
  if (!toast) {
    console[type === 'error' ? 'error' : 'log'](message);
    return;
  }
  toast.textContent = message;
  toast.className = `toast show ${type === 'error' ? 'error' : ''}`;
  window.setTimeout(() => toast.className = 'toast', 3200);
}

function normalizeBase(base) {
  return (base || DEFAULT_API_BASE).trim().replace(/\/$/, '');
}

function buildUrl(path) {
  const base = normalizeBase(state.apiBase);
  if (base.endsWith('.php')) {
    return `${base}?path=${encodeURIComponent(path)}`;
  }
  return `${base}${path}`;
}

function buildStaticFileUrl(path, version = '') {
  if (!path) return '';
  const suffix = version ? `?v=${encodeURIComponent(version)}` : `?v=${Date.now()}`;
  return `/mijornalrooms/${path}${suffix}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const dateFields = new Set([
  'fecha_entrada',
  'fecha_salida',
  'fecha',
  'fecha_inicio',
  'fecha_fin',
  'fecha_recibo',
  'fecha_pago',
  'fecha_fianza',
  'fecha_cobro',
  'fecha_devolucion',
  'created_at',
  'updated_at',
]);

function formatDateDisplay(value) {
  if (!value) return value;
  if (String(value).match(/^\d{2}-\d{2}-\d{4}(,\s*\d{2}-\d{2}-\d{4})*$/)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${date.getFullYear()}`;
}

function formatDateTimeDisplay(value) {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
}

function formatDisplayValue(key, value) {
  if (dateFields.has(key)) return formatDateDisplay(value);
  if (key === 'activa') {
    return Number(value) === 1 || value === true || String(value).toLowerCase() === 'true' ? 'Sí' : 'No';
  }
  return value;
}

function formatTableValue(resource, row, column) {
  if (resource === resources.ownerExpenses && column === 'gasto_de') {
    const target = String(row.gasto_de_value || row.gasto_de || '').toLowerCase();
    if (target === 'inquilino') {
      return [row.nombre_inquilino || row.nombre, row.apellido1_inquilino || row.apellido1]
        .filter(Boolean)
        .join(' ')
        || row.gasto_de
        || '';
    }
    if (target === 'vivienda') return row.nombre_vivienda || row.gasto_de || '';
    if (target === 'propietario') return 'Propietario';
  }
  if (resource === resources.ownerExpenses && column === 'fecha') {
    const start = formatDateDisplay(row.fecha_inicio || row.fecha);
    const end = formatDateDisplay(row.fecha_fin);
    if (start && end && start !== end) return `${start} - ${end}`;
    return start || end || '';
  }
  return isPaymentResource(resource)
    ? formatPaymentListValue(column, getValue(row, column))
    : formatDisplayValue(column, getValue(row, column));
}

function formatPaymentListValue(key, value) {
  if (key === 'estado_pago') {
    const status = String(value || '').toLowerCase();
    if (status === 'pendientes') return 'Pendiente';
    if (status === 'completados') return 'Pagado';
  }
  if (key === 'concepto') return normalizeFirstUpperRestLower(value);
  return formatDisplayValue(key, value);
}

function formatColumnTitle(column) {
  if (column === 'estado_pago') return 'Estado';
  if (column === 'importe_pendiente') return 'Pendiente';
  if (column === 'nombre_vivienda') return 'Vivienda';
  if (column === 'numero_camas') return 'Número de camas';
  if (column === 'camas_libres') return 'Camas libres';
  const title = String(column || '').replace(/_/g, ' ').trim().toLowerCase();
  return escapeHtml(title ? `${title.charAt(0).toUpperCase()}${title.slice(1)}` : '');
}

function normalizeFirstUpperRestLower(value) {
  const text = String(value || '').trim().toLowerCase();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : '';
}

function normalizeCaseFields(root = resourceForm) {
  root?.querySelectorAll('[data-normalize-case="first-upper"]').forEach((field) => {
    field.value = normalizeFirstUpperRestLower(field.value);
  });
}

function getUserDisplayName() {
  return [state.user?.nombre, state.user?.apellido1, state.user?.apellido2]
    .filter(Boolean)
    .join(' ')
    || state.user?.email
    || getCurrentRole();
}

function getUserInitials() {
  const source = [state.user?.nombre, state.user?.apellido1].filter(Boolean);
  const initials = source.length
    ? source.map((part) => part[0]).join('')
    : String(state.user?.email || getCurrentRole()).slice(0, 2);

  return initials.toUpperCase();
}

function getAvatarUrl() {
  if (!state.user?.avatar_archivo) return '';
  return buildStaticFileUrl(state.user.avatar_archivo, state.user.updated_at || state.user.avatar_archivo);
}

async function loadUserAvatarInto(element, userId, imageClass = '', avatarPath = '') {
  if (!element || !userId || !avatarPath) return false;

  const headers = new Headers();
  if (state.token) headers.set('Authorization', `Bearer ${state.token}`);
  const response = await fetch(buildUrl(`/api/user/${userId}/avatar?v=${Date.now()}`), { headers });
  if (!response.ok) return false;

  const blob = await response.blob();
  const nextUrl = URL.createObjectURL(blob);
  const previousUrl = avatarObjectUrls.get(element);
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  avatarObjectUrls.set(element, nextUrl);
  if (element.tagName === 'IMG') {
    element.src = nextUrl;
  } else {
    element.innerHTML = `<img${imageClass ? ` class="${escapeHtml(imageClass)}"` : ''} src="${nextUrl}" alt="">`;
  }
  return true;
}

function renderUserBadge(logged) {
  if (!roleBadge) return;

  if (!logged) {
    state.userMenuOpen = false;
    roleBadge.innerHTML = '';
    return;
  }

  const avatarUrl = getAvatarUrl();
  const name = escapeHtml(getUserDisplayName());
  const fallback = escapeHtml(getUserInitials());
  roleBadge.innerHTML = `<div class="user-menu">
    <button class="user-chip" data-action="toggle-user-menu" type="button" aria-haspopup="menu" aria-expanded="${state.userMenuOpen}">
      ${avatarUrl ? `<img class="user-avatar" src="${escapeHtml(avatarUrl)}" alt="">` : `<span class="user-avatar fallback">${fallback}</span>`}
      <span>${name}</span>
    </button>
    <div class="user-menu-popover ${state.userMenuOpen ? '' : 'hidden'}" role="menu">
      <button class="user-menu-item danger" data-action="logout-user-menu" type="button" role="menuitem">Cerrar sesión</button>
    </div>
  </div>`;
  const avatarElement = roleBadge.querySelector('.user-avatar');
  loadUserAvatarInto(avatarElement, state.user?.id_usuario, '', state.user?.avatar_archivo).catch(() => {});
}

async function request(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (state.token) headers.set('Authorization', `Bearer ${state.token}`);

  const response = await fetch(buildUrl(path), { ...options, headers });
  if (response.status === 401 && retry && state.refreshToken) {
    const refreshed = await refreshToken();
    if (refreshed) return request(path, options, false);
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(data?.msg || data?.error || `Error ${response.status}`);
  }

  return data;
}

async function downloadFile(path, fallbackName) {
  const headers = new Headers();
  if (state.token) headers.set('Authorization', `Bearer ${state.token}`);

  const response = await fetch(buildUrl(path), { headers });
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    throw new Error(data?.msg || data?.error || `Error ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const fileName = match?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function previewFile(path, title = 'Documento') {
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    throw new Error('El navegador ha bloqueado la ventana de vista previa');
  }

  previewWindow.document.title = title;
  previewWindow.document.body.innerHTML = '<p style="font-family: system-ui, sans-serif; padding: 24px;">Cargando documento...</p>';

  const headers = new Headers();
  if (state.token) headers.set('Authorization', `Bearer ${state.token}`);

  const response = await fetch(buildUrl(path), { headers });
  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    previewWindow.close();
    throw new Error(data?.msg || data?.error || `Error ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  previewWindow.location.href = url;
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function refreshToken() {
  try {
    const response = await fetch(buildUrl('/api/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: state.refreshToken }),
    });
    if (!response.ok) return false;
    setSession(await response.json());
    return true;
  } catch {
    return false;
  }
}

function getRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.tenants)) return payload.tenants;
  if (Array.isArray(payload?.owners)) return payload.owners;
  if (Array.isArray(payload?.houses)) return payload.houses;
  if (Array.isArray(payload?.rooms)) return payload.rooms;
  if (Array.isArray(payload?.payments)) return payload.payments;
  if (Array.isArray(payload?.expenses)) return payload.expenses;
  if (Array.isArray(payload?.pagos)) return payload.pagos;
  if (Array.isArray(payload?.gastos)) return payload.gastos;
  return [];
}

function normalizeTenantRows(rows = []) {
  const tenants = new Map();
  const getAssignmentTime = (row) => {
    const entryTime = getExpenseDateTime({ fecha: row.fecha_entrada });
    const exitTime = row.fecha_salida ? getExpenseDateTime({ fecha: row.fecha_salida }) : Number.MAX_SAFE_INTEGER;
    return exitTime + entryTime / 10000000000000;
  };

  rows.forEach((row) => {
    const id = String(row.id_inquilino || '');
    if (!id) return;
    const current = tenants.get(id);
    if (!current || getAssignmentTime(row) > getAssignmentTime(current)) {
      tenants.set(id, row);
    }
  });

  return Array.from(tenants.values());
}

function getValue(row, key) {
  const resource = state.activeResource;
  if (resource?.computedColumns?.[key]) {
    return resource.computedColumns[key]
      .reduce((total, field) => total + Number(row[field] || 0), 0)
      .toFixed(2);
  }

  const fallbackKeys = {
    nombre: ['usuario_nombre', 'inquilino_nombre', 'propietario_nombre'],
    apellido1: ['usuario_apellido1', 'inquilino_apellido1', 'propietario_apellido1'],
    email: ['usuario_email', 'inquilino_email', 'propietario_email'],
  };
  if (row[key] !== undefined && row[key] !== null) return row[key];
  for (const fallback of fallbackKeys[key] || []) {
    if (row[fallback] !== undefined && row[fallback] !== null) return row[fallback];
  }
  return '';
}

function toDisplayDate(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (String(value).includes('T')) {
    const date = parseAppDate(value);
    return date ? inputDateToDisplay(inputDateFromDate(date)) : value;
  }
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inputDateToDisplay(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function dateToInputValue(value) {
  if (!value) return '';
  const text = String(value);
  if (text.includes('T')) {
    const date = parseAppDate(value);
    return date ? inputDateFromDate(date) : '';
  }
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const displayMatch = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return displayMatch ? `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}` : '';
}

function parseInputDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function addCalendarDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function inputDateFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthInputValue(date) {
  return inputDateFromDate(date).slice(0, 7);
}

function formatBillingPeriodLabel(start, end) {
  return `${inputDateToDisplay(start)} / ${inputDateToDisplay(end)}`;
}

function getAccountingRowDate(row = {}) {
  if (row.fecha) return parseAppDate(row.fecha);
  if (row.fecha_pago) return parseAppDate(row.fecha_pago);
  if (row.fecha_recibo) return parseAppDate(row.fecha_recibo);
  const month = Number(row.mes);
  const year = Number(row.anio);
  return month && year ? new Date(year, month - 1, 1) : null;
}

function isRowInsideAccountingPeriod(row = {}) {
  const rowDate = getAccountingRowDate(row);
  if (!rowDate) return true;
  const start = parseInputDate(state.accountingStartDateFilter);
  const end = parseInputDate(state.accountingEndDateFilter);
  if (start && rowDate < start) return false;
  if (end && rowDate > end) return false;
  return true;
}

function initializeAccountingPeriod(rows = []) {
  if (state.accountingStartDateFilter && state.accountingEndDateFilter) return;
  const dates = rows
    .map(getAccountingRowDate)
    .filter(Boolean)
    .sort((left, right) => left - right);
  if (!dates.length) {
    const today = todayInputValue();
    state.accountingStartDateFilter = today;
    state.accountingEndDateFilter = today;
  } else {
    state.accountingStartDateFilter = inputDateFromDate(dates[0]);
    state.accountingEndDateFilter = inputDateFromDate(dates[dates.length - 1]);
  }
}

function getAccountingCalendarState() {
  const start = state.accountingStartDateFilter || todayInputValue();
  const end = state.accountingEndDateFilter || start;
  const calendar = accountingPeriodFilter?.querySelector('[data-accounting-calendar]');
  const month = calendar?.dataset.month || getMonthInputValue(parseInputDate(start) || new Date());
  return { start, end, month };
}

function renderAccountingCalendar(monthValue, startValue, endValue, isOpen = false) {
  return renderBillingCalendar(monthValue, startValue, endValue, isOpen)
    .replaceAll('data-billing-calendar', 'data-accounting-calendar')
    .replaceAll('data-action="change-billing-month"', 'data-action="change-accounting-month"')
    .replaceAll('data-action="select-billing-date"', 'data-action="select-accounting-date"');
}

function updateAccountingPeriodLabel() {
  const label = accountingPeriodFilter?.querySelector('[data-accounting-period-label]');
  if (!label) return;
  label.textContent = formatBillingPeriodLabel(state.accountingStartDateFilter, state.accountingEndDateFilter);
}

function updateAccountingCalendar(monthValue = '') {
  const calendarWrap = accountingPeriodFilter?.querySelector('[data-accounting-calendar-wrap]');
  if (!calendarWrap) return;
  const { start, end, month } = getAccountingCalendarState();
  const currentCalendar = calendarWrap.querySelector('[data-accounting-calendar]');
  const isOpen = currentCalendar ? !currentCalendar.classList.contains('hidden') : false;
  calendarWrap.innerHTML = renderAccountingCalendar(monthValue || month, start, end, isOpen);
  updateAccountingPeriodLabel();
}

function updateAccountingPeriod(startValue, endValue) {
  state.accountingStartDateFilter = startValue;
  state.accountingEndDateFilter = endValue;
  updateAccountingCalendar();
  clearDetailPanel();
  renderTable();
}

function getTenantFormInitials(tenant = {}) {
  const source = [tenant.nombre, tenant.apellido1].filter(Boolean);
  const initials = source.length
    ? source.map((part) => String(part)[0]).join('')
    : String(tenant.email || 'IN').slice(0, 2);

  return initials.toUpperCase();
}

function getTenantFormAvatarUrl(tenant = {}) {
  return tenant.avatar_archivo ? buildStaticFileUrl(tenant.avatar_archivo, tenant.updated_at || tenant.avatar_archivo) : '';
}

function renderTenantAvatarPicker(tenant = null) {
  if (tenantAvatarCrop?.sourceUrl) URL.revokeObjectURL(tenantAvatarCrop.sourceUrl);
  state.tenantAvatarFile = null;
  tenantAvatarCrop = null;
  const fallback = escapeHtml(getTenantFormInitials(tenant || {}));

  return `<div class="tenant-avatar-field">
    <label class="tenant-avatar-picker" for="tenantAvatarInput" aria-label="Adjuntar avatar">
      <input id="tenantAvatarInput" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" hidden>
      <span class="tenant-form-avatar" data-avatar-preview data-avatar-user-id="${escapeHtml(tenant?.id_usuario || '')}">${fallback}</span>
    </label>
    <div class="tenant-avatar-cropper hidden" data-avatar-cropper>
      <div class="tenant-avatar-crop-frame" data-avatar-crop-frame>
        <img data-avatar-crop-image alt="">
      </div>
      <input id="tenantAvatarZoom" type="range" min="1" max="3" step="0.05" value="1" aria-label="Ajustar tamaño del avatar">
      <div class="tenant-avatar-crop-actions">
        <button class="button small primary" data-action="apply-avatar-crop" type="button">Aplicar</button>
        <button class="button small ghost" data-action="cancel-avatar-crop" type="button">Cancelar</button>
      </div>
    </div>
  </div>`;
}

function buildTenantRoomChangeOptions(selectedRoomId = '') {
  return (state.availableRooms || [])
    .filter((room) => String(room.id_habitacion) !== String(selectedRoomId || ''))
    .map((room) => {
      const totalBeds = Number(room.numero_camas || 0);
      const availableBeds = Number(room.camas_disponibles ?? totalBeds);
      const active = room.activa === true || Number(room.activa) === 1;
      const enabled = active && availableBeds > 0;
      const label = [
        room.nombre_vivienda,
        room.nombre,
        room.tipo,
        `${availableBeds}/${totalBeds} camas libres`,
        `${formatMoney(room.precio)} €`,
      ].filter(Boolean).join(' · ');

      return `<option value="${escapeHtml(room.id_habitacion)}" ${enabled ? '' : 'disabled'}>
        ${escapeHtml(label)}${enabled ? '' : ' (no disponible)'}
      </option>`;
    }).join('');
}

function getTenantRoomLabelById(roomId = '') {
  const room = (state.availableRooms || []).find((item) => String(item.id_habitacion || '') === String(roomId || ''));
  return [
    room?.nombre_vivienda,
    room?.nombre,
    room?.tipo,
  ].filter(Boolean).join(' · ') || (roomId ? 'Habitación sin nombre' : 'Sin asignar');
}

function getPreviousDayInputValue(value) {
  const date = parseInputDate(value);
  if (!date) return '';
  return inputDateFromDate(addCalendarDays(date, -1));
}

function getRoomChangePreviousRoomId(item) {
  let previousRoomId = String(state.editingTenantFull?.id_habitacion || '');
  const changes = Array.from(resourceForm?.querySelectorAll('[data-room-change-item]') || []);

  for (const change of changes) {
    if (change === item) return previousRoomId;
    const selectedRoomId = change.querySelector('select[name="change_id_habitacion"]')?.value;
    if (selectedRoomId) previousRoomId = String(selectedRoomId);
  }

  return previousRoomId;
}

function getRoomChangePreviousEntryDate(item) {
  let previousEntryDate = dateToInputValue(state.editingTenantFull?.fecha_entrada);
  const changes = Array.from(resourceForm?.querySelectorAll('[data-room-change-item]') || []);

  for (const change of changes) {
    if (change === item) return previousEntryDate;
    const changeDate = change.querySelector('input[name="fecha_cambio"]')?.value;
    if (changeDate) previousEntryDate = changeDate;
  }

  return previousEntryDate;
}

function getRoomChangeNextDate(item) {
  const changes = Array.from(resourceForm?.querySelectorAll('[data-room-change-item]') || []);
  const index = changes.indexOf(item);
  if (index < 0) return '';

  return changes[index + 1]?.querySelector('input[name="fecha_cambio"]')?.value || '';
}

function updateTenantRoomChangePreviews() {
  resourceForm?.querySelectorAll('[data-room-change-item]').forEach((item) => {
    const selectedRoomId = item.querySelector('select[name="change_id_habitacion"]')?.value || '';
    const changeDate = item.querySelector('input[name="fecha_cambio"]')?.value || '';
    const previousRoomId = getRoomChangePreviousRoomId(item);
    const previousEntryDate = getRoomChangePreviousEntryDate(item);
    const previousExitDate = getPreviousDayInputValue(changeDate);
    const nextExitDate = getPreviousDayInputValue(getRoomChangeNextDate(item));
    const preview = item.querySelector('[data-room-change-preview]');
    if (!preview) return;

    preview.innerHTML = `
      <span><strong>Anterior</strong>: ${escapeHtml(getTenantRoomLabelById(previousRoomId))} · Entrada ${escapeHtml(inputDateToDisplay(previousEntryDate) || '—')} · Salida ${escapeHtml(inputDateToDisplay(previousExitDate) || '—')}</span>
      <span><strong>Nueva</strong>: ${escapeHtml(getTenantRoomLabelById(selectedRoomId))} · Entrada ${escapeHtml(inputDateToDisplay(changeDate) || '—')} · Salida ${escapeHtml(inputDateToDisplay(nextExitDate) || 'actual')}</span>
    `;
  });
}

function getTenantRoomChangeHistoryRows(tenant = {}) {
  const tenantId = String(tenant?.id_inquilino || '');
  const unique = new Map();
  const rows = (state.tenantAssignmentRows || [])
    .filter((row) => String(row.id_inquilino || '') === tenantId)
    .concat(tenant || {});

  rows.forEach((row) => {
    if (!row?.id_habitacion && !row?.nombre_habitacion && !row?.fecha_entrada && !row?.fecha_salida) return;
    const key = row.id_habitacion_inquilino
      || [row.id_habitacion, row.fecha_entrada, row.fecha_salida].join('|');
    unique.set(String(key), row);
  });

  return Array.from(unique.values()).sort((left, right) => {
    const leftDate = parseDateValue(left.fecha_entrada)?.getTime() || 0;
    const rightDate = parseDateValue(right.fecha_entrada)?.getTime() || 0;
    if (leftDate !== rightDate) return leftDate - rightDate;
    return Number(left.id_habitacion_inquilino || 0) - Number(right.id_habitacion_inquilino || 0);
  });
}

function renderTenantRoomChangeHistory(tenant = {}) {
  const history = getTenantRoomChangeHistoryRows(tenant);
  if (!history.length) return '<p class="empty-detail">Sin historial de habitaciones.</p>';

  return `<div class="tenant-room-change-list">
    ${history.map((row, index) => {
      const room = [
        row.nombre_vivienda,
        row.nombre_habitacion || row.nombre,
        row.tipo_habitacion || row.tipo,
      ].filter(Boolean).join(' · ') || 'Habitación sin nombre';
      const entry = formatDisplayValue('fecha_entrada', row.fecha_entrada) || '—';
      const exit = formatDisplayValue('fecha_salida', row.fecha_salida) || 'actual';

      return `<div class="tenant-room-change-item">
        <div class="tenant-room-change-header">
          <strong>Cambio de habitación ${index + 1}</strong>
        </div>
        <div class="tenant-room-change-summary">
          <span><strong>Habitación</strong>: ${escapeHtml(room)}</span>
          <span><strong>Entrada</strong>: ${escapeHtml(entry)} · <strong>Salida</strong>: ${escapeHtml(exit)}</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderRoomChangeForm(index, selectedRoomId = '') {
  const options = buildTenantRoomChangeOptions(selectedRoomId);

  return `<div class="tenant-room-change-item" data-room-change-item>
    <div class="tenant-room-change-header">
      <strong>Cambio de habitación ${index + 1}</strong>
      <button class="button small ghost" data-action="remove-room-change" type="button">Quitar</button>
    </div>

    <div class="tenant-room-change-grid">
      <label>Nueva habitación
        <select name="change_id_habitacion" required>
          <option value="">Selecciona habitación</option>
          ${options || '<option value="" disabled>No hay habitaciones disponibles</option>'}
        </select>
      </label>

      <label>Fecha de cambio
        <input name="fecha_cambio" type="date" required>
      </label>
    </div>
    <div class="tenant-room-change-summary" data-room-change-preview></div>
  </div>`;
}

function addTenantRoomChangeForm() {
  const list = resourceForm.querySelector('[data-room-change-list]');
  if (!list) return;
  const selectedRoomId = state.editingTenantFull?.id_habitacion || '';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderRoomChangeForm(list.querySelectorAll('[data-room-change-item]').length, selectedRoomId);
  list.appendChild(wrapper.firstElementChild);
  updateTenantRoomChangePreviews();
}

function renumberTenantRoomChangeForms() {
  resourceForm.querySelectorAll('[data-room-change-item]').forEach((item, index) => {
    const title = item.querySelector('.tenant-room-change-header strong');
    if (title) title.textContent = `Cambio de habitación ${index + 1}`;
  });
  updateTenantRoomChangePreviews();
}

function updateTenantAvatarCropTransform() {
  if (!tenantAvatarCrop?.imageElement) return;
  const { imageElement, offsetX, offsetY, zoom } = tenantAvatarCrop;
  imageElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`;
}

function clampTenantAvatarCropOffset() {
  if (!tenantAvatarCrop) return;
  const frameSize = tenantAvatarCrop.frameSize;
  const { naturalWidth, naturalHeight, baseScale, zoom } = tenantAvatarCrop;
  const displayWidth = naturalWidth * baseScale * zoom;
  const displayHeight = naturalHeight * baseScale * zoom;
  const maxX = Math.max((displayWidth - frameSize) / 2, 0);
  const maxY = Math.max((displayHeight - frameSize) / 2, 0);

  tenantAvatarCrop.offsetX = Math.max(-maxX, Math.min(maxX, tenantAvatarCrop.offsetX));
  tenantAvatarCrop.offsetY = Math.max(-maxY, Math.min(maxY, tenantAvatarCrop.offsetY));
}

function openTenantAvatarCropper(file) {
  const cropper = resourceForm.querySelector('[data-avatar-cropper]');
  const frame = resourceForm.querySelector('[data-avatar-crop-frame]');
  const imageElement = resourceForm.querySelector('[data-avatar-crop-image]');
  const zoomInput = resourceForm.querySelector('#tenantAvatarZoom');
  if (!cropper || !frame || !imageElement || !zoomInput) return;

  if (tenantAvatarCrop?.sourceUrl) URL.revokeObjectURL(tenantAvatarCrop.sourceUrl);
  const sourceUrl = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    const frameSize = frame.clientWidth || 240;
    tenantAvatarCrop = {
      sourceUrl,
      fileName: file.name || 'avatar.jpg',
      image,
      imageElement,
      frameSize,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      baseScale: Math.max(frameSize / image.naturalWidth, frameSize / image.naturalHeight),
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      startX: 0,
      startY: 0,
      startOffsetX: 0,
      startOffsetY: 0,
    };
    zoomInput.value = '1';
    imageElement.src = sourceUrl;
    imageElement.style.width = `${image.naturalWidth * tenantAvatarCrop.baseScale}px`;
    imageElement.style.height = `${image.naturalHeight * tenantAvatarCrop.baseScale}px`;
    cropper.classList.remove('hidden');
    updateTenantAvatarCropTransform();
  };

  image.src = sourceUrl;
}

function cancelTenantAvatarCrop() {
  const cropper = resourceForm.querySelector('[data-avatar-cropper]');
  const input = resourceForm.querySelector('#tenantAvatarInput');
  cropper?.classList.add('hidden');
  if (input) input.value = '';
  if (tenantAvatarCrop?.sourceUrl) URL.revokeObjectURL(tenantAvatarCrop.sourceUrl);
  tenantAvatarCrop = null;
}

function createCroppedTenantAvatarFile() {
  return new Promise((resolve, reject) => {
    if (!tenantAvatarCrop) {
      resolve(null);
      return;
    }

    const outputSize = 512;
    const {
      image,
      frameSize,
      naturalWidth,
      naturalHeight,
      baseScale,
      zoom,
      offsetX,
      offsetY,
      fileName,
    } = tenantAvatarCrop;
    const scale = baseScale * zoom;
    const sourceX = (naturalWidth * scale / 2 - frameSize / 2 - offsetX) / scale;
    const sourceY = (naturalHeight * scale / 2 - frameSize / 2 - offsetY) / scale;
    const sourceSize = frameSize / scale;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const context = canvas.getContext('2d');

    context.drawImage(
      image,
      Math.max(0, sourceX),
      Math.max(0, sourceY),
      Math.min(sourceSize, naturalWidth),
      Math.min(sourceSize, naturalHeight),
      0,
      0,
      outputSize,
      outputSize
    );

    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo preparar el avatar'));
        return;
      }

      const safeName = fileName.replace(/\.[^.]+$/, '') || 'avatar';
      resolve(new File([blob], `${safeName}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });
}

async function applyTenantAvatarCrop() {
  const file = await createCroppedTenantAvatarFile();
  if (!file) return;

  state.tenantAvatarFile = file;
  const preview = resourceForm.querySelector('[data-avatar-preview]');
  const cropper = resourceForm.querySelector('[data-avatar-cropper]');
  const previewUrl = URL.createObjectURL(file);
  if (preview) preview.innerHTML = `<img src="${previewUrl}" alt="">`;
  cropper?.classList.add('hidden');
  if (tenantAvatarCrop?.sourceUrl) URL.revokeObjectURL(tenantAvatarCrop.sourceUrl);
  tenantAvatarCrop = null;
  window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000);
}

async function checkHealth() {
  try {
    await request('/api/health', {}, false);
    if (apiStatus) apiStatus.textContent = 'Api conectada';
    if (apiDot) apiDot.className = 'status-dot ok';
    stopHealthRetry();
  } catch (error) {
    if (state.apiBase !== DEFAULT_API_BASE) {
      state.apiBase = DEFAULT_API_BASE;
      localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase);
      if (apiBaseInput) apiBaseInput.value = state.apiBase;
      return checkHealth();
    }
    if (apiStatus) apiStatus.textContent = 'Api sin conexión';
    if (apiDot) apiDot.className = 'status-dot error';
    scheduleHealthRetry();
  }
}

function scheduleHealthRetry() {
  if (healthRetryTimer) return;
  healthRetryTimer = window.setInterval(() => {
    checkHealth();
  }, 5000);
}

function stopHealthRetry() {
  if (!healthRetryTimer) return;
  window.clearInterval(healthRetryTimer);
  healthRetryTimer = null;
}

function isPendingDeposit(row = {}) {
  const status = String(row.estado || '').toLowerCase();
  if (['devuelta', 'compensada', 'retenida', 'cancelada'].includes(status)) return false;
  const expected = parseMoneyValue(row.importe);
  const charged = parseMoneyValue(row.importe_cobrado);
  return status === 'pendiente' || charged < expected - 0.005;
}

function renderAuth() {
  const logged = Boolean(state.token);
  document.body.classList.toggle('logged-out', !logged);
  syncUserFromToken();
  updateNavigation();
  renderUserBadge(logged);
  if (loginPanel) loginPanel.classList.toggle('hidden', logged);
  if (workspace) workspace.classList.toggle('hidden', !logged);
  if (logoutButton) logoutButton.classList.toggle('hidden', !logged);
  if (logged && !idleLogoutTimer) scheduleIdleLogout();
  if (!logged) clearIdleLogoutTimer();
}

async function loadDashboard() {
  const keys = getDashboardResourceKeys();
  dashboardView.innerHTML = keys.map((key) => {
    const resource = resources[key];
    return `<button class="stat-card" data-stat="${key}" data-dashboard-section="${key}" type="button">
      <span>${key === 'payments' ? 'Pagos pendientes' : key === 'deposits' ? 'Fianzas' : getResourceTitle(resource)}</span>
      <strong>...</strong>
      <small>${getResourceHint(resource)}</small>
    </button>`;
  }).join('');

  await Promise.all(keys.map(async (key) => {
    const card = dashboardView.querySelector(`[data-stat="${key}"] strong`);
    try {
      const rows = key === 'payments' && getCurrentRole() !== 'inquilino'
        ? await loadPaymentLedgerRows()
        : getRows(await request(`${getResourceEndpoint(resources[key])}?page=1&limit=100`));
      if (key === 'payments') {
        card.textContent = rows.filter((row) => getPaymentFilterStatus(row) === 'pendientes').length;
        return;
      }
      if (key === 'expenses' || key === 'ownerExpenses') {
        card.textContent = rows.filter((row) => String(row.estado || '').toLowerCase() === 'pendiente').length;
        return;
      }
      if (key === 'deposits') {
        card.textContent = rows.filter(isPendingDeposit).length;
        return;
      }
      if (key === 'rooms') {
        const tenantRows = getRows(await request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`));
        const roomsWithAvailability = addRoomAvailability(rows, tenantRows);
        card.textContent = roomsWithAvailability.filter((room) => Number(room.camas_libres || 0) > 0).length;
        return;
      }
      card.textContent = (key === 'tenants' ? normalizeTenantRows(rows) : rows).length;
    } catch {
      card.textContent = '-';
    }
  }));
}

const STATISTICS_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

function getStatisticsControls() {
  return {
    periodType: $('#statisticsPeriodType'),
    month: $('#statisticsMonth'),
    year: $('#statisticsYear'),
    compareMonth: $('#statisticsCompareMonth'),
    compareYear: $('#statisticsCompareYear'),
    chart: $('#statisticsChart'),
  };
}

function fillStatisticsMonthSelect(select, selectedMonth) {
  if (!select) return;
  select.innerHTML = STATISTICS_MONTHS.map((label, index) => (
    `<option value="${index + 1}" ${Number(selectedMonth) === index + 1 ? 'selected' : ''}>${label}</option>`
  )).join('');
}

function setupStatisticsControls() {
  const controls = getStatisticsControls();
  const today = new Date();
  fillStatisticsMonthSelect(controls.month, today.getMonth() + 1);
  fillStatisticsMonthSelect(controls.compareMonth, today.getMonth() || 12);
  if (controls.year && !controls.year.value) controls.year.value = today.getFullYear();
  if (controls.compareYear && !controls.compareYear.value) {
    controls.compareYear.value = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
  }
}

function getStatisticsPeriodLabel(periodType, month, year) {
  if (periodType === 'annual') return String(year);
  return `${STATISTICS_MONTHS[Number(month) - 1] || ''} ${year}`;
}

function rowMatchesStatisticsPeriod(row, periodType, month, year) {
  const monthData = getRowMonthData(row);
  if (!monthData.year) return false;
  if (Number(monthData.year) !== Number(year)) return false;
  return periodType === 'annual' || Number(monthData.month) === Number(month);
}

function getStatisticsFallbackDate(row = {}) {
  const month = Number(row.mes || row.month || 0);
  const year = Number(row.anio || row.year || 0);
  return month && year ? `${year}-${String(month).padStart(2, '0')}-01` : '';
}

function getStatisticsExpenseDate(row = {}) {
  return row.fecha || row.fecha_inicio || row.created_at || '';
}

function isStatisticsOwnerExpense(row = {}) {
  const paidBy = String(row.pagado_por || '').trim().toLowerCase();
  return row.expense_source === 'owner'
    || row.gasto_de_value === 'propietario'
    || paidBy === 'propietario';
}

function getStatisticsAmount(row = {}) {
  return parseMoneyValue(row.importe ?? row.importe_total ?? row.importe_asignado);
}

async function loadStatisticsRows() {
  const [paymentPayload, ownerExpensePayload] = await Promise.all([
    request(`${getResourceEndpoint(resources.payments)}?page=1&limit=500`).catch(() => null),
    request(`${getResourceEndpoint(resources.ownerExpenses)}?page=1&limit=500`).catch(() => null),
  ]);

  const incomeRows = getRows(paymentPayload)
    .filter((row) => !isCancelledExpense(row))
    .map((row) => ({
      ...row,
      statistics_kind: 'income',
      importe: getPaymentSettlementAmount(row),
      fecha: row.fecha_pago || getStatisticsFallbackDate(row),
    }))
    .filter((row) => parseMoneyValue(row.importe) > 0);

  const directExpenseRows = [
    ...normalizeOwnerExpenseRows(getRows(ownerExpensePayload)),
  ]
    .filter((row) => (
      !isCancelledExpense(row)
      && isStatisticsOwnerExpense(row)
    ))
    .map((row) => ({
      ...row,
      statistics_kind: 'loss',
      importe: getStatisticsAmount(row),
      fecha: getStatisticsExpenseDate(row),
    }));

  return [...incomeRows, ...directExpenseRows];
}

function summarizeStatisticsRows(rows, periodType, month, year) {
  return rows
    .filter((row) => rowMatchesStatisticsPeriod(row, periodType, month, year))
    .reduce((summary, row) => {
      const amount = getStatisticsAmount(row);
      if (row.statistics_kind === 'loss') {
        summary.losses += amount;
      } else if (row.statistics_kind === 'income') {
        summary.income += amount;
      }
      summary.balance = summary.income - summary.losses;
      return summary;
    }, { income: 0, losses: 0, balance: 0 });
}

function renderStatisticsBar(label, value, maxValue, kind) {
  const width = maxValue > 0 ? Math.max(3, Math.round((Math.abs(value) / maxValue) * 100)) : 0;
  return `<div class="statistics-bar-row">
    <span>${escapeHtml(label)}</span>
    <div class="statistics-bar-track">
      <div class="statistics-bar statistics-bar-${kind}" style="width:${width}%"></div>
    </div>
    <strong>${escapeHtml(formatMoney(value))} €</strong>
  </div>`;
}

function renderStatisticsMoneyReference(maxValue) {
  const middleValue = maxValue / 2;
  return `<div class="statistics-money-reference">
    <span>0 €</span>
    <span>${escapeHtml(formatMoney(middleValue))} €</span>
    <span>${escapeHtml(formatMoney(maxValue))} €</span>
  </div>`;
}

function renderStatisticsGroup(label, summary, maxValue) {
  return `<article class="statistics-chart-group">
    <h3>${escapeHtml(label)}</h3>
    ${renderStatisticsMoneyReference(maxValue)}
    ${renderStatisticsBar('Ingresos', summary.income, maxValue, 'income')}
    ${renderStatisticsBar('Gastos', summary.losses, maxValue, 'losses')}
    ${renderStatisticsBar('Beneficios', summary.balance, maxValue, summary.balance >= 0 ? 'balance' : 'losses')}
  </article>`;
}

function renderStatisticsBarChart(currentLabel, current, comparisonLabel, comparison, maxValue) {
  return [
    renderStatisticsGroup(currentLabel, current, maxValue),
    renderStatisticsGroup(comparisonLabel, comparison, maxValue),
  ].join('');
}

function getStatisticsLineScale(points = []) {
  const values = points.flatMap((point) => [point.income, point.losses, point.balance].map((value) => Number(value || 0)));
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values, 1);
  const range = maxValue - minValue || 1;
  const top = 56;
  const bottom = 244;
  const getY = (value) => bottom - (((Number(value || 0) - minValue) / range) * (bottom - top));
  return {
    minValue,
    maxValue,
    middleValue: minValue + (range / 2),
    zeroY: getY(0),
    getY,
  };
}

function renderStatisticsLineChart(currentLabel, current, comparisonLabel, comparison, maxValue) {
  const points = [
    { label: comparisonLabel, ...comparison },
    { label: currentLabel, ...current },
  ];
  const scale = getStatisticsLineScale(points);
  const { getY } = scale;
  const getX = (index) => 136 + index * 516;
  const incomePoints = points.map((point, index) => `${getX(index)},${getY(point.income)}`).join(' ');
  const lossesPoints = points.map((point, index) => `${getX(index)},${getY(point.losses)}`).join(' ');
  const benefitsPoints = points.map((point, index) => `${getX(index)},${getY(point.balance)}`).join(' ');
  return `<article class="statistics-chart-group statistics-line-group">
    <h3>Comparativa</h3>
    <svg class="statistics-line-chart" viewBox="0 0 800 308" role="img" aria-label="Gráfico de línea de ingresos, gastos y beneficios">
      <line x1="80" y1="${scale.zeroY}" x2="740" y2="${scale.zeroY}"></line>
      <line x1="80" y1="56" x2="80" y2="244"></line>
      <line class="statistics-line-reference" x1="80" y1="${getY(scale.maxValue)}" x2="740" y2="${getY(scale.maxValue)}"></line>
      <line class="statistics-line-reference" x1="80" y1="${getY(scale.middleValue)}" x2="740" y2="${getY(scale.middleValue)}"></line>
      <line class="statistics-line-reference" x1="80" y1="${getY(scale.minValue)}" x2="740" y2="${getY(scale.minValue)}"></line>
      <text x="16" y="${getY(scale.maxValue) + 8}">${escapeHtml(formatMoney(scale.maxValue))} €</text>
      <text x="16" y="${getY(scale.middleValue) + 8}">${escapeHtml(formatMoney(scale.middleValue))} €</text>
      <text x="16" y="${scale.zeroY + 8}">0 €</text>
      ${scale.minValue < 0 ? `<text x="16" y="${getY(scale.minValue) - 4}">${escapeHtml(formatMoney(scale.minValue))} €</text>` : ''}
      <polyline class="statistics-line-losses" points="${lossesPoints}"></polyline>
      <polyline class="statistics-line-income" points="${incomePoints}"></polyline>
      <polyline class="statistics-line-balance" points="${benefitsPoints}"></polyline>
      ${points.map((point, index) => {
        const x = getX(index);
        return `<text x="${x}" y="290" text-anchor="middle">${escapeHtml(point.label)}</text>
          <circle class="statistics-dot-losses" cx="${x}" cy="${getY(point.losses)}" r="8"></circle>
          <circle class="statistics-dot-income" cx="${x}" cy="${getY(point.income)}" r="8"></circle>
          <circle class="statistics-dot-balance" cx="${x}" cy="${getY(point.balance)}" r="10"></circle>`;
      }).join('')}
    </svg>
    <div class="statistics-legend">
      <span><i class="statistics-legend-income"></i>Ingresos</span>
      <span><i class="statistics-legend-losses"></i>Gastos</span>
      <span><i class="statistics-legend-balance"></i>Beneficios</span>
    </div>
  </article>`;
}

function renderStatisticsAnnualLineChart(rows, year) {
  const points = STATISTICS_MONTHS.map((label, index) => ({
    label: label.slice(0, 3),
    ...summarizeStatisticsRows(rows, 'monthly', index + 1, year),
  }));
  const scale = getStatisticsLineScale(points);
  const { getY } = scale;
  const getX = (index) => 100 + index * (640 / 11);
  const incomePoints = points.map((point, index) => `${getX(index)},${getY(point.income)}`).join(' ');
  const lossesPoints = points.map((point, index) => `${getX(index)},${getY(point.losses)}`).join(' ');
  const benefitsPoints = points.map((point, index) => `${getX(index)},${getY(point.balance)}`).join(' ');

  return `<article class="statistics-chart-group statistics-line-group">
    <h3>${escapeHtml(String(year))}</h3>
    <svg class="statistics-line-chart" viewBox="0 0 800 308" role="img" aria-label="Gráfico de línea anual por meses">
      <line x1="80" y1="${scale.zeroY}" x2="740" y2="${scale.zeroY}"></line>
      <line x1="80" y1="56" x2="80" y2="244"></line>
      <line class="statistics-line-reference" x1="80" y1="${getY(scale.maxValue)}" x2="740" y2="${getY(scale.maxValue)}"></line>
      <line class="statistics-line-reference" x1="80" y1="${getY(scale.middleValue)}" x2="740" y2="${getY(scale.middleValue)}"></line>
      <line class="statistics-line-reference" x1="80" y1="${getY(scale.minValue)}" x2="740" y2="${getY(scale.minValue)}"></line>
      <text x="16" y="${getY(scale.maxValue) + 8}">${escapeHtml(formatMoney(scale.maxValue))} €</text>
      <text x="16" y="${getY(scale.middleValue) + 8}">${escapeHtml(formatMoney(scale.middleValue))} €</text>
      <text x="16" y="${scale.zeroY + 8}">0 €</text>
      ${scale.minValue < 0 ? `<text x="16" y="${getY(scale.minValue) - 4}">${escapeHtml(formatMoney(scale.minValue))} €</text>` : ''}
      <polyline class="statistics-line-losses" points="${lossesPoints}"></polyline>
      <polyline class="statistics-line-income" points="${incomePoints}"></polyline>
      <polyline class="statistics-line-balance" points="${benefitsPoints}"></polyline>
      ${points.map((point, index) => {
        const x = getX(index);
        return `<text x="${x}" y="290" text-anchor="middle">${escapeHtml(point.label)}</text>
          <circle class="statistics-dot-losses" cx="${x}" cy="${getY(point.losses)}" r="7"></circle>
          <circle class="statistics-dot-income" cx="${x}" cy="${getY(point.income)}" r="7"></circle>
          <circle class="statistics-dot-balance" cx="${x}" cy="${getY(point.balance)}" r="9"></circle>`;
      }).join('')}
    </svg>
    <div class="statistics-legend">
      <span><i class="statistics-legend-income"></i>Ingresos</span>
      <span><i class="statistics-legend-losses"></i>Gastos</span>
      <span><i class="statistics-legend-balance"></i>Beneficios</span>
    </div>
  </article>`;
}

function renderStatisticsPie(label, summary) {
  const benefits = Math.max(summary.balance, 0);
  const total = summary.income + summary.losses + benefits;
  const incomeDegrees = total > 0 ? Math.round((summary.income / total) * 360) : 0;
  const expensesDegrees = total > 0 ? Math.round((summary.losses / total) * 360) : 0;
  const expensesEnd = incomeDegrees + expensesDegrees;
  return `<article class="statistics-chart-group statistics-pie-group">
    <h3>${escapeHtml(label)}</h3>
    <div class="statistics-pie" style="background: conic-gradient(var(--chart-income) 0deg ${incomeDegrees}deg, var(--chart-expenses) ${incomeDegrees}deg ${expensesEnd}deg, var(--chart-benefits) ${expensesEnd}deg 360deg);">
      <span>${escapeHtml(formatMoney(summary.balance))} €</span>
    </div>
    <div class="statistics-legend">
      <span><i class="statistics-legend-income"></i>Ingresos</span>
      <span><i class="statistics-legend-losses"></i>Gastos</span>
      <span><i class="statistics-legend-balance"></i>Beneficios</span>
    </div>
    ${renderStatisticsBar('Ingresos', summary.income, Math.max(summary.income, summary.losses, benefits, 1), 'income')}
    ${renderStatisticsBar('Gastos', summary.losses, Math.max(summary.income, summary.losses, benefits, 1), 'losses')}
    ${renderStatisticsBar('Beneficios', summary.balance, Math.max(summary.income, summary.losses, benefits, 1), summary.balance >= 0 ? 'balance' : 'losses')}
  </article>`;
}

function renderStatisticsPieChart(currentLabel, current, comparisonLabel, comparison) {
  return [
    renderStatisticsPie(currentLabel, current),
    renderStatisticsPie(comparisonLabel, comparison),
  ].join('');
}

async function renderStatisticsChart() {
  const controls = getStatisticsControls();
  if (!controls.chart) return;
  controls.chart.innerHTML = '<p class="detail-loading">Cargando estadísticas...</p>';

  const periodType = controls.periodType?.value || 'monthly';
  const month = Number(controls.month?.value || new Date().getMonth() + 1);
  const year = Number(controls.year?.value || new Date().getFullYear());
  const compareMonth = Number(controls.compareMonth?.value || month);
  const compareYear = Number(controls.compareYear?.value || year - 1);
  const isAnnual = periodType === 'annual';
  controls.month?.closest('label')?.classList.toggle('hidden', isAnnual);
  controls.compareMonth?.closest('label')?.classList.toggle('hidden', isAnnual);

  try {
    const rows = await loadStatisticsRows();
    const current = summarizeStatisticsRows(rows, periodType, month, year);
    const comparison = summarizeStatisticsRows(rows, periodType, compareMonth, compareYear);
    const maxValue = Math.max(
      current.income,
      current.losses,
      Math.abs(current.balance),
      comparison.income,
      comparison.losses,
      Math.abs(comparison.balance),
      1
    );
    const currentLabel = getStatisticsPeriodLabel(periodType, month, year);
    const comparisonLabel = getStatisticsPeriodLabel(periodType, compareMonth, compareYear);
    const chartType = state.resourceAction || 'bar';
    if (chartType === 'line') {
      controls.chart.innerHTML = isAnnual
        ? renderStatisticsAnnualLineChart(rows, year)
        : renderStatisticsLineChart(currentLabel, current, comparisonLabel, comparison, maxValue);
    } else if (chartType === 'pie') {
      controls.chart.innerHTML = renderStatisticsPieChart(currentLabel, current, comparisonLabel, comparison);
    } else {
      controls.chart.innerHTML = renderStatisticsBarChart(currentLabel, current, comparisonLabel, comparison, maxValue);
    }
  } catch {
    controls.chart.innerHTML = '<p class="empty-detail">No se pudieron cargar las estadísticas.</p>';
  }
}

async function loadStatistics() {
  setupStatisticsControls();
  await renderStatisticsChart();
}

function setSection(section) {
  if (!canAccessSection(section)) section = 'dashboard';
  state.activeSection = section;
  mainNav?.querySelectorAll('.nav-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.section === section);
  });
  $('#sectionTitle').textContent = section === 'dashboard'
    ? 'Panel'
    : section === SETTINGS_SECTION
      ? 'Configuración'
      : section === STATISTICS_SECTION
        ? 'Estadísticas'
      : getResourceTitle(resources[section]);
  if (sectionEyebrow) sectionEyebrow.textContent = `Menú ${getCurrentRole()}`;
  dashboardView.classList.toggle('hidden', section !== 'dashboard');
  adminView?.classList.add('hidden');
  configView?.classList.toggle('hidden', section !== SETTINGS_SECTION);
  statisticsView?.classList.toggle('hidden', section !== STATISTICS_SECTION);
  crudView.classList.toggle('hidden', section === 'dashboard' || section === SETTINGS_SECTION || section === STATISTICS_SECTION);
}

function isTenantCreateMode() {
  return state.activeSection === 'tenants' && state.resourceAction === 'create';
}

function isTenantFullEditMode() {
  return state.activeSection === 'tenants' && state.resourceAction === 'update' && Boolean(state.editingTenantFull);
}

function isTenantFullFormMode() {
  return isTenantCreateMode() || isTenantFullEditMode();
}

function isTenantStayMode() {
  return state.activeSection === 'tenants' && state.resourceAction === 'stay' && Boolean(state.editingTenantFull);
}

function isHouseCreateMode() {
  return state.activeSection === 'houses' && state.resourceAction === 'create';
}

function isHouseEditMode() {
  return state.activeSection === 'houses' && state.resourceAction === 'update' && Boolean(state.editingId);
}

function isHouseFormMode() {
  return isHouseCreateMode() || isHouseEditMode();
}

function isExpenseCreateMode() {
  return state.activeSection === 'ownerExpenses' && state.resourceAction === 'create';
}

async function loadHouseRooms(houseId) {
  if (!houseId) return [];
  const payload = await request(`${resources.rooms.endpoint}?page=1&limit=500&id_vivienda=${encodeURIComponent(houseId)}`);
  return getRows(payload).filter((room) => String(room.id_vivienda) === String(houseId));
}

async function loadTenantCreateRooms() {
  try {
    state.availableRooms = getRows(await request('/api/tenant/available-rooms'));
  } catch {
    try {
      const rooms = getRows(await request(`${resources.rooms.endpoint}?page=1&limit=500`));
      const tenants = getRows(await request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`));
      const occupiedByRoom = tenants.reduce((map, tenant) => {
        const roomId = String(tenant.id_habitacion || '');
        if (!roomId || tenant.fecha_salida) return map;
        map.set(roomId, (map.get(roomId) || 0) + 1);
        return map;
      }, new Map());
      state.availableRooms = rooms.map((room) => {
        const totalBeds = Number(room.numero_camas || 0);
        const occupiedBeds = occupiedByRoom.get(String(room.id_habitacion || '')) || 0;
        return {
          ...room,
          camas_disponibles: Math.max(totalBeds - occupiedBeds, 0),
        };
      });
    } catch {
      state.availableRooms = [];
    }
  }
}

async function ensureTenantAssignmentRows(tenantId) {
  if (!tenantId) return;
  try {
    state.tenantAssignmentRows = getRows(await request('/api/room-tenant?page=1&limit=100'));
  } catch {
    state.tenantAssignmentRows = getRows(await request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`));
  }
}

async function loadExpenseCreateOptions() {
  const fallbackTypes = ['electricidad', 'agua', 'gas', 'internet', 'comunidad', 'mantenimiento', 'reparacion', 'comision', 'impuesto', 'seguro', 'hipoteca'];

  try {
    const housePayload = await request(`${getResourceEndpoint(resources.houses)}?page=1&limit=200`);
    state.expenseHouseOptions = getRows(housePayload).map((house) => ({
      value: String(house.id_vivienda || ''),
      label: String(house.nombre || house.id_vivienda || 'Sin vivienda'),
    })).filter((house) => house.value);
  } catch {
    state.expenseHouseOptions = [];
  }

  try {
    const tenantPayload = await request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`);
    state.expenseTenantOptions = normalizeTenantRows(getRows(tenantPayload)).map((tenant) => ({
      value: String(tenant.id_inquilino || ''),
      houseId: String(tenant.id_vivienda || ''),
      label: [tenant.nombre, tenant.apellido1, tenant.nombre_vivienda ? `- ${tenant.nombre_vivienda}` : '']
        .filter(Boolean)
        .join(' '),
    })).filter((tenant) => tenant.value && tenant.houseId);
  } catch {
    state.expenseTenantOptions = [];
  }

  try {
    const [ownerPayload, tenantPayload] = await Promise.all([
      request(`${getResourceEndpoint(resources.ownerExpenses)}?page=1&limit=200`),
      request(`${getResourceEndpoint(resources.expenses)}?page=1&limit=200`),
    ]);
    const types = new Set();
    getRows(ownerPayload).forEach((row) => { if (row.tipo) types.add(String(row.tipo)); });
    getRows(tenantPayload).forEach((row) => { if (row.tipo && !isTenantDepositExpense(row)) types.add(String(row.tipo)); });
    fallbackTypes.forEach((type) => types.add(type));
    types.delete('fianza');
    types.delete('otros');
    state.expenseConceptOptions = Array.from(types).sort((a, b) => a.localeCompare(b, 'es'));
  } catch {
    state.expenseConceptOptions = fallbackTypes;
  }
}

async function loadSection(section = state.activeSection) {
  if (!(section === 'houses' && state.resourceAction === 'update')) {
    window.clearTimeout(houseAutoSaveTimer);
    houseAutoSaveTimer = null;
    houseAutoSavePending = false;
  }
  if (isAdminMenuMode()) {
    if (section === 'dashboard') {
      await loadAdminDashboardSection();
      return;
    }
    if (section === 'users') {
      await loadAdminUsersSection();
      return;
    }
    if (section === 'owners') {
      await loadAdminOwnersSection();
      return;
    }
    if (section === 'tenants') {
      await loadAdminTenantsSection();
      return;
    }
    if (section === 'houses') {
      await loadAdminHousesSection();
      return;
    }
    if (section === 'rooms') {
      await loadAdminRoomsSection();
      return;
    }
    if (section === 'payments') {
      await loadAdminPaymentsSection();
      return;
    }
    if (section === 'deposits') {
      await loadAdminDepositsSection();
      return;
    }
    if (section === 'expenses') {
      await loadAdminExpensesSection();
      return;
    }
    if (section === 'liquidations') {
      await loadAdminLiquidationsSection();
      return;
    }
    renderAdminSection(section);
    return;
  }
  setSection(section);
  state.activeExpenseDetailRow = null;
  if (section !== 'tenants') {
    state.tenantHouseFilter = null;
    state.editingTenantFull = null;
  }
  if (section !== 'ownerLiquidations') {
    clearDetailPanel();
  }
  if (!state.token) return;
  if (section === 'dashboard') {
    await loadDashboard();
    return;
  }
  if (section === SETTINGS_SECTION) {
    if (apiBaseInput) apiBaseInput.value = state.apiBase;
    if (defaultDepositInput) defaultDepositInput.value = getDefaultDepositAmount().toFixed(2);
    if (minimumMonthlyDaysInput) minimumMonthlyDaysInput.value = getMinimumMonthlyDays();
    return;
  }
  if (section === STATISTICS_SECTION) {
    if (!state.resourceAction) state.resourceAction = 'bar';
    await loadStatistics();
    return;
  }
  if (!canAccessSection(section)) {
    await loadSection('dashboard');
    return;
  }
  state.activeResource = resources[section];
  if (isPaymentResource(state.activeResource) || isExpenseFilterResource(state.activeResource)) {
    state.paymentStatusFilter = 'pendientes';
  }
  state.editingId = null;
  if (state.activeResource === resources.tenants && state.resourceAction === 'create') {
    await loadTenantCreateRooms();
  }
  if (isExpenseCreateMode()) {
    await loadExpenseCreateOptions();
  }
  updateResourceFilters(state.activeResource);
  if (section === 'houses') renderHouseSectionActions();
  if (section === 'tenants') renderTenantSectionActions();
  $('#resourceTitle').textContent = getResourceTitle(state.activeResource);
  const actionConfig = getResourceActionConfig(section, state.resourceAction);
  $('#resourceHint').textContent = actionConfig?.hint
    || (state.activeResource === resources.tenants && state.tenantHouseFilter
      ? `Inquilinos de ${state.tenantHouseFilter.name}`
      : getResourceHint(state.activeResource));
  const readOnly = isResourceReadOnly(state.activeResource);
  const createMode = state.resourceAction === 'create';
  const usesResourceMenu = Boolean(resourceMenuActions[section]);
  const hideResourceForm = readOnly
    || state.activeResource?.disableCreate
    || section === 'rooms'
    || (isExpenseFilterResource(state.activeResource) && !createMode)
    || isPaymentResource(state.activeResource)
    || (usesResourceMenu && !createMode)
    || (state.resourceAction && !createMode);
  resourceForm.classList.toggle('hidden', hideResourceForm);
  if (hideResourceForm) resourceForm.innerHTML = '';
  splitLayout?.classList.toggle('table-full-width', resourceForm.classList.contains('hidden'));
  splitLayout?.classList.toggle('tenant-create-layout', isTenantFullFormMode() || isTenantStayMode() || isHouseFormMode() || isExpenseCreateMode());
  splitLayout?.classList.toggle('house-list-layout', section === 'houses' && !isHouseFormMode());
  if (searchInput) {
    const hideSearch = section === 'tenants'
      || section === 'houses'
      || section === 'rooms'
      || isFinancialFilterResource(state.activeResource)
      || state.activeResource === resources.ownerLiquidations;
    searchInput.classList.toggle('hidden', hideSearch);
    if (hideSearch) searchInput.value = '';
  }
  if (tenantSortFilter) {
    if (section !== 'tenants') state.tenantSortFilter = '';
    updateTenantSortFilterVisibility();
  }
  $('#newButton').classList.toggle(
    'hidden',
    section === 'rooms' || usesResourceMenu || !canCreateResource(state.activeResource) || state.resourceAction || isFinancialFilterResource(state.activeResource)
  );
  if (!hideResourceForm) renderForm();
  await loadRows();
  if (section === 'houses') renderHouseSectionActions();
  if (section === 'tenants') syncOwnerTenantToolbarActions();
  updateNavigation();
}

function renderForm(row = {}) {
  resourceForm.classList.toggle('house-create-form', isHouseCreateMode());
  resourceForm.classList.toggle('expense-create-form', isExpenseCreateMode());

  if (isTenantFullFormMode()) {
    renderTenantCreateForm(state.editingTenantFull);
    return;
  }
  if (isTenantStayMode()) {
    renderTenantStayForm(state.editingTenantFull);
    return;
  }
  if (isHouseFormMode()) {
    renderHouseForm(row);
    return;
  }
  if (isExpenseCreateMode()) {
    renderExpenseCreateForm();
    return;
  }

  const resource = state.activeResource;
  const title = state.editingId ? `Editar #${state.editingId}` : `Nuevo ${resource.title.toLowerCase()}`;
  const fields = getResourceFields(resource)
    .map(([name, label, type, required, options]) => {
    const value = getValue(row, name);
    const isRequired = required && !(state.editingId && name === 'password');
    if (type === 'select') {
      const choices = [''].concat(options || []);
      return `<label>${label}<select name="${name}" ${isRequired ? 'required' : ''}>${choices.map((option) => (
        `<option value="${option}" ${String(value) === String(option) ? 'selected' : ''}>${option || 'Selecciona'}</option>`
      )).join('')}</select></label>`;
    }
    if (type === 'textarea') {
      return `<label>${label}<textarea name="${name}" ${isRequired ? 'required' : ''}>${value || ''}</textarea></label>`;
    }
    const step = type === 'number' ? ' step="any"' : '';
    return `<label>${label}<input name="${name}" type="${type}" value="${value || ''}"${step} ${isRequired ? 'required' : ''}></label>`;
  }).join('');

  resourceForm.innerHTML = `<h3>${title}</h3>${fields}
    <div class="form-actions">
      <button class="button primary" type="submit">${state.editingId ? 'Guardar' : 'Crear'}</button>
      <button class="button ghost" id="cancelEditButton" type="button">Limpiar</button>
    </div>`;
}

function getBillingCalendarState() {
  const start = resourceForm.querySelector('input[name="fecha_inicio"]')?.value || todayInputValue();
  const end = resourceForm.querySelector('input[name="fecha_fin"]')?.value || start;
  const calendar = resourceForm.querySelector('[data-billing-calendar]');
  const month = calendar?.dataset.month || getMonthInputValue(parseInputDate(start) || new Date());
  return { start, end, month };
}

function getBillingDayClass(dayValue, startValue, endValue) {
  const classes = ['billing-calendar-day'];
  const day = parseInputDate(dayValue);
  const start = parseInputDate(startValue);
  const end = parseInputDate(endValue);

  if (dayValue === startValue) classes.push('selected', 'range-start');
  if (dayValue === endValue) classes.push('selected', 'range-end');
  if (day && start && end && day > start && day < end) classes.push('in-range');

  return classes.join(' ');
}

function renderBillingCalendar(monthValue, startValue, endValue, isOpen = false) {
  const [year, month] = monthValue.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  const previousMonth = getMonthInputValue(new Date(year, month - 2, 1));
  const nextMonth = getMonthInputValue(new Date(year, month, 1));
  const days = [];

  for (let index = 0; index < leadingBlanks; index += 1) {
    days.push('<span class="billing-calendar-empty"></span>');
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const value = inputDateFromDate(new Date(year, month - 1, day));
    days.push(`<button class="${getBillingDayClass(value, startValue, endValue)}" data-action="select-billing-date" data-date="${value}" type="button">${day}</button>`);
  }

  return `<div class="billing-calendar ${isOpen ? '' : 'hidden'}" data-billing-calendar data-month="${monthValue}">
    <div class="billing-calendar-header">
      <button class="button small ghost" data-action="change-billing-month" data-month="${previousMonth}" type="button" aria-label="Mes anterior">‹</button>
      <strong>${firstDay.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</strong>
      <button class="button small ghost" data-action="change-billing-month" data-month="${nextMonth}" type="button" aria-label="Mes siguiente">›</button>
    </div>
    <div class="billing-calendar-weekdays">
      ${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dayName) => `<span>${dayName}</span>`).join('')}
    </div>
    <div class="billing-calendar-grid">${days.join('')}</div>
  </div>`;
}

function updateBillingCalendar(monthValue = '') {
  const calendar = resourceForm.querySelector('[data-billing-calendar]');
  if (!calendar) return;
  const { start, end, month } = getBillingCalendarState();
  calendar.outerHTML = renderBillingCalendar(monthValue || month, start, end, !calendar.classList.contains('hidden'));
}

function updateBillingPeriod(startValue, endValue) {
  const startInput = resourceForm.querySelector('input[name="fecha_inicio"]');
  const endInput = resourceForm.querySelector('input[name="fecha_fin"]');
  const label = resourceForm.querySelector('[data-billing-period-label]');
  if (!startInput || !endInput || !label) return;

  startInput.value = startValue;
  endInput.value = endValue;
  label.textContent = formatBillingPeriodLabel(startValue, endValue);
  updateBillingCalendar();
}

function renderBillingPeriodPicker() {
  const today = todayInputValue();
  return `<div class="billing-period-field">
    <span>Periodo facturado</span>
    <button class="billing-period-trigger" data-action="toggle-billing-calendar" type="button" aria-expanded="false" aria-label="Abrir calendario de periodo">
      <span data-billing-period-label>${formatBillingPeriodLabel(today, today)}</span>
      <span class="billing-period-icon" aria-hidden="true">▾</span>
    </button>
    <input name="fecha_inicio" type="hidden" value="${today}">
    <input name="fecha_fin" type="hidden" value="${today}">
    ${renderBillingCalendar(getMonthInputValue(parseInputDate(today)), today, today, false)}
  </div>`;
}

function renderExpenseCreateForm() {
  const paidByOptions = ['propietario', 'inquilino', 'vivienda'].map((value) => (
    `<option value="${value}">${value}</option>`
  )).join('');
  const houseOptions = (state.expenseHouseOptions || []).map((house) => (
    `<option value="${escapeHtml(house.value)}">${escapeHtml(house.label)}</option>`
  )).join('');
  const conceptOptions = (state.expenseConceptOptions || []).map((concept) => (
    `<option value="${escapeHtml(concept)}">${escapeHtml(concept)}</option>`
  )).join('');
  const tenantOptions = (state.expenseTenantOptions || []).map((tenant) => (
    `<option value="${escapeHtml(tenant.value)}">${escapeHtml(tenant.label)}</option>`
  )).join('');

  resourceForm.innerHTML = `<h3>Crear gasto</h3>
    <div class="expense-create-main-grid">
      <label class="expense-create-source-field">Gasto de
        <select name="gasto_de" required>
          <option value="">Selecciona</option>
          <option value="vivienda">Vivienda</option>
          <option value="inquilino">Inquilino</option>
          <option value="propietario">Propietario</option>
        </select>
      </label>
      <label class="expense-create-house-field" data-expense-house-field>Vivienda
        <select name="id_vivienda" required>
          <option value="">Selecciona vivienda</option>
          ${houseOptions}
        </select>
      </label>
      <label class="expense-create-tenant-field hidden" data-expense-tenant-field>Inquilino
        <select name="id_inquilino">
          <option value="">Selecciona inquilino</option>
          ${tenantOptions}
        </select>
      </label>
      <label class="expense-create-concept-field">Concepto
        <select name="concepto" required data-expense-concept-select>
          <option value="">Selecciona</option>
          ${conceptOptions}
          <option value="otros">Otros</option>
        </select>
      </label>
      <label class="expense-create-custom-concept-field hidden" data-expense-custom-concept>Tipo
        <input name="concepto_otro" type="text" data-normalize-case="first-upper">
      </label>
      <label class="expense-create-amount-field">Importe<input name="importe" type="number" step="any" required></label>
      ${renderBillingPeriodPicker()}
      <label class="expense-create-status-field">Estado
        <select name="estado">
          <option value="">Selecciona</option>
          <option value="pendiente">pendiente</option>
          <option value="pagado">pagado</option>
          <option value="cancelado">cancelado</option>
        </select>
      </label>
      <label class="expense-create-paid-by-field">Pagado por
        <select name="pagado_por">
          <option value="">Selecciona</option>
          ${paidByOptions}
        </select>
      </label>
      <label class="expense-description-field">Descripción
        <textarea name="descripcion" data-normalize-case="first-upper"></textarea>
      </label>
    </div>
    <div class="form-actions">
      <button class="button primary" type="submit">Crear</button>
      <button class="button ghost" id="cancelEditButton" type="button">Limpiar</button>
    </div>`;
}

function getExpenseDetailTitle(row = {}) {
  const label = row.gasto_de || 'Gasto';
  const id = row.id_gasto_propietario || row.id_gasto || row.expense_id || '';
  return `${label}${id ? ` #${id}` : ''}`;
}

function renderExpenseReadonlyForm(row = {}) {
  const expenseTarget = row.gasto_de_value || (row.expense_source === 'owner' ? 'propietario' : 'vivienda');
  const isTenantExpense = expenseTarget === 'inquilino';
  const houseValue = row.nombre_vivienda || row.id_vivienda || '';
  const tenantValue = [row.nombre_inquilino, row.apellido1_inquilino].filter(Boolean).join(' ') || row.id_inquilino || '';
  const amountValue = row.importe ?? row.importe_total ?? '';
  const dateValue = dateToInputValue(row.fecha || row.fecha_inicio || row.fecha_fin);
  const paidByValue = row.pagado_por || '';
  const canCancel = canCancelExpenseRow(state.activeResource, row);

  resourceForm.innerHTML = `<div class="expense-form-header">
      <h3>${escapeHtml(getExpenseDetailTitle(row))}</h3>
      ${canCancel ? `<button class="button primary" data-action="cancel-expense-detail" data-id="${escapeHtml(row.expense_id)}" data-endpoint="${escapeHtml(row.expense_endpoint)}" type="button">Anular</button>` : ''}
    </div>
    <div class="expense-form-columns payment-detail-columns">
      <section class="tenant-create-section">
        <h4>Destino</h4>
        <div class="tenant-create-grid tenant-create-grid-one">
          <label>Gasto de
            <select name="gasto_de" disabled>
              <option value="vivienda" ${expenseTarget === 'vivienda' ? 'selected' : ''}>Vivienda</option>
              <option value="inquilino" ${expenseTarget === 'inquilino' ? 'selected' : ''}>Inquilino</option>
              <option value="propietario" ${expenseTarget === 'propietario' ? 'selected' : ''}>Propietario</option>
            </select>
          </label>
          <label data-expense-house-field>Vivienda
            <input name="id_vivienda" type="text" value="${escapeHtml(houseValue)}" disabled>
          </label>
          <label class="${isTenantExpense ? '' : 'hidden'}" data-expense-tenant-field>Inquilino
            <input name="id_inquilino" type="text" value="${escapeHtml(tenantValue)}" disabled>
          </label>
        </div>
      </section>
      <section class="tenant-create-section">
        <h4>Detalle</h4>
        <div class="tenant-create-grid tenant-create-grid-one">
          <label>Concepto<input name="concepto" type="text" value="${escapeHtml(row.concepto || row.tipo || '')}" disabled></label>
          <label>Tipo<input name="concepto_otro" type="text" value="${escapeHtml(row.tipo || '')}" disabled></label>
          <label>Descripción<textarea name="descripcion" disabled>${escapeHtml(row.descripcion || '')}</textarea></label>
        </div>
      </section>
      <section class="tenant-create-section">
        <h4>Importe y estado</h4>
        <div class="tenant-create-grid tenant-create-grid-one">
          <label>Importe<input name="importe" type="number" step="any" value="${escapeHtml(amountValue)}" disabled></label>
          <label>Fecha<input name="fecha" type="date" value="${escapeHtml(dateValue)}" disabled></label>
          <label>Estado<input name="estado" type="text" value="${escapeHtml(row.estado || '')}" disabled></label>
          <label>Pagado por<input name="pagado_por" type="text" value="${escapeHtml(paidByValue)}" disabled></label>
        </div>
      </section>
    </div>
    <div class="form-actions">
      <button class="button ghost" id="cancelEditButton" type="button">Volver</button>
    </div>`;
}

function renderTenantCreateForm(tenant = null) {
  const rooms = state.availableRooms || [];
  const editing = Boolean(tenant);
  const passwordPlaceholder = editing && Number(tenant?.has_password || 0) === 1 ? 'Password guardada' : '';
  const documentStatus = tenant?.documento_archivo ? 'Documento guardado' : 'Sin documento guardado';
  const signedContractStatus = tenant?.contrato_firmado_archivo ? 'Contrato guardado' : 'Sin contrato guardado';
  const selectedRoomId = String(tenant?.id_habitacion || '');
  const selectedRoom = rooms.find((room) => String(room.id_habitacion || '') === selectedRoomId);
  const selectedHouseId = String(tenant?.id_vivienda || selectedRoom?.id_vivienda || '');
  const houseOptions = Array.from(new Map(rooms
    .filter((room) => room.id_vivienda || room.nombre_vivienda)
    .map((room) => [
      String(room.id_vivienda || room.nombre_vivienda || ''),
      {
        value: String(room.id_vivienda || room.nombre_vivienda || ''),
        label: String(room.nombre_vivienda || 'Vivienda sin nombre'),
      },
    ])).values())
    .sort((left, right) => left.label.localeCompare(right.label, 'es'))
    .map((house) => `<option value="${escapeHtml(house.value)}" ${String(house.value) === selectedHouseId ? 'selected' : ''}>${escapeHtml(house.label)}</option>`)
    .join('');
  const roomOptions = rooms.map((room) => {
    const totalBeds = Number(room.numero_camas || 0);
    const availableBeds = Number(room.camas_disponibles ?? totalBeds);
    const active = room.activa === true || Number(room.activa) === 1;
    const selected = String(room.id_habitacion) === selectedRoomId;
    const enabledByAvailability = selected || (active && availableBeds > 0);
    const enabled = enabledByAvailability && (!selectedHouseId || String(room.id_vivienda || '') === selectedHouseId || selected);
    const label = [
      room.nombre,
      room.tipo,
      `${availableBeds}/${totalBeds} camas libres`,
      `${formatMoney(room.precio)} €`,
    ].filter(Boolean).join(' · ');

    return `<option value="${escapeHtml(room.id_habitacion)}" data-house-id="${escapeHtml(room.id_vivienda || '')}" data-room-enabled="${enabledByAvailability ? '1' : '0'}" ${selected ? 'selected' : ''} ${enabled ? '' : 'disabled'}>
      ${escapeHtml(label)}${enabled ? '' : ' (no disponible)'}
    </option>`;
  }).join('');

  const currentRoomLabel = [
    tenant?.nombre_vivienda,
    tenant?.nombre_habitacion,
    tenant?.tipo_habitacion || tenant?.tipo,
  ].filter(Boolean).join(' · ') || (selectedRoomId ? 'Habitación sin nombre' : 'Sin asignar');
  const roomSection = editing
  ? `<section class="tenant-create-section">
    <h4>Habitación actual</h4>
    <div class="tenant-create-grid tenant-room-current-grid">
      <label>Habitación<select name="id_habitacion" aria-label="${escapeHtml(currentRoomLabel)}">
        <option value="" ${selectedRoomId ? '' : 'selected'}>Sin asignar</option>
        ${roomOptions || '<option value="" disabled>No hay habitaciones disponibles</option>'}
      </select></label>
      <label>Entrada habitación<input name="fecha_entrada" type="date" value="${dateToInputValue(tenant?.fecha_entrada)}"></label>
      <label>Salida habitación<input name="fecha_salida" type="date" value="${dateToInputValue(tenant?.fecha_salida)}"></label>
    </div>
  </section>
  <section class="tenant-create-section">
    <div class="tenant-create-section-header">
      <h4>Cambios de habitación</h4>
      <button class="button small ghost" data-action="add-room-change" type="button">+ Añadir cambio de habitación</button>
    </div>
    ${renderTenantRoomChangeHistory(tenant)}
    <div class="tenant-room-change-list" data-room-change-list></div>
  </section>`
  : `<section class="tenant-create-section tenant-room-create-section">
    <h4>Habitación</h4>
    <div class="tenant-create-grid tenant-room-create-grid">
      <label class="tenant-room-create-field-house">Asignar vivienda<select name="id_vivienda_asignacion" data-tenant-house-select>
        <option value="" ${selectedHouseId ? '' : 'selected'}>Sin asignar</option>
        ${houseOptions || '<option value="" disabled>No hay viviendas disponibles</option>'}
      </select></label>
      <label class="tenant-room-create-field-room">Asignar habitación<select name="id_habitacion">
        <option value="" ${selectedRoomId ? '' : 'selected'}>Sin asignar</option>
        ${roomOptions || '<option value="" disabled>No hay habitaciones disponibles</option>'}
      </select></label>
      <label class="tenant-room-create-field-date">Fecha entrada<input name="fecha_entrada" type="date" value="${dateToInputValue(tenant?.fecha_entrada) || todayInputValue()}"></label>
      <label class="tenant-room-create-field-date">Fecha salida<input name="fecha_salida" type="date" value="${dateToInputValue(tenant?.fecha_salida)}"></label>
      <label class="tenant-room-create-field-deposit">Fianza
        <span class="input-with-suffix">
          <input name="fianza" type="number" min="0" step="0.01" value="${escapeHtml(getDefaultDepositAmount().toFixed(2))}">
          <span>€</span>
        </span>
      </label>
    </div>
  </section>`;

  resourceForm.innerHTML = `<h3>${editing ? 'Modificar ficha de inquilino' : 'Nueva ficha de inquilino'}</h3>
    ${renderTenantAvatarPicker(tenant)}
    <section class="tenant-create-section tenant-user-create-section">
      <h4>Datos de usuario</h4>
      <div class="tenant-create-grid tenant-user-create-grid">
        <label class="tenant-field-name">Nombre<input name="nombre" type="text" value="${escapeHtml(tenant?.nombre || '')}" data-normalize-case="first-upper" required></label>
        <label class="tenant-field-lastname1">Primer apellido<input name="apellido1" type="text" value="${escapeHtml(tenant?.apellido1 || '')}" data-normalize-case="first-upper" required></label>
        <label class="tenant-field-lastname2">Segundo apellido<input name="apellido2" type="text" value="${escapeHtml(tenant?.apellido2 || '')}" data-normalize-case="first-upper"></label>
        <label class="tenant-field-email">Email<input name="email" type="email" value="${escapeHtml(tenant?.email || '')}" required></label>
        <label class="tenant-field-password">Password<input name="password" type="password" minlength="8" maxlength="16" placeholder="${escapeHtml(passwordPlaceholder)}" autocomplete="new-password" ${editing ? '' : 'required'}></label>
        <label class="tenant-field-phone">Teléfono<input name="telefono" type="tel" value="${escapeHtml(tenant?.telefono || '')}"></label>
        <label class="tenant-field-nationality">Nacionalidad<input name="nacionalidad" type="text" value="${escapeHtml(tenant?.nacionalidad || '')}" data-normalize-case="first-upper"></label>
        <label class="tenant-field-identification">Identificación<select name="identificacion" required>
          <option value="">Selecciona</option>
          <option value="dni" ${tenant?.identificacion === 'dni' ? 'selected' : ''}>Dni</option>
          <option value="nie" ${tenant?.identificacion === 'nie' ? 'selected' : ''}>Nie</option>
          <option value="pasaporte" ${tenant?.identificacion === 'pasaporte' ? 'selected' : ''}>Pasaporte</option>
        </select></label>
        <label class="tenant-field-document">Núm. documento<input name="numero_documento" type="text" value="${escapeHtml(tenant?.numero_documento || '')}" required></label>
        <label class="tenant-comment-field">Comentario<textarea name="comentario">${escapeHtml(tenant?.comentario || '')}</textarea></label>
      </div>
    </section>
    ${roomSection}
    <section class="tenant-create-section">
      <h4>Documentación</h4>
      <div class="tenant-create-grid tenant-create-grid-two">
        <label>Documento de identidad<input name="documento" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"><small>${escapeHtml(documentStatus)}</small></label>
        <label>Contrato firmado<input name="contrato" type="file" accept=".pdf,application/pdf"><small>${escapeHtml(signedContractStatus)}</small></label>
      </div>
    </section>
    <div class="form-actions">
      <button class="button primary" type="submit">${editing ? 'Guardar cambios' : 'Crear ficha'}</button>
      <button class="button ghost" id="cancelEditButton" type="button">Limpiar</button>
    </div>`;

  if (tenant?.id_usuario && tenant?.avatar_archivo) {
    loadUserAvatarInto(resourceForm.querySelector('[data-avatar-preview]'), tenant.id_usuario, '', tenant.avatar_archivo)
      .catch(() => {});
  }
}

function updateTenantRoomOptionsForHouse() {
  const houseSelect = resourceForm?.querySelector('[data-tenant-house-select]');
  const roomSelect = resourceForm?.querySelector('select[name="id_habitacion"]');
  if (!houseSelect || !roomSelect) return;

  const houseId = String(houseSelect.value || '');
  let selectedStillAvailable = !roomSelect.value;
  Array.from(roomSelect.options).forEach((option) => {
    if (!option.value) {
      option.disabled = false;
      return;
    }
    const requiresHouse = isTenantStayMode();
    const matchesHouse = requiresHouse
      ? Boolean(houseId) && String(option.dataset.houseId || '') === houseId
      : !houseId || String(option.dataset.houseId || '') === houseId;
    const enabledByRoom = option.dataset.roomEnabled === '1';
    option.disabled = !(matchesHouse && enabledByRoom);
    if (option.selected && !option.disabled) selectedStillAvailable = true;
  });

  if (!selectedStillAvailable) {
    roomSelect.value = '';
  }
}


function renderTenantStayForm(tenant = {}, readiness = state.tenantStayReadiness) {
  const rooms = state.availableRooms || [];
  const houseOptions = Array.from(new Map(rooms
    .filter((room) => room.id_vivienda || room.nombre_vivienda)
    .map((room) => [
      String(room.id_vivienda || room.nombre_vivienda || ''),
      {
        value: String(room.id_vivienda || room.nombre_vivienda || ''),
        label: String(room.nombre_vivienda || 'Vivienda sin nombre'),
      },
    ])).values())
    .sort((left, right) => left.label.localeCompare(right.label, 'es'))
    .map((house) => `<option value="${escapeHtml(house.value)}">${escapeHtml(house.label)}</option>`)
    .join('');
  const roomOptions = rooms.map((room) => {
    const totalBeds = Number(room.numero_camas || 0);
    const availableBeds = Number(room.camas_disponibles ?? totalBeds);
    const active = room.activa === true || Number(room.activa) === 1;
    const enabledByAvailability = active && availableBeds > 0;
    const label = [
      room.nombre,
      room.tipo,
      `${availableBeds}/${totalBeds} camas libres`,
      `${formatMoney(room.precio)} €`,
    ].filter(Boolean).join(' · ');

    return `<option value="${escapeHtml(room.id_habitacion)}" data-house-id="${escapeHtml(room.id_vivienda || '')}" data-room-enabled="${enabledByAvailability ? '1' : '0'}" ${enabledByAvailability ? '' : 'disabled'}>
      ${escapeHtml(label)}${enabledByAvailability ? '' : ' (no disponible)'}
    </option>`;
  }).join('');
  const tenantName = [tenant.nombre, tenant.apellido1, tenant.apellido2].filter(Boolean).join(' ');
  const stayBlocked = readiness && readiness.ready === false;
  const stayWarning = readiness?.message || '';
  const previousStay = readiness?.previousStay;
  const stayNotice = stayBlocked
    ? `<section class="tenant-create-section tenant-stay-warning">
      <h4>Aviso antes de crear nueva estancia</h4>
      <p>${escapeHtml(stayWarning)}</p>
      ${previousStay ? `<p>Estancia anterior: ${escapeHtml(previousStay.nombre_habitacion || 'Habitación')} · Entrada ${escapeHtml(formatDisplayValue('fecha_entrada', previousStay.fecha_entrada) || '-')} · Salida ${escapeHtml(formatDisplayValue('fecha_salida', previousStay.fecha_salida) || 'pendiente')}</p>` : ''}
    </section>`
    : `<section class="tenant-create-section tenant-stay-warning">
      <h4>Aviso antes de crear nueva estancia</h4>
      <p>La estancia anterior debe tener fecha de salida y la fianza debe estar devuelta o compensada.</p>
    </section>`;

  resourceForm.innerHTML = `<h3>Nueva estancia</h3>
    ${stayNotice}
    <section class="tenant-create-section">
      <h4>Inquilino</h4>
      <div class="tenant-create-grid tenant-create-grid-three">
        <label>Nombre<input type="text" value="${escapeHtml(tenantName || 'Inquilino seleccionado')}" disabled></label>
        <label>Email<input type="text" value="${escapeHtml(tenant.email || '')}" disabled></label>
        <label>Documento<input type="text" value="${escapeHtml(tenant.numero_documento || '')}" disabled></label>
      </div>
    </section>
    <section class="tenant-create-section tenant-room-create-section">
      <h4>Habitación</h4>
      <div class="tenant-create-grid tenant-room-create-grid">
        <label class="tenant-room-create-field-house">Vivienda<select name="id_vivienda_asignacion" data-tenant-house-select required>
          <option value="" selected>Selecciona vivienda</option>
          ${houseOptions || '<option value="" disabled>No hay viviendas disponibles</option>'}
        </select></label>
        <label class="tenant-room-create-field-room">Habitación<select name="id_habitacion" required>
          <option value="" selected>Selecciona habitación</option>
          ${roomOptions || '<option value="" disabled>No hay habitaciones disponibles</option>'}
        </select></label>
        <label class="tenant-room-create-field-date">Fecha entrada<input name="fecha_entrada" type="date" value="${todayInputValue()}" required></label>
        <label class="tenant-room-create-field-date">Fecha salida<input name="fecha_salida" type="date"></label>
        <label class="tenant-room-create-field-deposit">Fianza
          <span class="input-with-suffix">
            <input name="fianza" type="number" min="0" step="0.01" value="${escapeHtml(getDefaultDepositAmount().toFixed(2))}">
            <span>€</span>
          </span>
        </label>
      </div>
    </section>
    <div class="form-actions">
      <button class="button primary" type="submit" ${stayBlocked ? 'disabled' : ''}>Guardar estancia</button>
      <button class="button ghost" id="cancelEditButton" type="button">Cancelar</button>
    </div>`;

  updateTenantRoomOptionsForHouse();
}

function renderHouseForm(house = {}) {
  const editing = Boolean(state.editingId);
  const activeValue = house.activa === false || Number(house.activa) === 0 || String(house.activa).toLowerCase() === 'false' ? 'false' : 'true';
  const houseRooms = editing ? state.editingHouseRooms : [];
  const roomCount = editing ? houseRooms.length : '';
  const roomCountField = editing
    ? `<label>Número de habitaciones<input type="text" value="${escapeHtml(roomCount)}" disabled></label>`
    : '';
  const roomSection = '';
  const houseDataSection = `
    <div class="house-form-panel">
      <section class="tenant-create-section">
        <h4>Datos de vivienda</h4>
        <div class="tenant-create-grid">
          <label>Nombre<input name="nombre" type="text" value="${escapeHtml(house.nombre || '')}" data-normalize-case="first-upper" required></label>
          <label>Dirección<input name="direccion" type="text" value="${escapeHtml(house.direccion || '')}" data-normalize-case="first-upper" required></label>
          <label>Código postal<input name="codigo_postal" type="text" value="${escapeHtml(house.codigo_postal || '')}"></label>
        </div>
      </section>
    </div>`;
  const descriptionSection = `
    <div class="house-form-panel house-description-form-panel">
      <section class="tenant-create-section">
        <h4>Descripción</h4>
        <div class="tenant-create-grid tenant-create-grid-one">
          <label>Descripción<textarea name="descripcion">${escapeHtml(house.descripcion || '')}</textarea></label>
        </div>
      </section>
    </div>`;
  const locationSection = `
    <div class="house-form-panel">
      <section class="tenant-create-section">
        <h4>Ubicación</h4>
        <div class="tenant-create-grid">
          <label>Localidad<input name="localidad" type="text" value="${escapeHtml(house.localidad || '')}" data-normalize-case="first-upper" required></label>
          <label>Provincia<input name="provincia" type="text" value="${escapeHtml(house.provincia || '')}" data-normalize-case="first-upper" required></label>
          <label>Activa<select name="activa">
            <option value="true" ${activeValue === 'true' ? 'selected' : ''}>Sí</option>
            <option value="false" ${activeValue === 'false' ? 'selected' : ''}>No</option>
          </select></label>
          ${roomCountField}
        </div>
      </section>
    </div>`;
  resourceForm.classList.add('house-create-form');
  resourceForm.classList.toggle('house-edit-form', editing);

  const actions = editing
    ? `<div class="form-actions">
        <button class="button primary" type="submit">Guardar cambios</button>
        <button class="button ghost" id="cancelEditButton" type="button">Cancelar</button>
      </div>`
    : `<div class="form-actions">
        <button class="button primary" type="submit">Crear vivienda</button>
      </div>`;

  resourceForm.innerHTML = `<div class="form-header house-form-header">
      <h3>${editing ? 'Modificar vivienda' : 'Nueva vivienda'}</h3>
      ${actions}
    </div>
    <div class="house-form-columns">${houseDataSection}${locationSection}${descriptionSection}${roomSection}</div>`;

}

function renderHouseRoomList(count, rooms = []) {
  const list = $('#houseRoomList');
  if (!list) return;
  const total = Math.max(0, Math.min(50, Number.parseInt(count, 10) || 0));
  list.innerHTML = Array.from({ length: total }, (_, index) => {
    const room = rooms[index] || {};
    const selectedType = room.tipo || 'mediana';
    const isExistingRoom = Boolean(room.id_habitacion);
    const priceStartDate = dateToInputValue(room.fecha_precio_desde);
    return `<fieldset class="house-room-item">
      <legend>Habitación ${index + 1}</legend>
      <input name="room_id_${index}" type="hidden" value="${escapeHtml(room.id_habitacion || '')}">
      <input name="room_precio_original_${index}" type="hidden" value="${escapeHtml(room.precio ?? '')}">
      <div class="tenant-create-grid">
        <label>Nombre<input name="room_nombre_${index}" type="text" value="${escapeHtml(room.nombre || `Habitación ${index + 1}`)}" required></label>
        <label>Tipo<select name="room_tipo_${index}" required>
          ${HOUSE_ROOM_TYPES.map(([value, label]) => `<option value="${value}" ${selectedType === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select></label>
        <label>Número de camas<input name="room_numero_camas_${index}" type="number" min="1" step="1" value="${escapeHtml(room.numero_camas || '1')}" required></label>
        <label>Precio actual<input name="room_precio_${index}" type="number" step="any" min="0" value="${escapeHtml(room.precio ?? '0')}"></label>
        ${isExistingRoom ? `<label>Aplicar precio desde<input name="room_fecha_precio_desde_${index}" type="date" value="${escapeHtml(priceStartDate)}"></label><button class="button small primary" data-action="accept-room-price" data-room-index="${index}" type="button">Aceptar precio</button>` : ''}
      </div>
    </fieldset>`;
  }).join('');
}

function renderRoomsManagementPanel(rooms = []) {
  if (!resourceForm || state.activeResource !== resources.rooms) return;
  resourceForm.classList.remove('hidden');
  resourceForm.classList.add('house-create-form');
  splitLayout?.classList.add('table-full-width');

  resourceForm.innerHTML = `<section class="tenant-create-section">
    <h4>Habitaciones</h4>
    <div class="house-room-list" id="roomsManagementList">
      ${rooms.map((room, index) => {
        const selectedType = room.tipo || 'mediana';
        const priceStartDate = dateToInputValue(room.fecha_precio_desde);
        return `<fieldset class="house-room-item" data-managed-room-index="${index}">
          <legend>${escapeHtml(room.nombre || `Habitación ${index + 1}`)}</legend>
          <input name="managed_room_id_${index}" type="hidden" value="${escapeHtml(room.id_habitacion || '')}">
          <input name="managed_room_house_${index}" type="hidden" value="${escapeHtml(room.id_vivienda || '')}">
          <input name="managed_room_precio_original_${index}" type="hidden" value="${escapeHtml(room.precio ?? '')}">
          <div class="tenant-create-grid">
            <label>Vivienda<input name="managed_room_vivienda_${index}" type="text" value="${escapeHtml(room.nombre_vivienda || room.id_vivienda || '')}" disabled></label>
            <label>Nombre<input name="managed_room_nombre_${index}" type="text" value="${escapeHtml(room.nombre || '')}" required></label>
            <label>Tipo<select name="managed_room_tipo_${index}" required>
              ${HOUSE_ROOM_TYPES.map(([value, label]) => `<option value="${value}" ${selectedType === value ? 'selected' : ''}>${label}</option>`).join('')}
            </select></label>
            <label>Número de camas<input name="managed_room_numero_camas_${index}" type="number" min="1" step="1" value="${escapeHtml(room.numero_camas || '1')}" required></label>
            <label>Precio actual<input name="managed_room_precio_${index}" type="number" step="any" min="0" value="${escapeHtml(room.precio ?? '0')}"></label>
            <label>Aplicar precio desde<input name="managed_room_fecha_precio_desde_${index}" type="date" value="${escapeHtml(priceStartDate)}"></label>
            <button class="button small primary" data-action="accept-managed-room-price" data-room-index="${index}" type="button">Aceptar precio</button>
          </div>
        </fieldset>`;
      }).join('')}
    </div>
  </section>`;
}

function getManagedRoomDraft(index) {
  return {
    id_habitacion: resourceForm.querySelector(`[name="managed_room_id_${index}"]`)?.value || '',
    id_vivienda: resourceForm.querySelector(`[name="managed_room_house_${index}"]`)?.value || '',
    nombre: resourceForm.querySelector(`[name="managed_room_nombre_${index}"]`)?.value || '',
    tipo: resourceForm.querySelector(`[name="managed_room_tipo_${index}"]`)?.value || 'mediana',
    numero_camas: resourceForm.querySelector(`[name="managed_room_numero_camas_${index}"]`)?.value || '1',
    precio: resourceForm.querySelector(`[name="managed_room_precio_${index}"]`)?.value || '0',
    precio_original: resourceForm.querySelector(`[name="managed_room_precio_original_${index}"]`)?.value || '',
    fecha_precio_desde: resourceForm.querySelector(`[name="managed_room_fecha_precio_desde_${index}"]`)?.value || '',
  };
}

async function saveManagedRoomDetails(index) {
  if (state.activeResource !== resources.rooms) return;
  const room = getManagedRoomDraft(index);
  if (!room.id_habitacion) return;
  await request(`${resources.rooms.endpoint}/${room.id_habitacion}`, {
    method: 'PUT',
    body: JSON.stringify({
      nombre: room.nombre.trim(),
      tipo: room.tipo,
      numero_camas: Number.parseInt(room.numero_camas, 10),
    }),
  });
  showToast('Habitación actualizada');
  await loadRows();
}

async function acceptManagedRoomPrice(index) {
  if (state.activeResource !== resources.rooms) return;
  const room = getManagedRoomDraft(index);
  if (!room.id_habitacion) return;

  const currentPrice = Number(room.precio || 0);
  const originalPrice = room.precio_original === '' ? currentPrice : Number(room.precio_original || 0);
  if (currentPrice < 0) {
    throw new Error('El precio debe ser mayor o igual que 0');
  }
  if (currentPrice === originalPrice) {
    showToast('El precio no ha cambiado');
    return;
  }
  if (!room.fecha_precio_desde) {
    const dateInput = resourceForm.querySelector(`[name="managed_room_fecha_precio_desde_${index}"]`);
    showToast('Indica la fecha desde la que se aplica el precio', 'error');
    dateInput?.focus();
    dateInput?.showPicker?.();
    return;
  }

  await request(`${resources.rooms.endpoint}/${room.id_habitacion}`, {
    method: 'PUT',
    body: JSON.stringify({
      precio: currentPrice,
      fecha_precio_desde: inputDateToDisplay(room.fecha_precio_desde),
    }),
  });

  showToast('Precio aplicado desde la fecha indicada');
  await loadRows();
}

function getHouseRoomDrafts() {
  const count = Number.parseInt(resourceForm.querySelector('#houseRoomCount')?.value, 10) || 0;
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    id_habitacion: resourceForm.querySelector(`[name="room_id_${index}"]`)?.value || '',
    nombre: resourceForm.querySelector(`[name="room_nombre_${index}"]`)?.value || '',
    tipo: resourceForm.querySelector(`[name="room_tipo_${index}"]`)?.value || 'mediana',
    numero_camas: resourceForm.querySelector(`[name="room_numero_camas_${index}"]`)?.value || '1',
    precio: resourceForm.querySelector(`[name="room_precio_${index}"]`)?.value || '0',
    precio_original: resourceForm.querySelector(`[name="room_precio_original_${index}"]`)?.value || '',
    fecha_precio_desde: resourceForm.querySelector(`[name="room_fecha_precio_desde_${index}"]`)?.value || '',
  }));
}

function getCreatedHouseId(result) {
  return result?.house?.id_vivienda
    || result?.id_vivienda
    || result?.data?.id_vivienda
    || result?.insertId;
}

async function createHouseWithRooms(resource) {
  normalizeCaseFields(resourceForm);
  const data = formDataToObject(resourceForm);
  Object.keys(data).forEach((key) => {
    if (key === 'numero_habitaciones' || key.startsWith('room_')) delete data[key];
  });

  await request(resource.endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function reconcileHouseRoomCount(targetCount) {
  const desiredCount = Math.max(1, Math.min(50, Number.parseInt(targetCount, 10) || 1));
  const activeRooms = (state.editingHouseRooms || [])
    .filter((room) => Number(room.activa ?? 1) !== 0)
    .sort((left, right) => Number(left.id_habitacion || 0) - Number(right.id_habitacion || 0));
  const currentCount = activeRooms.length;

  if (desiredCount === currentCount) return;

  if (desiredCount > currentCount) {
    const roomsToCreate = desiredCount - currentCount;
    for (let index = 0; index < roomsToCreate; index += 1) {
      const roomNumber = currentCount + index + 1;
      await request(resources.rooms.endpoint, {
        method: 'POST',
        body: JSON.stringify({
          id_vivienda: state.editingId,
          nombre: `Habitación ${roomNumber}`,
          tipo: 'mediana',
          numero_camas: 1,
          precio: 0,
          activa: true,
        }),
      });
    }
    return;
  }

  const tenantPayload = await request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`).catch(() => []);
  const tenantRows = normalizeTenantRows(getRows(tenantPayload));
  const roomsToDeactivateCount = currentCount - desiredCount;
  const removableRooms = activeRooms
    .slice()
    .reverse()
    .filter((room) => !roomIsOccupied(room, tenantRows));

  if (removableRooms.length < roomsToDeactivateCount) {
    throw new Error('No se puede reducir a ese número porque hay habitaciones ocupadas');
  }

  for (const room of removableRooms.slice(0, roomsToDeactivateCount)) {
    await request(`${resources.rooms.endpoint}/${room.id_habitacion}`, {
      method: 'PUT',
      body: JSON.stringify({ activa: 0 }),
    });
  }
}

async function updateHouseWithRooms(resource, options = {}) {
  const syncRoomCount = options.syncRoomCount !== false;
  normalizeCaseFields(resourceForm);
  const data = formDataToObject(resourceForm);
  const requestedRoomCount = data.numero_habitaciones;
  Object.keys(data).forEach((key) => {
    if (key === 'numero_habitaciones' || key.startsWith('room_')) delete data[key];
  });

  await request(`${resource.endpoint}/${state.editingId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!syncRoomCount || !resourceForm.querySelector('#houseRoomCount')) {
    return;
  }

  await reconcileHouseRoomCount(requestedRoomCount);
  state.editingHouseRooms = await loadHouseRooms(state.editingId);
}

async function acceptHouseRoomPrice(index) {
  if (!isHouseEditMode()) return;

  const room = getHouseRoomDrafts()[index];
  if (!room?.id_habitacion) {
    throw new Error('Guarda primero la habitación antes de aplicar un cambio de precio');
  }

  const currentPrice = Number(room.precio || 0);
  const originalPrice = room.precio_original === '' ? currentPrice : Number(room.precio_original || 0);
  if (currentPrice < 0) {
    throw new Error('El precio debe ser mayor o igual que 0');
  }
  if (currentPrice === originalPrice) {
    showToast('El precio no ha cambiado');
    return;
  }
  if (!room.fecha_precio_desde) {
    const dateInput = resourceForm.querySelector(`[name="room_fecha_precio_desde_${index}"]`);
    showToast('Indica la fecha desde la que se aplica el precio', 'error');
    dateInput?.focus();
    dateInput?.showPicker?.();
    return;
  }

  await request(`${resources.rooms.endpoint}/${room.id_habitacion}`, {
    method: 'PUT',
    body: JSON.stringify({
      precio: currentPrice,
      fecha_precio_desde: inputDateToDisplay(room.fecha_precio_desde),
    }),
  });

  const originalInput = resourceForm.querySelector(`[name="room_precio_original_${index}"]`);
  if (originalInput) originalInput.value = String(currentPrice);
  if (state.editingHouseRooms[index]) {
    state.editingHouseRooms[index].precio = currentPrice;
    state.editingHouseRooms[index].fecha_precio_desde = inputDateToDisplay(room.fecha_precio_desde);
  }
  showToast('Precio aplicado desde la fecha indicada');
}

function scheduleHouseAutoSave() {
  if (!isHouseEditMode()) {
    window.clearTimeout(houseAutoSaveTimer);
    houseAutoSaveTimer = null;
    houseAutoSavePending = false;
    return;
  }

  houseAutoSavePending = true;
  window.clearTimeout(houseAutoSaveTimer);
  houseAutoSaveTimer = window.setTimeout(() => {
    autoSaveHouseForm().catch((error) => showToast(error.message, 'error'));
  }, 700);
}

async function autoSaveHouseForm() {
  if (!isHouseEditMode()) {
    window.clearTimeout(houseAutoSaveTimer);
    houseAutoSaveTimer = null;
    houseAutoSavePending = false;
    return;
  }
  if (houseAutoSaveInFlight) {
    houseAutoSavePending = true;
    return;
  }
  if (!resourceForm.checkValidity()) return;

  const roomDrafts = getHouseRoomDrafts();
  const shouldRefreshRooms = roomDrafts.some((room) => !room.id_habitacion)
    || roomDrafts.length !== state.editingHouseRooms.length;
  const formSnapshot = formDataToObject(resourceForm);

  houseAutoSaveInFlight = true;
  houseAutoSavePending = false;
  try {
    await updateHouseWithRooms(resources.houses, { syncRoomCount: false });
    if (shouldRefreshRooms) {
      state.editingHouseRooms = await loadHouseRooms(state.editingId);
      renderHouseForm(formSnapshot);
    }
  } finally {
    houseAutoSaveInFlight = false;
    if (houseAutoSavePending && isHouseEditMode()) {
      scheduleHouseAutoSave();
    }
  }
}

async function loadRows() {
  if (isTenantFullFormMode() || isTenantStayMode() || isHouseFormMode() || isExpenseCreateMode()) {
    state.rows = [];
    tableWrap?.classList.add('hidden');
    updateExpenseTotal([], state.activeResource);
    state.activeLiquidationDetailId = null;
    state.activeTenantDetailId = null;
    detailPanel?.classList.add('hidden');
    if (detailPanel) detailPanel.innerHTML = '';
    updateTenantSortFilterVisibility();
    return;
  }

  const resource = state.activeResource;
  tableWrap?.classList.remove('hidden');
  if (resource === resources.ownerExpenses) {
    const [ownerPayload, tenantPayload, tenantsPayload] = await Promise.all([
      request(`${getResourceEndpoint(resources.ownerExpenses)}?page=1&limit=100`),
      request(`${getResourceEndpoint(resources.expenses)}?page=1&limit=100`),
      request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`).catch(() => null),
    ]);
    const tenantExpenseRows = await enrichTenantExpenseRowsWithNames(
      normalizeTenantExpenseRows(getRows(tenantPayload).filter((row) => !isTenantDepositExpense(row))),
      getRows(tenantsPayload),
    );
    state.rows = [
      ...normalizeOwnerExpenseRows(getRows(ownerPayload)),
      ...tenantExpenseRows,
    ].sort((left, right) => getExpenseDateTime(right) - getExpenseDateTime(left));
  } else if (isDepositResource(resource)) {
    const payload = await request(`${getResourceEndpoint(resource)}?page=1&limit=100`);
    state.rows = getRows(payload);
    state.pendingPaymentOptions = state.rows.slice();
  } else if (isPaymentResource(resource) && getCurrentRole() !== 'inquilino') {
    state.rows = await loadPaymentLedgerRows();
    state.pendingPaymentOptions = state.rows.slice();
  } else if (resource === resources.ownerLiquidations) {
    state.rows = await loadAccountingRows();
    initializeAccountingPeriod(state.rows);
    updateAccountingCalendar();
  } else if (resource === resources.rooms) {
    const [roomsPayload, tenantsPayload, housesPayload] = await Promise.all([
      request(`${getResourceEndpoint(resource)}?page=1&limit=100`),
      request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`).catch(() => []),
      request(`${getResourceEndpoint(resources.houses)}?page=1&limit=500&activa=1`).catch(() => []),
    ]);
    const tenantRows = normalizeTenantRows(getRows(tenantsPayload));
    state.adminRoomHouseOptions = getRows(housesPayload);
    state.rows = addRoomAvailability(getRows(roomsPayload), tenantRows);
  } else if (resource === resources.houses && !isAdminMenuMode()) {
    const statusParam = state.houseStatusFilter === 'todas'
      ? 'todas'
      : state.houseStatusFilter === 'desactivadas'
        ? '0'
        : '1';
    const payload = await request(`${getResourceEndpoint(resource)}?page=1&limit=100&activa=${encodeURIComponent(statusParam)}`);
    state.rows = getRows(payload);
  } else {
    const payload = await request(`${getResourceEndpoint(resource)}?page=1&limit=100`);
    const rows = getRows(payload);
    if (resource === resources.tenants) state.tenantAssignmentRows = rows;
    state.rows = resource === resources.expenses
      ? normalizeTenantExpenseRows(rows.filter((row) => !isTenantDepositExpense(row)))
      : resource === resources.tenants
        ? normalizeTenantRows(rows)
      : rows;
  }
  await loadExpenseHouseOptions(state.rows);
  updateExpenseFilterOptions(state.rows);
  if (resource !== resources.ownerLiquidations) {
    clearDetailPanel();
  }
  renderTable();
  if (resource === resources.rooms) {
    await openRoomsSectionHouseDetail();
  }
}

function renderTable() {
  const resource = state.activeResource;
  const columns = getResourceColumns(resource);
  const readOnly = isResourceReadOnly(resource);
  const mutableRows = canMutateRows(resource);
  const query = searchInput.value.trim().toLowerCase();
  const rows = state.rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
  const resourceFilteredRows = applyResourceFilter(rows, resource);
  const filteredRows = resource === resources.tenants
    ? applyTenantSortFilter(resourceFilteredRows)
    : isPaymentResource(resource)
      ? sortPaymentsByTenantName(resourceFilteredRows)
    : resourceFilteredRows;
  updateExpenseTotal(filteredRows, resource);
  tableWrap?.classList.remove('accounting-table-wrap');
  if (resource === resources.ownerLiquidations) {
    renderAccountingTable(filteredRows);
    return;
  }
  const hasReadOnlyActions = rows.some((row) => getRowActions(resource, row).length > 0);
  const actionMode = state.resourceAction;
  const usesResourceMenu = Object.keys(resourceMenuActions).some((section) => resources[section] === resource);
  const showMutableActions = mutableRows
    && !isFinancialFilterResource(resource)
    && (!usesResourceMenu || ['update', 'delete'].includes(actionMode))
    && !(resource === resources.houses && actionMode === 'update');
  const showActions = !isFinancialFilterResource(resource) && (showMutableActions || hasReadOnlyActions);

  tableHead.innerHTML = `<tr>${columns.map((column) => `<th>${formatColumnTitle(column)}</th>`).join('')}${showActions ? '<th>Acciones</th>' : ''}</tr>`;
  tableBody.innerHTML = filteredRows.map((row) => {
    const id = getValue(row, resource.idKey);
    const rowActions = getRowActions(resource, row);
    return `<tr${getRowClass(resource, row)}${getRowDataAttributes(resource, row)}>
      ${columns.map((column) => `<td>${escapeHtml(formatTableValue(resource, row, column) ?? '')}</td>`).join('')}
      ${showActions ? `<td><div class="row-actions">
        ${showMutableActions && actionMode !== 'delete' ? `
          <button class="button small ghost" data-action="edit" data-id="${id}" type="button">Editar</button>
        ` : ''}
        ${showMutableActions && actionMode !== 'update' ? `
          <button class="button small danger" data-action="delete" data-id="${id}" type="button">Borrar</button>
        ` : ''}
        ${rowActions.map((item) => `<button class="button small ghost" data-action="${item.action}" data-id="${item.id}" type="button">${item.label}</button>`).join('')}
      </div></td>` : ''}
    </tr>`;
  }).join('');

  if (!filteredRows.length) {
    tableBody.innerHTML = `<tr><td class="empty" colspan="${columns.length + (showActions ? 1 : 0)}">No hay registros para mostrar.</td></tr>`;
  }
}

function getLiquidationExpensesTotal(row = {}) {
  return parseMoneyValue(row.gastos_vivienda)
    + parseMoneyValue(row.gastos_recuperados)
    + parseMoneyValue(row.pagos_pendientes);
}

function getAccountingPaymentAccount(row = {}) {
  if (isDepositPaymentRow(row)) return { code: '2310', account: 'Fianzas recibidas' };
  if (String(row.gasto_de_value || '').toLowerCase() === 'mensualidad') {
    return { code: '4010', account: 'Ingresos por alquiler' };
  }
  return { code: '4070', account: 'Ingresos por gastos repercutidos' };
}

function createAccountingEntry({ id = '', code, account, debit = 0, credit = 0, description = '', mes = '', anio = '', fecha = '' }) {
  return {
    accounting_entry: true,
    id,
    code,
    account: description ? `${account} · ${description}` : account,
    debit,
    credit,
    mes,
    anio,
    fecha,
  };
}

function buildAccountingRowsFromFinancialData(payments = [], ownerExpenses = []) {
  const entries = [];

  payments.forEach((payment) => {
    const history = Array.isArray(payment.payment_history) && payment.payment_history.length
      ? payment.payment_history
      : [{
        amount: getPaidPaymentAmount(payment),
        date: payment.fecha_pago || payment.fecha_recibo || payment.fecha || '',
        method: /compensad[oa].*fianza/i.test(String(payment.comentarios || ''))
          ? 'Compensado con fianza'
          : String(payment.comentarios || '').match(/Forma de pago:\s*([^·]+)/)?.[1]?.trim() || '',
      }];
    const targetAccount = getAccountingPaymentAccount(payment);
    const operationId = payment.id_pago_inquilino || payment.payment_key || payment.id_gasto || '';

    history.forEach((item) => {
      const amount = parseMoneyValue(item.amount);
      const entryDate = dateToInputValue(item.date) || dateToInputValue(payment.fecha_pago) || dateToInputValue(payment.fecha_recibo) || dateToInputValue(payment.fecha);
      const paymentMethod = item.method || String(item.comments || '').match(/Forma de pago:\s*([^·]+)/)?.[1]?.trim() || '';
      const description = [
        payment.nombre_inquilino,
        payment.concepto,
        paymentMethod,
        formatDisplayValue('fecha_pago', item.date || payment.fecha_recibo || payment.fecha),
      ].filter(Boolean).join(' · ');
      if (amount > 0) {
        entries.push(
          createAccountingEntry({ id: operationId, code: '1011', account: 'Bancos', debit: amount, description, mes: payment.mes, anio: payment.anio, fecha: entryDate }),
          createAccountingEntry({ id: operationId, code: targetAccount.code, account: targetAccount.account, credit: amount, description, mes: payment.mes, anio: payment.anio, fecha: entryDate }),
        );
      } else if (amount < 0) {
        const refundAmount = Math.abs(amount);
        const refundDescription = [description, 'Devolución'].filter(Boolean).join(' · ');
        const refundDebitAccount = isDepositPaymentRow(payment)
          ? { code: '2310', account: 'Fianzas recibidas' }
          : targetAccount;
        entries.push(
          createAccountingEntry({ id: operationId, code: refundDebitAccount.code, account: refundDebitAccount.account, debit: refundAmount, description: refundDescription, mes: payment.mes, anio: payment.anio, fecha: entryDate }),
          createAccountingEntry({ id: operationId, code: '1011', account: 'Bancos', credit: refundAmount, description: refundDescription, mes: payment.mes, anio: payment.anio, fecha: entryDate }),
        );
      }
    });
  });

  ownerExpenses
    .filter((expense) => !isCancelledExpense(expense))
    .forEach((expense) => {
      const amount = parseMoneyValue(expense.importe ?? expense.importe_total);
      if (amount <= 0) return;
      const monthData = getRowMonthData(expense);
      const description = [
        expense.nombre_vivienda,
        expense.concepto || expense.descripcion || expense.tipo,
        formatDisplayValue('fecha', expense.fecha),
      ].filter(Boolean).join(' · ');
      const entryDate = dateToInputValue(expense.fecha);
      const operationId = expense.id_gasto_propietario || expense.expense_id || '';
      entries.push(
        createAccountingEntry({ id: operationId, code: '5110', account: 'Gastos del propietario', debit: amount, description, mes: monthData.month, anio: monthData.year, fecha: entryDate }),
        createAccountingEntry({ id: operationId, code: '1011', account: 'Bancos', credit: amount, description, mes: monthData.month, anio: monthData.year, fecha: entryDate }),
      );
    });

  return entries;
}

async function loadAccountingRows() {
  const payload = await request(`${getResourceEndpoint(resources.ownerLiquidations)}?page=1&limit=100`);
  const liquidations = getRows(payload);
  if (liquidations.length) return liquidations;

  const [payments, ownerExpensePayload] = await Promise.all([
    loadPaymentLedgerRows(),
    request(`${getResourceEndpoint(resources.ownerExpenses)}?page=1&limit=100`),
  ]);
  return buildAccountingRowsFromFinancialData(
    payments,
    normalizeOwnerExpenseRows(getRows(ownerExpensePayload)),
  );
}

function getAccountingRows(rows = []) {
  if (rows.some((row) => row.accounting_entry)) {
    return rows.map((row) => ({
      ...row,
      debit: parseMoneyValue(row.debit),
      credit: parseMoneyValue(row.credit),
    }));
  }

  return rows.flatMap((row) => {
    const id = getValue(row, 'id_liquidacion');
    const period = [getValue(row, 'mes'), getValue(row, 'anio')].filter(Boolean).join('/');
    const house = getValue(row, 'nombre_vivienda') || 'Vivienda';
    const income = parseMoneyValue(row.ingresos_alquiler ?? row.ingresos);
    const expenses = getLiquidationExpensesTotal(row);
    const ownerAmount = parseMoneyValue(row.importe_propietario);
    const description = `${house}${period ? ` · ${period}` : ''}`;
    const entries = [];

    if (income > 0) {
      entries.push(
        { id, code: '1011', account: `Bancos · ${description}`, debit: income, credit: 0 },
        { id, code: '4010', account: `Ingresos por alquiler · ${description}`, debit: 0, credit: income },
      );
    }

    if (expenses > 0) {
      entries.push(
        { id, code: '5110', account: `Gastos de vivienda · ${description}`, debit: expenses, credit: 0 },
        { id, code: '1011', account: `Bancos · ${description}`, debit: 0, credit: expenses },
      );
    }

    if (ownerAmount > 0) {
      entries.push(
        { id, code: '2210', account: `Liquidación propietario · ${description}`, debit: ownerAmount, credit: 0 },
        { id, code: '1011', account: `Bancos · ${description}`, debit: 0, credit: ownerAmount },
      );
    }

    return entries;
  });
}

function renderAccountingTable(rows = []) {
  const accountingRows = getAccountingRows(rows);
  const totalDebit = accountingRows.reduce((total, row) => total + row.debit, 0);
  const totalCredit = accountingRows.reduce((total, row) => total + row.credit, 0);

  tableWrap?.classList.add('accounting-table-wrap');
  tableHead.innerHTML = `<tr class="accounting-title-row">
    <th colspan="4">Libro diario</th>
  </tr>
  <tr>
    <th>Id_operacion</th>
    <th>Concepto</th>
    <th>Debe</th>
    <th>Haber</th>
  </tr>`;

  tableBody.innerHTML = accountingRows.map((row) => {
    const canOpenDetail = row.id && !row.accounting_entry;
    const rowAttributes = canOpenDetail
      ? ` class="clickable-row accounting-row" data-action="open-liquidation-detail" data-id="${escapeHtml(row.id)}"`
      : ' class="accounting-row"';
    return `<tr${rowAttributes}>
    <td class="accounting-code">${escapeHtml(row.id || row.code)}</td>
    <td>${escapeHtml(row.account)}</td>
    <td class="accounting-amount">${row.debit ? escapeHtml(formatMoney(row.debit)) : ''}</td>
    <td class="accounting-amount">${row.credit ? escapeHtml(formatMoney(row.credit)) : ''}</td>
  </tr>`;
  }).join('');

  if (!accountingRows.length) {
    tableBody.innerHTML = '<tr><td class="empty" colspan="4">No hay movimientos contables para mostrar en este periodo.</td></tr>';
  } else {
    tableBody.innerHTML += `<tr class="accounting-total-row">
      <td colspan="2"></td>
      <td class="accounting-amount">${escapeHtml(formatMoney(totalDebit))}</td>
      <td class="accounting-amount">${escapeHtml(formatMoney(totalCredit))}</td>
    </tr>`;
  }
}

function formDataToObject(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (value === '') return;
    if (value === 'true') data[key] = true;
    else if (value === 'false') data[key] = false;
    else data[key] = value;
  });
  return data;
}

function normalizeTenantExpenseType(type) {
  return ['electricidad', 'agua', 'gas', 'internet', 'comunidad', 'fianza', 'otros'].includes(type) ? type : 'otros';
}

function normalizeOwnerExpenseType(type) {
  return ['mantenimiento', 'reparacion', 'comision', 'impuesto', 'seguro', 'hipoteca', 'otros'].includes(type) ? type : 'otros';
}

function getCreatedTenantId(result = {}) {
  return result?.tenant?.id_inquilino
    || result?.tenant?.tenant?.id_inquilino
    || result?.id_inquilino
    || '';
}

function getTenantDepositHouseId(result = {}, roomId = '') {
  return result?.tenant?.id_vivienda
    || result?.tenant?.roomAssignment?.id_vivienda
    || result?.tenant?.habitacion?.id_vivienda
    || state.availableRooms.find((room) => String(room.id_habitacion || '') === String(roomId || ''))?.id_vivienda
    || '';
}

async function createTenantDepositExpense({ result, roomId, entryDate, amount }) {
  const depositAmount = parseMoneyValue(amount);
  if (depositAmount <= 0) return null;

  const tenantId = getCreatedTenantId(result);
  const houseId = getTenantDepositHouseId(result, roomId);
  if (!tenantId || !houseId || !entryDate) {
    throw new Error('No se pudo crear la fianza automáticamente porque falta inquilino, vivienda o fecha de entrada');
  }

  return request(resources.deposits.endpoint, {
    method: 'POST',
    body: JSON.stringify({
      id_vivienda: houseId,
      id_inquilino: tenantId,
      id_habitacion_inquilino: result?.tenant?.id_habitacion_inquilino || result?.tenant?.roomTenantId || null,
      importe: depositAmount,
      fecha_fianza: entryDate,
      estado: 'pendiente',
      comentarios: 'Fianza creada automáticamente',
    }),
  });
}

async function createExpenseFromForm() {
  normalizeCaseFields(resourceForm);
  const data = formDataToObject(resourceForm);
  const expenseTarget = data.gasto_de || 'vivienda';
  const selectedTenant = state.expenseTenantOptions.find((tenant) => String(tenant.value) === String(data.id_inquilino));
  if (expenseTarget === 'inquilino' && !selectedTenant) {
    throw new Error('Selecciona un inquilino');
  }
  const rawConcept = data.concepto === 'otros'
    ? String(data.concepto_otro || '').trim()
    : data.concepto;
  const concept = normalizeFirstUpperRestLower(rawConcept);
  if (!concept) {
    throw new Error('Indica el tipo del gasto');
  }
  const startDate = inputDateToDisplay(data.fecha_inicio);
  const endDate = inputDateToDisplay(data.fecha_fin);
  if (!startDate || !endDate) {
    throw new Error('Indica el periodo facturado');
  }
  if (data.fecha_fin < data.fecha_inicio) {
    throw new Error('La fecha final no puede ser anterior a la fecha inicial');
  }
  delete data.gasto_de;
  delete data.concepto_otro;

  if (expenseTarget === 'propietario') {
    await request(resources.ownerExpenses.endpoint, {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        concepto: concept,
        fecha: startDate,
        tipo: normalizeOwnerExpenseType(data.concepto),
      }),
    });
    return 'Gasto de propietario creado';
  }

  const result = await request(resources.expenses.endpoint, {
    method: 'POST',
    body: JSON.stringify({
      id_vivienda: expenseTarget === 'inquilino' ? selectedTenant.houseId : data.id_vivienda,
      id_inquilino: expenseTarget === 'inquilino' ? data.id_inquilino : null,
      gasto_de: expenseTarget,
      tipo: normalizeTenantExpenseType(data.concepto),
      descripcion: data.descripcion || concept || '',
      importe_total: data.importe,
      fecha_inicio: startDate,
      fecha_fin: endDate,
      estado: data.estado || 'pendiente',
      pagado_por: data.pagado_por || null,
    }),
  });
  return result?.msg || (expenseTarget === 'inquilino' ? 'Gasto de inquilino creado' : 'Gasto de vivienda creado');
}

async function submitResource(event) {
  event.preventDefault();
  if (state.activeExpenseDetailRow) return;
  const resource = state.activeResource;
  const wasHouseFormMode = isHouseFormMode();
  if (isAdminMenuMode() && state.activeSection === 'liquidations') {
    await submitAdminLiquidationForm();
    return;
  }

  if (isResourceReadOnly(resource)) {
    showToast('No tienes permisos para modificar este recurso', 'error');
    return;
  }

  if (isAdminMenuMode() && state.activeSection === 'owners') {
    await submitAdminOwnerForm();
    return;
  }

  if (isAdminMenuMode() && state.activeSection === 'houses') {
    await submitAdminHouseForm();
    return;
  }

  if (isAdminMenuMode() && state.activeSection === 'rooms') {
    await submitAdminRoomForm();
    return;
  }

  if (state.activeSection === 'rooms' && state.resourceAction === 'create') {
    await submitAdminRoomForm();
    return;
  }

  if (isAdminMenuMode() && state.activeSection === 'tenants') {
    await submitAdminTenantForm();
    return;
  }

  if (isAdminMenuMode() && state.activeSection === 'payments') {
    await submitAdminPaymentForm();
    return;
  }

  if (isAdminMenuMode() && state.activeSection === 'expenses') {
    await submitAdminExpenseForm();
    return;
  }

  if (isTenantStayMode()) {
    const tenantId = state.editingTenantFull?.id_inquilino || state.activeTenantDetailId;
    const data = new FormData(resourceForm);
    const roomId = String(data.get('id_habitacion') || '');
    const entryDate = String(data.get('fecha_entrada') || '');
    const exitDate = String(data.get('fecha_salida') || '');
    const depositAmount = parseMoneyValue(data.get('fianza'));

    if (state.tenantStayReadiness && state.tenantStayReadiness.ready === false) {
      throw new Error(state.tenantStayReadiness.message || 'Completa la salida y la fianza de la estancia anterior antes de crear una nueva estancia');
    }

    if (!tenantId) throw new Error('Selecciona un inquilino');
    if (!roomId) throw new Error('Selecciona una habitación');
    if (!entryDate) throw new Error('Indica la fecha de entrada');

    const result = await request(`/api/tenant/${tenantId}/stay`, {
      method: 'POST',
      body: JSON.stringify({
        id_habitacion: roomId,
        fecha_entrada: inputDateToDisplay(entryDate),
        fecha_salida: exitDate ? inputDateToDisplay(exitDate) : '',
      }),
    });

    if (depositAmount > 0) {
      await createTenantDepositExpense({
        result,
        roomId,
        entryDate: inputDateToDisplay(entryDate),
        amount: depositAmount,
      });
    }

    showToast('Nueva estancia guardada');
    state.editingTenantFull = null;
    state.tenantStayReadiness = null;
    state.resourceAction = null;
    state.activeTenantDetailId = tenantId;
    await loadSection('tenants');
    state.activeTenantDetailId = tenantId;
    renderTenantSectionActions();
    return;
  }

  if (isTenantFullFormMode()) {
    normalizeCaseFields(resourceForm);
    const data = new FormData(resourceForm);
    const editing = isTenantFullEditMode();
    const selectedRoomIdForDeposit = String(data.get('id_habitacion') || '');
    const currentRoomId = String(state.editingTenantFull?.id_habitacion || '');
    const hadRoomAssignment = editing
      ? Boolean(state.editingTenantFull?.id_habitacion || state.editingTenantFull?.id_habitacion_inquilino)
      : false;
    const depositAmount = editing && !hadRoomAssignment
      ? getDefaultDepositAmount()
      : parseMoneyValue(data.get('fianza'));
    const changeRoomIds = editing ? data.getAll('change_id_habitacion').map((value) => String(value || '')) : [];
    const changeDates = editing ? data.getAll('fecha_cambio').map((value) => String(value || '')) : [];
    const roomChanges = changeRoomIds
      .map((roomId, index) => ({
        id_habitacion: roomId,
        fecha_cambio: changeDates[index] || '',
      }))
      .filter((change) => change.id_habitacion || change.fecha_cambio);
    if (
      editing
      && currentRoomId
      && selectedRoomIdForDeposit
      && selectedRoomIdForDeposit !== currentRoomId
      && !roomChanges.length
    ) {
      const changeDate = String(data.get('fecha_entrada') || '');
      if (!changeDate || changeDate === dateToInputValue(state.editingTenantFull?.fecha_entrada)) {
        throw new Error('Indica la nueva fecha de entrada o añade el cambio en Cambios de habitación');
      }
      roomChanges.push({
        id_habitacion: selectedRoomIdForDeposit,
        fecha_cambio: changeDate,
      });
    }
    const pendingCroppedAvatar = tenantAvatarCrop ? await createCroppedTenantAvatarFile() : null;
    const avatarFile = state.tenantAvatarFile || pendingCroppedAvatar || data.get('avatar');
    data.delete('avatar');
    data.delete('fianza');
    data.delete('id_vivienda_asignacion');
    data.delete('change_id_habitacion');
    data.delete('fecha_cambio');
    ['fecha_entrada', 'fecha_salida'].forEach((key) => {
      const value = data.get(key);
      if (value) data.set(key, inputDateToDisplay(value));
    });
    ['documento', 'contrato'].forEach((key) => {
      const file = data.get(key);
      if (file instanceof File && !file.name) data.delete(key);
    });

    roomChanges.forEach((change, index) => {
      if (!change.id_habitacion || !change.fecha_cambio) {
        throw new Error(`Completa habitación y fecha en el cambio ${index + 1}`);
      }
    });
    roomChanges.sort((left, right) => left.fecha_cambio.localeCompare(right.fecha_cambio));
    const repeatedChangeDate = roomChanges.some((change, index) => (
      index > 0 && change.fecha_cambio === roomChanges[index - 1].fecha_cambio
    ));
    if (repeatedChangeDate) {
      throw new Error('No puede haber dos cambios de habitación en la misma fecha');
    }
    if (editing && roomChanges.length) {
      const currentExitDate = data.get('fecha_salida');
      const firstChangeDate = roomChanges[0].fecha_cambio;
      if (currentExitDate) {
        const expectedExitDate = new Date(`${firstChangeDate}T00:00:00`);
        expectedExitDate.setDate(expectedExitDate.getDate() - 1);
        const expectedExitInput = [
          expectedExitDate.getFullYear(),
          String(expectedExitDate.getMonth() + 1).padStart(2, '0'),
          String(expectedExitDate.getDate()).padStart(2, '0'),
        ].join('-');
        if (currentExitDate !== inputDateToDisplay(expectedExitInput)) {
          throw new Error('La salida de la habitación actual debe ser el día anterior al primer cambio de habitación');
        }
      }
      data.delete('id_habitacion');
      data.delete('fecha_entrada');
      data.delete('fecha_salida');
    }

    const result = await request(editing ? `/api/tenant/${state.editingTenantFull.id_inquilino}/full` : '/api/tenant/full', {
      method: editing ? 'PUT' : 'POST',
      body: data,
    });
    if (selectedRoomIdForDeposit && (!editing || !hadRoomAssignment) && depositAmount > 0) {
      await createTenantDepositExpense({
        result,
        roomId: selectedRoomIdForDeposit,
        entryDate: data.get('fecha_entrada'),
        amount: depositAmount,
      });
    }
    const userId = editing
      ? state.editingTenantFull.id_usuario
      : result?.tenant?.id_usuario;

    if (avatarFile instanceof File && avatarFile.name && userId) {
      await uploadTenantAvatar(userId, avatarFile);
    }

    for (const change of roomChanges) {
      await request(`/api/tenant/${state.editingTenantFull.id_inquilino}/change-room`, {
        method: 'POST',
        body: JSON.stringify({
          id_habitacion: change.id_habitacion,
          fecha_cambio: inputDateToDisplay(change.fecha_cambio),
        }),
      });
    }

    showToast(editing && roomChanges.length ? 'Ficha actualizada y cambios de habitación guardados' : editing ? 'Ficha de inquilino actualizada' : 'Ficha de inquilino creada');
    if (editing) {
      state.editingTenantFull = null;
      state.resourceAction = null;
      await loadSection('tenants');
      return;
    }

    resourceForm.reset();
    await loadTenantCreateRooms();
    renderTenantCreateForm();
    return;
  }

  if (isHouseCreateMode()) {
    await createHouseWithRooms(resource);
    showToast('Vivienda creada');
    state.editingId = null;
    state.resourceAction = null;
    await loadSection('houses');
    return;
  }

  if (isHouseEditMode()) {
    if (!resourceForm.checkValidity()) return;
    window.clearTimeout(houseAutoSaveTimer);
    houseAutoSaveTimer = null;
    houseAutoSavePending = false;
    await updateHouseWithRooms(resource, { syncRoomCount: true });
    showToast('Vivienda actualizada');
    state.editingId = null;
    state.resourceAction = null;
    state.activeHouseRecordId = null;
    await loadSection('houses');
    return;
  }

  if (isExpenseCreateMode()) {
    const message = await createExpenseFromForm();
    showToast(message);
    resourceForm.reset();
    renderForm();
    await loadRows();
    return;
  }

  const data = formDataToObject(resourceForm);
  if (state.editingId && data.password === '') delete data.password;

  const path = state.editingId ? `${resource.endpoint}/${state.editingId}` : resource.endpoint;
  await request(path, {
    method: state.editingId ? 'PUT' : 'POST',
    body: JSON.stringify(data),
  });

  showToast(state.editingId ? 'Registro actualizado' : 'Registro creado');
  state.editingId = null;
  if (isAdminMenuMode() && state.activeSection === 'users') {
    state.resourceAction = null;
    resourceForm?.classList.add('hidden');
    tableWrap?.classList.remove('hidden');
    splitLayout?.classList.add('table-full-width');
    await fetchAdminUsers();
    return;
  }
  if (wasHouseFormMode) {
    if (state.resourceAction === 'create') state.resourceAction = null;
    await loadSection('houses');
    return;
  }
  renderForm();
  await loadRows();
}

async function deleteRow(id) {
  const resource = state.activeResource;
  if (isResourceReadOnly(resource)) {
    showToast('No tienes permisos para borrar este recurso', 'error');
    return;
  }
  if (resource === resources.houses) {
    const deactivated = await deactivateHouseRecord(id);
    if (!deactivated) return;
    await loadRows();
    renderHouseSectionActions();
    return;
  }
  const confirmed = window.confirm(await getDeleteConfirmationText(resource, id));
  if (!confirmed) return;
  await request(`${resource.endpoint}/${id}`, { method: 'DELETE' });
  showToast('Registro borrado');
  await loadRows();
}

async function getDeleteConfirmationText(resource, id) {
  if (resource !== resources.tenants) return `¿Borrar el registro #${id}?`;

  const row = state.rows.find((item) => String(getValue(item, resource.idKey)) === String(id));
  let tenant = row;

  if (!tenant) {
    try {
      tenant = await request(`/api/tenant/${id}`);
    } catch {
      tenant = null;
    }
  }

  const name = getTenantDisplayName(tenant || { id_inquilino: id });
  return `¿Borrar registro de ${name}?`;
}

function openExpenseDetail(id, endpoint) {
  const row = state.rows.find((item) => (
    String(item.expense_id || '') === String(id)
    && String(item.expense_endpoint || '') === String(endpoint)
  ));
  if (!row) return;
  state.activeExpenseDetailRow = row;
  resourceForm.classList.remove('hidden');
  resourceForm.classList.add('expense-create-form');
  tableWrap?.classList.add('hidden');
  splitLayout?.classList.remove('table-full-width');
  splitLayout?.classList.add('tenant-create-layout');
  renderExpenseReadonlyForm(row);
}

function closeExpenseDetail() {
  state.activeExpenseDetailRow = null;
  resourceForm.classList.add('hidden');
  resourceForm.classList.remove('expense-create-form', 'deposit-detail-form');
  resourceForm.innerHTML = '';
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout');
}

function closePaymentDetail() {
  state.activePaymentDetailRow = null;
  resourceForm.classList.add('hidden');
  resourceForm.classList.remove('expense-create-form', 'deposit-detail-form');
  resourceForm.innerHTML = '';
  tableWrap?.classList.remove('hidden');
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout');
}

function getPaymentDetailTitle(row = {}) {
  return row.tipo_movimiento || row.concepto || 'Pago';
}

function renderPaymentHistoryList(row = {}) {
  const history = row.payment_history || [];
  if (!history.length) return '<p class="empty-detail">No hay pagos aplicados.</p>';
  const paymentUser = String(state.user?.nombre || '').trim() || '-';

  return `<div class="payment-history-list">
    ${history.map((item) => `<div class="payment-history-row">
      <span>${escapeHtml(formatDisplayValue('fecha_pago', item.date) || 'Sin fecha')}</span>
      <strong>${escapeHtml(formatMoney(item.amount))} €</strong>
      <span>${escapeHtml(item.user || paymentUser)}</span>
      <em>${escapeHtml(item.method || '')}</em>
    </div>`).join('')}
  </div>`;
}

function renderPaymentDetailForm(row = {}) {
  const amount = parseMoneyValue(row.importe ?? row.importe_total ?? row.importe_asignado);
  const paid = getPaymentSettlementAmount(row);
  const pending = Math.max(amount - paid, 0);
  const isDeposit = isDepositPaymentRow(row);
  const isMonthlyRent = row.gasto_de_value === 'mensualidad';
  const isCompleted = getPaymentFilterStatus(row) === 'completados';
  const canApply = !isCompleted && !isResourceReadOnly(state.activeResource);
  const canEditRoomPrice = false;
  const canRefund = !isCompleted && paid > 0 && row.id_pago_inquilino && !isResourceReadOnly(state.activeResource);
  const defaultRefundAmount = -(paid > 0 ? paid : amount);
  const defaultApplyAmount = isCompleted && isDeposit ? defaultRefundAmount : (paid > 0 ? 0 : pending);
  const amountInputLimits = isCompleted && isDeposit
    ? 'max="-0.01"'
    : `min="0.01" max="${escapeHtml(pending.toFixed(2))}"`;
  const amountValue = formatMoney(amount);
  const totalValue = formatMoney(parseMoneyValue(row.importe_total || row.importe || row.importe_asignado));
  const totalLabel = row.gasto_de_value === 'mensualidad' ? 'Precio habitación' : 'Importe total';
  const monthData = getRowMonthData(row);
  const priceStartDate = monthData.key
    ? `${monthData.year}-${String(monthData.month).padStart(2, '0')}-01`
    : todayInputValue();
  const paidValue = formatMoney(paid);
  const pendingValue = formatMoney(pending);
  const status = isCompleted ? 'Completado' : 'Pendiente';
  const paymentDate = dateToInputValue(row.fecha_pago) || todayInputValue();
  const renderPaymentDetailActions = (extraClass = '') => `<div class="form-actions payment-detail-page-actions ${extraClass}">
        ${canApply ? '<button class="button primary" data-action="apply-payment-detail" type="button">Aplicar</button>' : ''}
        ${canRefund ? '<button class="button primary" data-action="apply-payment-refund" type="button">Devolver</button>' : ''}
        <button class="button ghost" id="cancelEditButton" type="button">Volver</button>
      </div>`;

  resourceForm.innerHTML = `<div class="expense-form-header">
      <h3>${escapeHtml(getPaymentDetailTitle(row))}</h3>
      ${canRefund ? '' : renderPaymentDetailActions()}
    </div>
    <div class="expense-form-columns payment-detail-columns">
      <section class="tenant-create-section">
        <h4>Detalle del pago</h4>
        <div class="tenant-create-grid tenant-create-grid-one">
          <label>Inquilino<input type="text" value="${escapeHtml(row.nombre_inquilino || row.id_inquilino || '')}" disabled></label>
          <label>Vivienda<input type="text" value="${escapeHtml(row.nombre_vivienda || row.id_vivienda || '')}" disabled></label>
          <label>Concepto<input type="text" value="${escapeHtml(row.concepto || '')}" disabled></label>
          <label>Periodo<input type="text" value="${escapeHtml([row.mes, row.anio].filter(Boolean).join('/') || formatDisplayValue('fecha', row.fecha_recibo || row.fecha) || '')}" disabled></label>
          <div class="payment-detail-inline-fields">
            <label>Parte proporcional<input name="parte_proporcional" type="text" value="${escapeHtml(row.parte_proporcional || '')}" disabled></label>
            <label>Estado<input type="text" value="${escapeHtml(status)}" disabled></label>
          </div>
        </div>
      </section>
      <section class="tenant-create-section">
        <h4>Importes</h4>
        <div class="tenant-create-grid tenant-create-grid-one">
          <label>${escapeHtml(totalLabel)}<input name="precio_habitacion" type="${canEditRoomPrice ? 'number' : 'text'}" ${canEditRoomPrice ? 'min="0.01" step="0.01"' : ''} value="${escapeHtml(canEditRoomPrice ? totalValue : `${totalValue} €`)}" ${canEditRoomPrice ? '' : 'disabled'}></label>
          ${canEditRoomPrice ? `<label>Fecha desde<input name="fecha_precio_desde" type="date" value="${escapeHtml(priceStartDate)}"></label>` : ''}
          <label>Importe del recibo<input name="importe_recibo" type="text" value="${escapeHtml(amountValue)} €" disabled></label>
          <label>Importe pagado<input type="text" value="${escapeHtml(paidValue)} €" disabled></label>
          <label>Importe pendiente<input name="importe_pendiente" type="text" value="${escapeHtml(pendingValue)} €" disabled></label>
        </div>
      </section>
      <section class="tenant-create-section payment-application-section">
        <h4>Aplicación</h4>
        ${isCompleted ? '<p class="empty-detail">Este pago ya está completado. No se puede modificar.</p>' : ''}
        <div class="tenant-create-grid tenant-create-grid-one">
          <label>Forma de pago
            <select name="forma_pago" ${canApply ? 'required' : 'disabled'}>
              <option value="">Selecciona</option>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="bizum">Bizum</option>
              <option value="domiciliacion">Domiciliación</option>
              ${isDeposit ? `<option value="devolucion_fianza" ${isCompleted ? 'selected' : ''}>Devolución fianza</option>` : ''}
              <option value="otro">Otro</option>
            </select>
          </label>
          <label><span data-payment-amount-title>${isCompleted && isDeposit ? 'Devolución fianza' : 'Importe que paga'}</span>
            <input name="importe_pagado" type="number" step="0.01" ${amountInputLimits} data-standard-max="${escapeHtml(pending.toFixed(2))}" data-refund-default="${escapeHtml(defaultRefundAmount.toFixed(2))}" value="${escapeHtml(defaultApplyAmount.toFixed(2))}" ${canApply ? 'required' : 'disabled'}>
          </label>
          <label>Fecha de pago<input name="fecha_pago" type="date" value="${escapeHtml(paymentDate)}" ${canApply ? '' : 'disabled'}></label>
          <label>Comentarios<textarea name="comentarios" ${canApply ? '' : 'disabled'}>${escapeHtml(row.comentarios || '')}</textarea></label>
        </div>
      </section>
      ${canRefund ? `<section class="tenant-create-section">
        <h4>Devolución</h4>
        <div class="tenant-create-grid tenant-create-grid-one">
          <label>Tipo de devolución
            <select name="tipo_devolucion" data-refund-type>
              <option value="total">Total</option>
              <option value="parcial">Parcial</option>
            </select>
          </label>
          <label class="hidden" data-refund-partial-field>Cantidad a devolver
            <input name="importe_devolucion" type="number" min="0.01" max="${escapeHtml(paid.toFixed(2))}" step="0.01" value="${escapeHtml(paid.toFixed(2))}" disabled>
          </label>
          <label>Fecha devolución<input name="fecha_devolucion" type="date" value="${escapeHtml(todayInputValue())}"></label>
          <label>Comentarios devolución<textarea name="comentarios_devolucion"></textarea></label>
        </div>
        ${renderPaymentDetailActions('payment-refund-actions')}
      </section>` : ''}
      <section class="tenant-create-section">
        <h4>Pagos aplicados</h4>
        ${renderPaymentHistoryList(row)}
      </section>
    </div>`;
}

async function getDepositPendingPaymentOptions(deposit = {}) {
  try {
    const rows = await loadPaymentLedgerRows();
    return rows
      .filter((row) => String(row.id_inquilino || '') === String(deposit.id_inquilino || ''))
      .filter((row) => row.id_pago_inquilino)
      .filter((row) => !isDepositPaymentRow(row))
      .filter((row) => getPaymentFilterStatus(row) === 'pendientes')
      .map((row) => {
        const pendingAmount = parseMoneyValue(row.importe_pendiente || row.importe || 0);
        const concept = row.concepto || 'Pago';
        const period = [row.mes, row.anio].filter(Boolean).join('/') || row.fecha_vencimiento || '';
        return {
          id: row.id_pago_inquilino,
          amount: pendingAmount,
          concept,
          period,
          house: row.nombre_vivienda || row.vivienda || '',
          label: `${concept} · ${formatMoney(pendingAmount)} € pendiente`,
        };
      });
  } catch {
    return [];
  }
}

function renderDepositMovements(movements = []) {
  if (!movements.length) return '<p class="empty-detail">No hay movimientos de fianza.</p>';

  return `<table class="tenant-monthly-table">
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Usuario</th>
        <th>Tipo</th>
        <th>Importe</th>
        <th>Pago aplicado</th>
        <th>Comentarios</th>
      </tr>
    </thead>
    <tbody>
      ${movements.map((movement) => `<tr>
        <td>${escapeHtml(formatDisplayValue('fecha', movement.fecha) || '')}</td>
        <td>${escapeHtml(movement.usuario_movimiento || movement.email_usuario_movimiento || '')}</td>
        <td>${escapeHtml(movement.tipo || '')}</td>
        <td>${escapeHtml(formatMoney(movement.importe || 0))} €</td>
        <td>${escapeHtml(movement.id_pago_inquilino || '')}</td>
        <td>${escapeHtml(movement.comentarios || '')}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

async function openDepositDetail(id) {
  if (!id || !resourceForm) return;

  state.activeDepositDetailId = id;
  resourceForm.classList.remove('hidden');
  resourceForm.classList.add('expense-create-form', 'deposit-detail-form');
  tableWrap?.classList.add('hidden');
  detailPanel?.classList.add('hidden');
  if (detailPanel) detailPanel.innerHTML = '';
  splitLayout?.classList.add('table-full-width');
  splitLayout?.classList.remove('tenant-create-layout');
  resourceForm.innerHTML = '<p class="detail-loading">Cargando fianza...</p>';

  const deposit = await request(`/api/tenant-deposit/${id}`);
  const paymentOptions = await getDepositPendingPaymentOptions(deposit);
  const available = parseMoneyValue(deposit.importe_disponible);
  const tenantName = deposit.nombre_inquilino || `Inquilino #${deposit.id_inquilino}`;
  const isDepositMovementClosed = available <= 0.005 || ['compensada', 'devuelta', 'retenida', 'cancelada'].includes(String(deposit.estado || '').toLowerCase());
  const pendingPaymentsPanel = paymentOptions.length
    ? paymentOptions.map((option) => {
      const appliedAmount = Math.min(parseMoneyValue(option.amount), available || parseMoneyValue(option.amount));
      return `<button class="deposit-payment-option" data-action="select-deposit-payment" data-payment-id="${escapeHtml(option.id)}" data-payment-amount="${escapeHtml(appliedAmount.toFixed(2))}" data-payment-label="${escapeHtml(option.label)}" type="button">
        <span>
          <strong>${escapeHtml(option.concept)}</strong>
          <small>${escapeHtml([option.period, option.house].filter(Boolean).join(' · '))}</small>
        </span>
        <b>${escapeHtml(formatMoney(option.amount))} €</b>
      </button>`;
    }).join('')
    : '<p class="empty-detail">No hay pagos pendientes para este inquilino.</p>';

  resourceForm.innerHTML = `<div class="expense-form-header">
      <h3>Fianza #${escapeHtml(deposit.id_fianza)}</h3>
    </div>
    <div class="expense-form-columns deposit-detail-grid">
      <section class="tenant-create-section">
        <h4>Destino</h4>
        <div class="tenant-create-grid tenant-create-grid-one">
          <label>Inquilino<input type="text" value="${escapeHtml(tenantName)}" disabled></label>
          <label>Vivienda<input type="text" value="${escapeHtml(deposit.nombre_vivienda || deposit.id_vivienda || '')}" disabled></label>
        </div>
      </section>
      <section class="tenant-create-section">
        <h4>Importe y estado</h4>
        <div class="tenant-create-grid tenant-create-grid-two">
          <label>Importe<input type="text" value="${escapeHtml(formatMoney(deposit.importe))} €" disabled></label>
          <label>Estado<input type="text" value="${escapeHtml(deposit.estado || '')}" disabled></label>
          <label>Fecha fianza<input type="date" value="${escapeHtml(dateToInputValue(deposit.fecha_fianza))}" disabled></label>
          <label>Disponible<input type="text" value="${escapeHtml(formatMoney(available))} €" disabled></label>
        </div>
      </section>
      <section class="tenant-create-section">
        <h4>Resumen</h4>
        <div class="tenant-create-grid tenant-create-grid-two">
          <label>Cobrado<input type="text" value="${escapeHtml(formatMoney(deposit.importe_cobrado))} €" disabled></label>
          <label>Devuelto<input type="text" value="${escapeHtml(formatMoney(deposit.importe_devuelto))} €" disabled></label>
          <label>Compensado<input type="text" value="${escapeHtml(formatMoney(deposit.importe_compensado))} €" disabled></label>
          <label>Retenido<input type="text" value="${escapeHtml(formatMoney(deposit.importe_retenido))} €" disabled></label>
        </div>
      </section>
      ${isDepositMovementClosed ? `<section class="tenant-create-section deposit-movement-section deposit-movement-closed">
        <h4>Nuevo movimiento</h4>
        <p class="empty-detail">La fianza ya está completamente resuelta. No se pueden crear más movimientos.</p>
      </section>` : `<section class="tenant-create-section deposit-movement-section">
        <h4>Nuevo movimiento</h4>
        <div class="tenant-create-grid tenant-create-grid-two">
          <label>Tipo
            <select name="tipo_movimiento_fianza" data-deposit-movement-type>
              <option value="cobro">Cobro</option>
              <option value="devolucion">Devolución</option>
              <option value="compensacion">Compensar pago pendiente</option>
              <option value="retencion">Retención</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </label>
          <label>Importe<input name="importe_movimiento_fianza" type="number" min="0.01" step="0.01" value="${escapeHtml((available || parseMoneyValue(deposit.importe)).toFixed(2))}"></label>
          <label>Fecha<input name="fecha_movimiento_fianza" type="date" value="${escapeHtml(todayInputValue())}"></label>
          <label data-deposit-payment-field class="hidden">Pago pendiente
            <select name="id_pago_inquilino_movimiento">
              <option value="">Selecciona</option>
              ${paymentOptions.map((option) => `<option value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</option>`).join('')}
            </select>
          </label>
          <button class="button ghost hidden deposit-payment-picker" data-action="open-deposit-payment-modal" type="button">Seleccionar pago pendiente</button>
          <label>Método<select name="metodo_pago_movimiento"><option value="">Selecciona</option><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="bizum">Bizum</option><option value="domiciliacion">Domiciliación</option><option value="otro">Otro</option></select></label>
          <label class="deposit-movement-comments">Comentarios<textarea name="comentarios_movimiento"></textarea></label>
        </div>
        <div class="form-actions">
          <button class="button primary" data-action="apply-deposit-movement" data-id="${escapeHtml(deposit.id_fianza)}" type="button">Guardar movimiento</button>
        </div>
      </section>`}
      <section class="tenant-create-section deposit-movements-section">
        <h4>Movimientos</h4>
        ${renderDepositMovements(deposit.movimientos || [])}
      </section>
    </div>
    <div class="deposit-payment-modal hidden" data-deposit-payment-modal>
      <div class="deposit-payment-modal-backdrop" data-action="close-deposit-payment-modal"></div>
      <section class="deposit-payment-modal-card" role="dialog" aria-modal="true" aria-label="Pagos pendientes">
        <header>
          <h3>Pagos pendientes</h3>
          <button class="button ghost" data-action="close-deposit-payment-modal" type="button">Cerrar</button>
        </header>
        <div class="deposit-payment-modal-body">
          ${pendingPaymentsPanel}
        </div>
      </section>
    </div>`;
}

async function applyDepositMovement(button) {
  const id = button.dataset.id;
  const root = button.closest('.expense-create-form') || button.closest('.tenant-file') || resourceForm || detailPanel;
  const type = root.querySelector('[name="tipo_movimiento_fianza"]')?.value || '';
  const amount = root.querySelector('[name="importe_movimiento_fianza"]')?.value || '';
  const date = root.querySelector('[name="fecha_movimiento_fianza"]')?.value || '';
  const paymentId = root.querySelector('[name="id_pago_inquilino_movimiento"]')?.value || '';
  const method = root.querySelector('[name="metodo_pago_movimiento"]')?.value || '';
  const comments = root.querySelector('[name="comentarios_movimiento"]')?.value || '';

  if (type === 'compensacion' && !paymentId) {
    throw new Error('Selecciona un pago pendiente para compensar');
  }

  await request(`/api/tenant-deposit/${id}/movement`, {
    method: 'POST',
    body: JSON.stringify({
      tipo: type,
      importe: amount,
      fecha: inputDateToDisplay(date),
      id_pago_inquilino: paymentId || null,
      metodo_pago: method || null,
      comentarios: comments || null,
    }),
  });

  showToast('Movimiento de fianza guardado');
  await loadRows();
  await openDepositDetail(id);
}

function openPaymentDetail(paymentKey) {
  const row = state.rows.find((item) => String(item.payment_key || '') === String(paymentKey || ''));
  openPaymentDetailRow(row);
}

function openPaymentDetailRow(row) {
  if (!row) return;
  state.activePaymentDetailRow = row;
  resourceForm.classList.remove('hidden');
  resourceForm.classList.add('expense-create-form');
  tableWrap?.classList.add('hidden');
  splitLayout?.classList.remove('table-full-width');
  splitLayout?.classList.add('tenant-create-layout');
  renderPaymentDetailForm(row);
}

function findTenantReceiptPaymentRow(receipt = {}) {
  const paymentKey = receipt.paymentKey || '';
  const paymentId = receipt.paymentId || '';
  const expenseId = receipt.expenseId || '';
  const tenantId = receipt.tenantId || '';
  const roomAssignmentId = receipt.roomAssignmentId || '';
  const month = receipt.month || '';
  const year = receipt.year || '';
  const receiptType = receipt.receiptType || '';
  const concept = String(receipt.concept || '').trim().toLowerCase();

  return state.rows.find((row) => String(row.payment_key || '') === String(paymentKey))
    || state.rows.find((row) => paymentId && String(row.id_pago_inquilino || '') === String(paymentId))
    || state.rows.find((row) => (
      expenseId
      && tenantId
      && String(row.id_gasto || '') === String(expenseId)
      && String(row.id_inquilino || '') === String(tenantId)
    ))
    || state.rows.find((row) => (
      receiptType === 'Mensualidad'
      && tenantId
      && month
      && year
      && String(row.id_inquilino || '') === String(tenantId)
      && String(row.mes || '') === String(month)
      && String(row.anio || '') === String(year)
      && String(row.gasto_de_value || '') === 'mensualidad'
      && (!roomAssignmentId || String(row.id_habitacion_inquilino || '') === String(roomAssignmentId))
      && (!concept || String(row.concepto || '').trim().toLowerCase() === concept)
    ))
    || state.rows.find((row) => (
      receiptType === 'Mensualidad'
      && tenantId
      && month
      && year
      && String(row.id_inquilino || '') === String(tenantId)
      && String(row.mes || '') === String(month)
      && String(row.anio || '') === String(year)
      && String(row.gasto_de_value || '') === 'mensualidad'
    ));
}

async function openTenantReceiptPaymentDetail(receipt) {
  state.resourceAction = null;
  await loadSection('payments');
  openPaymentDetailRow(findTenantReceiptPaymentRow(receipt));
}

function updatePaymentAmountMode() {
  const methodSelect = resourceForm?.querySelector('select[name="forma_pago"]');
  const amountInput = resourceForm?.querySelector('input[name="importe_pagado"]');
  const amountTitle = resourceForm?.querySelector('[data-payment-amount-title]');
  if (!methodSelect || !amountInput || !amountTitle) return;

  const isRefund = methodSelect.value === 'devolucion_fianza';
  amountTitle.textContent = isRefund ? 'Devolución fianza' : 'Importe que paga';
  if (isRefund) {
    amountInput.removeAttribute('min');
    amountInput.removeAttribute('max');
    amountInput.max = '-0.01';
    const currentAmount = parseMoneyValue(amountInput.value);
    const refundDefault = parseMoneyValue(amountInput.dataset.refundDefault);
    if (!amountInput.value || currentAmount >= 0) {
      amountInput.value = refundDefault.toFixed(2);
    }
  } else {
    amountInput.min = '0.01';
    const standardMax = amountInput.dataset.standardMax;
    if (standardMax) amountInput.max = standardMax;
    if (parseMoneyValue(amountInput.value) < 0) {
      amountInput.value = standardMax && parseMoneyValue(standardMax) > 0 ? standardMax : '0.00';
    }
  }
}

function updatePaymentRefundMode() {
  const refundType = resourceForm?.querySelector('[data-refund-type]');
  const partialField = resourceForm?.querySelector('[data-refund-partial-field]');
  const partialInput = partialField?.querySelector('input[name="importe_devolucion"]');
  if (!refundType || !partialField || !partialInput) return;

  const isPartial = refundType.value === 'parcial';
  partialField.classList.toggle('hidden', !isPartial);
  partialInput.disabled = !isPartial;
  partialInput.required = isPartial;
}

function getPaymentDetailAssignedAmount(row = {}) {
  const roomPriceInput = resourceForm?.querySelector('input[name="precio_habitacion"]');
  if (
    state.activePaymentDetailRow === row
    && row.gasto_de_value === 'mensualidad'
    && roomPriceInput
    && !roomPriceInput.disabled
  ) {
    const effectiveDateValue = resourceForm?.querySelector('input[name="fecha_precio_desde"]')?.value || '';
    return getPaymentRoomPriceAssignedAmount(row, parseMoneyValue(roomPriceInput.value), effectiveDateValue);
  }
  return parseMoneyValue(row.importe ?? row.importe_total ?? row.importe_asignado);
}

function getPaymentApplyPayload(row, formData) {
  const monthData = getRowMonthData(row);
  const amount = getPaymentDetailAssignedAmount(row);
  const currentPaidAmount = getPaymentSettlementAmount(row);
  const appliedAmount = parseMoneyValue(formData.get('importe_pagado'));
  const isDepositRefund = formData.get('forma_pago') === 'devolucion_fianza';
  const refundAmount = isDepositRefund ? -Math.abs(appliedAmount) : appliedAmount;
  const nextPaidAmount = isDepositRefund ? currentPaidAmount : Math.min(amount, currentPaidAmount + appliedAmount);
  const type = row.tipo_pago || (row.gasto_de_value === 'mensualidad' ? 'alquiler' : 'gasto');
  const paymentDate = inputDateToDisplay(formData.get('fecha_pago') || todayInputValue());
  const formComments = String(formData.get('comentarios') || '').trim();
  const paymentMethod = formData.get('forma_pago') || '';
  const payload = {
    id_inquilino: row.id_inquilino || null,
    id_habitacion_inquilino: row.id_habitacion_inquilino || null,
    id_gasto: row.id_gasto || null,
    tipo: type,
    concepto: row.concepto || (type === 'alquiler' ? 'Mensualidad' : 'Gasto'),
    mes: row.mes || monthData.month,
    anio: row.anio || monthData.year,
    dias_ocupacion: row.dias_ocupacion || null,
    importe_asignado: amount,
    importe_pagado: isDepositRefund ? refundAmount : nextPaidAmount,
    estado: nextPaidAmount >= amount - 0.009 ? 'pagado' : 'parcial',
    fecha_pago: paymentDate,
    forma_pago: paymentMethod,
    comentarios: formComments,
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === null || payload[key] === '' || payload[key] === undefined) delete payload[key];
  });
  return payload;
}

function getPaymentRoomPriceAssignedAmount(row = {}, roomPrice = 0, effectiveDateValue = '') {
  const monthData = getRowMonthData(row);
  const monthRange = monthData.key ? getMonthRange(monthData.year, monthData.month) : null;
  const monthDays = monthRange ? getInclusiveDayCount(monthRange.start, monthRange.end) : 0;
  const occupiedDays = Number(row.dias_ocupacion || 0);

  if (roomPrice <= 0) return 0;
  const effectiveDate = parseInputDate(effectiveDateValue);
  const currentRoomPrice = parseMoneyValue(row.importe_total || row.importe || row.importe_asignado);
  if (monthRange && monthDays > 0 && effectiveDate && effectiveDate > monthRange.start) {
    if (effectiveDate > monthRange.end) {
      return Math.round(parseMoneyValue(row.importe ?? row.importe_asignado ?? row.importe_total) * 100) / 100;
    }

    const previousEnd = addAppDays(effectiveDate, -1);
    const previousDays = getInclusiveDayCount(monthRange.start, previousEnd);
    const newPriceDays = getInclusiveDayCount(effectiveDate, monthRange.end);
    const amount = (currentRoomPrice / monthDays * previousDays) + (roomPrice / monthDays * newPriceDays);
    return Math.round(amount * 100) / 100;
  }

  if (occupiedDays > 0 && monthDays > 0 && occupiedDays < monthDays) {
    return Math.round((roomPrice / monthDays * occupiedDays) * 100) / 100;
  }
  return Math.round(roomPrice * 100) / 100;
}

function getPaymentStatusFromAmounts(assignedAmount, paidAmount) {
  if (paidAmount <= 0) return 'pendiente';
  return paidAmount >= assignedAmount - 0.009 ? 'pagado' : 'parcial';
}

function getPaymentRoomPriceProportionalDetail(row = {}, assignedAmount = 0, effectiveDateValue = '') {
  const monthData = getRowMonthData(row);
  const monthRange = monthData.key ? getMonthRange(monthData.year, monthData.month) : null;
  const monthDays = monthRange ? getInclusiveDayCount(monthRange.start, monthRange.end) : 0;
  const effectiveDate = parseInputDate(effectiveDateValue);
  if (monthRange && effectiveDate && effectiveDate > monthRange.start && effectiveDate <= monthRange.end) {
    return `${assignedAmount.toFixed(2)} (desde ${inputDateToDisplay(effectiveDateValue)})`;
  }
  return formatPaymentProportionalDetail(assignedAmount, Number(row.dias_ocupacion || 0), monthDays);
}

function getPaymentRoomPricePayload(row, roomPrice) {
  const monthData = getRowMonthData(row);
  const effectiveDateValue = resourceForm?.querySelector('input[name="fecha_precio_desde"]')?.value || '';
  const assignedAmount = getPaymentRoomPriceAssignedAmount(row, roomPrice, effectiveDateValue);
  const paidAmount = getPaymentSettlementAmount(row);
  const payload = {
    id_inquilino: row.id_inquilino || null,
    id_habitacion_inquilino: row.id_habitacion_inquilino || null,
    tipo: 'alquiler',
    concepto: row.concepto || `Mensualidad ${String(monthData.month).padStart(2, '0')}/${monthData.year}`,
    mes: row.mes || monthData.month,
    anio: row.anio || monthData.year,
    dias_ocupacion: row.dias_ocupacion || null,
    importe_asignado: assignedAmount,
    importe_pagado: paidAmount,
    estado: getPaymentStatusFromAmounts(assignedAmount, paidAmount),
    comentarios: row.comentarios || '',
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === null || payload[key] === '' || payload[key] === undefined) delete payload[key];
  });
  return payload;
}

function updatePaymentRoomPricePreview() {
  const row = state.activePaymentDetailRow;
  const roomPriceInput = resourceForm?.querySelector('input[name="precio_habitacion"]');
  if (!row || !roomPriceInput || roomPriceInput.disabled) return;

  const roomPrice = parseMoneyValue(roomPriceInput.value);
  const effectiveDateValue = resourceForm?.querySelector('input[name="fecha_precio_desde"]')?.value || '';
  const assignedAmount = getPaymentRoomPriceAssignedAmount(row, roomPrice, effectiveDateValue);
  const paid = getPaymentSettlementAmount(row);
  const pending = Math.max(assignedAmount - paid, 0);
  const receiptInput = resourceForm.querySelector('input[name="importe_recibo"]');
  const pendingInput = resourceForm.querySelector('input[name="importe_pendiente"]');
  const proportionalInput = resourceForm.querySelector('input[name="parte_proporcional"]');
  const amountInput = resourceForm.querySelector('input[name="importe_pagado"]');

  if (receiptInput) receiptInput.value = `${formatMoney(assignedAmount)} €`;
  if (pendingInput) pendingInput.value = `${formatMoney(pending)} €`;
  if (proportionalInput) proportionalInput.value = getPaymentRoomPriceProportionalDetail(row, assignedAmount, effectiveDateValue);
  if (amountInput && !amountInput.disabled) {
    amountInput.dataset.standardMax = pending.toFixed(2);
    amountInput.max = pending.toFixed(2);
    amountInput.value = pending.toFixed(2);
  }
}

async function savePaymentRoomPrice() {
  const row = state.activePaymentDetailRow;
  if (!row) return;
  if (row.gasto_de_value !== 'mensualidad') {
    throw new Error('Solo se puede editar el precio en mensualidades');
  }

  const roomPrice = parseMoneyValue(resourceForm?.querySelector('input[name="precio_habitacion"]')?.value);
  const effectiveDateValue = resourceForm?.querySelector('input[name="fecha_precio_desde"]')?.value || '';
  const assignedAmount = getPaymentRoomPriceAssignedAmount(row, roomPrice, effectiveDateValue);
  const paidAmount = getPaymentSettlementAmount(row);

  if (roomPrice <= 0 || assignedAmount <= 0) {
    throw new Error('Indica un precio de habitación mayor que 0');
  }
  if (!parseInputDate(effectiveDateValue)) {
    throw new Error('Indica la fecha desde la que se aplica el precio');
  }
  if (paidAmount > assignedAmount + 0.009) {
    throw new Error('El nuevo importe no puede ser inferior al importe ya pagado');
  }

  const payload = getPaymentRoomPricePayload(row, roomPrice);
  if (row.id_pago_inquilino) {
    await request(`${resources.payments.endpoint}/${row.id_pago_inquilino}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } else {
    await request(resources.payments.endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  showToast('Precio de habitación actualizado');
  closePaymentDetail();
  await loadRows();
}

function getPaymentRefundPayload(row, refundAmount, formData) {
  const monthData = getRowMonthData(row);
  const type = row.tipo_pago || (row.gasto_de_value === 'mensualidad' ? 'alquiler' : 'gasto');
  const payload = {
    id_inquilino: row.id_inquilino || null,
    id_habitacion_inquilino: row.id_habitacion_inquilino || null,
    id_gasto: row.id_gasto || null,
    tipo: type,
    concepto: `Devolución ${row.concepto || (type === 'alquiler' ? 'Mensualidad' : 'Gasto')}`,
    mes: row.mes || monthData.month,
    anio: row.anio || monthData.year,
    dias_ocupacion: row.dias_ocupacion || null,
    importe_asignado: -Math.abs(refundAmount),
    importe_pagado: -Math.abs(refundAmount),
    estado: 'pagado',
    fecha_pago: inputDateToDisplay(formData.get('fecha_devolucion') || todayInputValue()),
    comentarios: String(formData.get('comentarios_devolucion') || '').trim(),
  };

  Object.keys(payload).forEach((key) => {
    if (payload[key] === null || payload[key] === '' || payload[key] === undefined) delete payload[key];
  });
  return payload;
}

async function applyPaymentDetail() {
  const row = state.activePaymentDetailRow;
  if (!row) return;
  const formData = new FormData(resourceForm);
  if (!formData.get('forma_pago')) {
    throw new Error('Selecciona una forma de pago');
  }
  const amount = getPaymentDetailAssignedAmount(row);
  const paid = getPaymentSettlementAmount(row);
  const pending = Math.max(amount - paid, 0);
  if (getPaymentFilterStatus(row) === 'completados' || pending <= 0.009) {
    throw new Error('Este pago ya está completado y no se puede modificar');
  }
  const applied = parseMoneyValue(formData.get('importe_pagado'));
  const isDepositRefund = formData.get('forma_pago') === 'devolucion_fianza';
  const appliedAbs = Math.abs(applied);
  if (!isDepositRefund && applied <= 0) {
    throw new Error('Indica una cantidad mayor que 0');
  }
  if (isDepositRefund && applied >= 0) {
    throw new Error('La devolución de fianza debe ser un importe negativo');
  }
  if (isDepositRefund && !isDepositPaymentRow(row)) {
    throw new Error('La devolución de fianza solo se puede aplicar a una fianza');
  }
  if (!isDepositRefund && applied > pending + 0.009) {
    throw new Error('La cantidad no puede superar el importe pendiente');
  }
  const confirmText = isDepositRefund
    ? `¿Registrar devolución fianza por ${formatMoney(-appliedAbs)} €?`
    : `¿Aplicar este pago por ${formatMoney(applied)} €?`;
  const confirmed = window.confirm(confirmText);
  if (!confirmed) return;

  const payload = getPaymentApplyPayload(row, formData);
  const shouldUpdateReceipt = row.id_pago_inquilino && !isDepositRefund;
  await request(shouldUpdateReceipt ? `${resources.payments.endpoint}/${row.id_pago_inquilino}` : resources.payments.endpoint, {
    method: shouldUpdateReceipt ? 'PUT' : 'POST',
    body: JSON.stringify(payload),
  });

  showToast('Pago aplicado correctamente');
  closePaymentDetail();
  await loadRows();
}

async function applyPaymentRefund() {
  const row = state.activePaymentDetailRow;
  if (!row) return;
  if (!row.id_pago_inquilino) {
    throw new Error('No se pudo identificar el pago positivo para aplicar la devolución');
  }

  if (getPaymentFilterStatus(row) === 'completados') {
    throw new Error('Este pago ya está completado y no se puede modificar');
  }

  const formData = new FormData(resourceForm);
  const amount = parseMoneyValue(row.importe ?? row.importe_total ?? row.importe_asignado);
  const paid = getPaymentSettlementAmount(row);
  const refundType = formData.get('tipo_devolucion') || 'total';
  const refundAmount = refundType === 'parcial'
    ? parseMoneyValue(formData.get('importe_devolucion'))
    : paid;

  if (paid <= 0) {
    throw new Error('No hay importe pagado para devolver');
  }
  if (refundAmount <= 0) {
    throw new Error('Indica una cantidad a devolver mayor que 0');
  }
  if (refundAmount > paid + 0.009) {
    throw new Error('La devolución no puede superar el importe pagado');
  }
  if (refundType === 'parcial' && refundAmount >= paid - 0.009) {
    throw new Error('Para devolver todo el importe selecciona devolución total');
  }

  const remainingAmount = refundType === 'parcial' ? Math.max(paid - refundAmount, 0) : paid;
  const confirmText = refundType === 'total'
    ? `¿Registrar devolución total por ${formatMoney(refundAmount)} €? Se creará un pago negativo y el pago positivo quedará completado.`
    : `¿Registrar devolución parcial por ${formatMoney(refundAmount)} €? El pago positivo quedará en ${formatMoney(remainingAmount)} € y se creará un pago negativo.`;
  const confirmed = window.confirm(confirmText);
  if (!confirmed) return;

  const positivePayload = {
    importe_asignado: refundType === 'parcial' ? remainingAmount : amount,
    importe_pagado: refundType === 'parcial' ? remainingAmount : paid,
    estado: 'pagado',
  };

  await request(`${resources.payments.endpoint}/${row.id_pago_inquilino}`, {
    method: 'PUT',
    body: JSON.stringify(positivePayload),
  });
  await request(resources.payments.endpoint, {
    method: 'POST',
    body: JSON.stringify(getPaymentRefundPayload(row, refundAmount, formData)),
  });

  showToast('Devolución registrada correctamente');
  closePaymentDetail();
  await loadRows();
}

async function cancelExpenseRow(id, endpoint) {
  const resource = state.activeResource;
  if (!isExpenseFilterResource(resource) || isResourceReadOnly(resource)) {
    showToast('No tienes permisos para anular este gasto', 'error');
    return;
  }
  const confirmed = window.confirm(`¿Anular el gasto #${id}? Se conservará en el histórico como cancelado.`);
  if (!confirmed) return;
  await request(`${endpoint}/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ estado: 'cancelado' }),
  });
  showToast('Gasto anulado');
  closeExpenseDetail();
  await loadRows();
}

async function editRow(id) {
  const resource = state.activeResource;
  const row = state.rows.find((item) => String(getValue(item, resource.idKey)) === String(id));
  if (!row) return;
  if (isAdminMenuMode() && state.activeSection === 'owners') {
    await openAdminOwnerForm(row);
    return;
  }
  if (isAdminMenuMode() && state.activeSection === 'houses') {
    await openAdminHouseForm(row);
    return;
  }
  if (isAdminMenuMode() && state.activeSection === 'rooms') {
    await openAdminRoomForm(row);
    return;
  }
  if (isAdminMenuMode() && state.activeSection === 'tenants') {
    await openAdminTenantForm(row);
    return;
  }
  if (isAdminMenuMode() && state.activeSection === 'payments') {
    await openAdminPaymentForm(row);
    return;
  }
  if (isAdminMenuMode() && state.activeSection === 'expenses') {
    await openAdminExpenseForm(row);
    return;
  }
  if (isAdminMenuMode() && state.activeSection === 'liquidations') {
    await openAdminLiquidationForm(row);
    return;
  }
  state.editingId = id;
  state.editingHouseRooms = resource === resources.houses ? await loadHouseRooms(id) : [];
  if (resource === resources.tenants) {
    await ensureTenantAssignmentRows(row.id_inquilino || id);
  }
  renderForm(row);
  if (resource === resources.houses && state.resourceAction === 'update') {
    resourceForm?.classList.remove('hidden');
    tableWrap?.classList.add('hidden');
    splitLayout?.classList.remove('table-full-width');
    splitLayout?.classList.add('tenant-create-layout');
  }
  if (isAdminMenuMode() && state.activeSection === 'users') {
    resourceForm?.classList.remove('hidden');
    tableWrap?.classList.remove('hidden');
    splitLayout?.classList.remove('tenant-create-layout');
    splitLayout?.classList.add('table-full-width');
    detailPanel?.classList.add('hidden');
  }
}

async function uploadTenantAvatar(userId, file) {
  const data = new FormData();
  data.set('avatar', file);
  const result = await request(`/api/user/${userId}/avatar`, {
    method: 'POST',
    body: data,
  });

  if (String(state.user?.id_usuario) === String(userId) && result?.avatar_archivo) {
    state.user.avatar_archivo = result.avatar_archivo;
    sessionStorage.setItem(STORAGE_KEYS.user, JSON.stringify(state.user));
    renderUserBadge(Boolean(state.token));
  }

  return result;
}

function handleDocumentPreviewAction(action, id) {
  if (!id) return false;
  if (action === 'preview-tenant-document') {
    previewFile(`/api/tenant/${id}/document`, `Documento de identidad #${id}`)
      .catch((error) => showToast(error.message, 'error'));
    return true;
  }
  if (action === 'preview-contract') {
    previewFile(`/api/tenant/${id}/contract`, `Contrato #${id}`)
      .catch((error) => showToast(error.message, 'error'));
    return true;
  }
  if (action === 'preview-signed-contract') {
    previewFile(`/api/tenant/${id}/contract/signed`, `Contrato firmado #${id}`)
      .catch((error) => showToast(error.message, 'error'));
    return true;
  }
  return false;
}

async function editTenantFromDetail(id) {
  const tenant = await request(`/api/tenant/${id}`);
  await loadTenantCreateRooms();
  await ensureTenantAssignmentRows(id);
  state.resourceAction = 'update';
  state.editingTenantFull = tenant;
  state.activeSection = 'tenants';
  state.activeResource = resources.tenants;
  clearDetailPanel();
  resourceForm?.classList.remove('hidden');
  splitLayout?.classList.remove('table-full-width');
  splitLayout?.classList.add('tenant-create-layout');
  tableWrap?.classList.add('hidden');
  updateNavigation();
  updateTenantSortFilterVisibility();
  renderTenantCreateForm(tenant);
}

async function createTenantFromDetail() {
  state.resourceAction = 'create';
  state.editingId = null;
  state.editingTenantFull = null;
  state.activeSection = 'tenants';
  state.activeResource = resources.tenants;
  await loadTenantCreateRooms();
  clearDetailPanel();
  resourceForm?.classList.remove('hidden');
  splitLayout?.classList.remove('table-full-width');
  splitLayout?.classList.add('tenant-create-layout');
  tableWrap?.classList.add('hidden');
  updateNavigation();
  updateTenantSortFilterVisibility();
  renderTenantCreateForm();
}

async function deleteTenantFromDetail(id) {
  state.activeSection = 'tenants';
  state.activeResource = resources.tenants;
  await deleteRow(id);
  clearDetailPanel();
}

async function createTenantStayFromDetail(id) {
  const tenant = await request(`/api/tenant/${id}`);
  const readiness = await request(`/api/tenant/${id}/stay-readiness`);
  state.tenantStayReadiness = readiness;
  await loadTenantCreateRooms();
  state.resourceAction = 'stay';
  state.editingId = null;
  state.editingTenantFull = tenant;
  state.activeSection = 'tenants';
  state.activeResource = resources.tenants;
  clearDetailPanel();
  state.activeTenantDetailId = id;
  resourceForm?.classList.remove('hidden');
  splitLayout?.classList.remove('table-full-width');
  splitLayout?.classList.add('tenant-create-layout');
  tableWrap?.classList.add('hidden');
  updateNavigation();
  updateTenantSortFilterVisibility();
  renderTenantStayForm(tenant, readiness);
}

async function runTenantSectionAction(action) {
  if (action === 'create') {
    await createTenantFromDetail();
    renderTenantSectionActions();
    return;
  }
  if (!state.activeTenantDetailId) return;
  if (action === 'details') {
    await openTenantDetail({ dataset: { id: state.activeTenantDetailId } });
    renderTenantSectionActions();
    return;
  }
  if (action === 'update') {
    await editTenantFromDetail(state.activeTenantDetailId);
    renderTenantSectionActions();
    return;
  }
  if (action === 'stay') {
    await createTenantStayFromDetail(state.activeTenantDetailId);
    renderTenantSectionActions();
    return;
  }
  if (action === 'delete') {
    await deleteTenantFromDetail(state.activeTenantDetailId);
    renderTenantSectionActions();
  }
}

async function runRoomsSectionAction(action) {
  const detail = state.activeHouseDetail;
  const selectedHouseId = state.roomsSelectedHouseId || detail?.houseId || '';
  const selectedHouse = getRoomActionHouseOptions()
    .find((house) => String(house.id_vivienda) === String(selectedHouseId));
  const selectedRoom = detail?.rooms?.find((room) => String(room.id_habitacion) === String(detail.selectedRoomId));

  if (action === 'create') {
    if (!selectedHouseId) {
      showToast('Selecciona una vivienda', 'error');
      return;
    }
    await openAdminRoomForm({
      id_vivienda: selectedHouseId,
      nombre: getNextRoomDefaultName(detail?.rooms || []),
      activa: 1,
    }, { inline: true });
    renderRoomsSectionActions();
    return;
  }

  if (!selectedRoom?.id_habitacion) return;

  if (action === 'update') {
    await openAdminRoomForm(selectedRoom, { inline: true });
    renderRoomsSectionActions();
    return;
  }

  if (action === 'delete') {
    const confirmed = window.confirm(`¿Desactivar ${selectedRoom.nombre || 'esta habitación'}?`);
    if (!confirmed) return;
    await request(`${resources.rooms.endpoint}/${selectedRoom.id_habitacion}`, {
      method: 'PUT',
      body: JSON.stringify({ activa: 0 }),
    });
    showToast('Habitación desactivada');
    await loadRows();
    if (selectedHouse) {
      await loadHouseDetail(selectedHouse.id_vivienda, selectedHouse.nombre || selectedHouse.direccion || 'Vivienda sin nombre');
    }
    renderRoomsSectionActions();
  }
}

const formatMoney = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toFixed(2) : value;
};

function renderDetailTable(title, rows, columns) {
  return `<section class="detail-block">
    <h4>${title}</h4>
    <div class="detail-table-wrap">
      <table>
        <thead><tr>${columns.map(([key, label]) => `<th>${label || key}</th>`).join('')}</tr></thead>
        <tbody>${rows.length ? rows.map((row) => `<tr>${columns.map(([key]) => `<td>${row[key] ?? ''}</td>`).join('')}</tr>`).join('') : `<tr><td class="empty" colspan="${columns.length}">No hay registros.</td></tr>`}</tbody>
      </table>
    </div>
  </section>`;
}

function normalizeLiquidationDetails(details) {
  const ingresosInquilinos = (details.ingresos_inquilinos || []).map((row) => ({
    tipo: row.tipo,
    concepto: row.concepto,
    inquilino: [row.nombre_inquilino, row.apellido1_inquilino, row.apellido2_inquilino].filter(Boolean).join(' '),
    habitacion: row.nombre_habitacion,
    asignado: formatMoney(row.importe_asignado),
    pagado: formatMoney(row.importe_pagado),
    pendiente: formatMoney(row.importe_pendiente),
    estado: row.estado,
    fecha: row.fecha_pago || '',
  }));

  const gastosInquilinos = (details.gastos_inquilinos || []).map((row) => ({
    tipo: row.tipo,
    descripcion: row.descripcion,
    importe: formatMoney(row.importe_total),
    desde: row.fecha_inicio || '',
    hasta: row.fecha_fin || '',
    estado: row.estado,
  }));

  const gastosPropietario = (details.gastos_propietario || []).map((row) => ({
    tipo: row.tipo,
    concepto: row.concepto,
    descripcion: row.descripcion,
    importe: formatMoney(row.importe),
    fecha: row.fecha || '',
    estado: row.estado,
  }));

  return { ingresosInquilinos, gastosInquilinos, gastosPropietario };
}

async function openLiquidationDetail(row) {
  const id = row.dataset.id;
  if (!id || !detailPanel) return;

  state.activeLiquidationDetailId = id;
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = '<p class="detail-loading">Cargando detalle...</p>';

  const details = await request(`/api/owner-liquidation/${id}/details`);
  const liquidation = details.liquidation || {};
  const normalized = normalizeLiquidationDetails(details);

  detailPanel.innerHTML = `<div class="detail-header">
    <div>
      <p class="eyebrow">Detalle contable #${liquidation.id_liquidacion}</p>
      <h3>${liquidation.nombre_vivienda || 'Vivienda'} · ${liquidation.mes}/${liquidation.anio}</h3>
    </div>
    <button class="detail-close-button" data-action="close-detail" type="button" aria-label="Cerrar">&times;</button>
  </div>
  <div class="detail-summary">
    <span>Ingresos alquiler <strong>${formatMoney(liquidation.ingresos_alquiler)}</strong></span>
    <span>Gastos <strong>${formatMoney(Number(liquidation.gastos_vivienda || 0) + Number(liquidation.gastos_recuperados || 0) + Number(liquidation.pagos_pendientes || 0))}</strong></span>
    <span>Beneficio <strong>${formatMoney(liquidation.beneficio)}</strong></span>
    <span>Propietario <strong>${formatMoney(liquidation.importe_propietario)}</strong></span>
  </div>
  ${renderDetailTable('Ingresos y recibos de inquilinos', normalized.ingresosInquilinos, [
    ['tipo', 'Tipo'],
    ['concepto', 'Concepto'],
    ['inquilino', 'Inquilino'],
    ['habitacion', 'Habitación'],
    ['asignado', 'Asignado'],
    ['pagado', 'Pagado'],
    ['pendiente', 'Pendiente'],
    ['estado', 'Estado'],
    ['fecha', 'Fecha pago'],
  ])}
  ${renderDetailTable('Gastos de vivienda repercutidos a inquilinos', normalized.gastosInquilinos, [
    ['tipo', 'Tipo'],
    ['descripcion', 'Descripción'],
    ['importe', 'Importe'],
    ['desde', 'Desde'],
    ['hasta', 'Hasta'],
    ['estado', 'Estado'],
  ])}
  ${renderDetailTable('Gastos del propietario', normalized.gastosPropietario, [
    ['tipo', 'Tipo'],
    ['concepto', 'Concepto'],
    ['descripcion', 'Descripción'],
    ['importe', 'Importe'],
    ['fecha', 'Fecha'],
    ['estado', 'Estado'],
  ])}`;
}

function parseDateValue(value) {
  if (!value) return null;
  const inputValue = dateToInputValue(value);
  const date = new Date(inputValue || value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isActiveRoomTenant(row = {}) {
  if (row.activo !== undefined && row.activo !== null && Number(row.activo) === 0) return false;
  const exitDate = parseDateValue(row.fecha_salida);
  if (!exitDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return exitDate >= today;
}

function getTenantDisplayName(row = {}) {
  return [row.nombre, row.nombre_inquilino, row.apellido1, row.apellido2]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    || `Inquilino #${row.id_inquilino || ''}`.trim();
}

function getAssignmentRank(row = {}) {
  return [
    isActiveRoomTenant(row) ? 1 : 0,
    parseDateValue(row.fecha_entrada)?.getTime() || 0,
    Number(row.id_habitacion_inquilino || 0),
  ];
}

function compareAssignmentRank(left = {}, right = {}) {
  const leftRank = getAssignmentRank(left);
  const rightRank = getAssignmentRank(right);
  for (let index = 0; index < leftRank.length; index += 1) {
    if (leftRank[index] !== rightRank[index]) return leftRank[index] - rightRank[index];
  }
  return 0;
}

function getCurrentTenantAssignments(tenants = []) {
  const byTenant = new Map();
  tenants.forEach((tenant) => {
    const tenantId = String(tenant.id_inquilino || '');
    if (!tenantId) return;
    const current = byTenant.get(tenantId);
    if (!current || compareAssignmentRank(current, tenant) < 0) {
      byTenant.set(tenantId, tenant);
    }
  });
  return Array.from(byTenant.values()).filter(isActiveRoomTenant);
}

function getRoomOccupants(room, tenants = []) {
  return getCurrentTenantAssignments(tenants)
    .filter((tenant) => String(tenant.id_habitacion || '') === String(room.id_habitacion));
}

function renderHouseRoomButton(room, occupants, selectedRoomId) {
  const totalBeds = Number(room.numero_camas || 0);
  const occupiedBeds = occupants.length;
  const availableBeds = Math.max(totalBeds - occupiedBeds, 0);
  const active = room.activa === true || Number(room.activa) === 1;
  const selected = String(room.id_habitacion) === String(selectedRoomId);
  const price = formatDisplayValue('precio', getValue(room, 'precio')) || '-';

  return `<button class="house-detail-room ${selected ? 'active' : ''}" data-action="select-house-room" data-room-id="${escapeHtml(room.id_habitacion)}" type="button">
    <span>
      <strong>${escapeHtml(room.nombre || 'Habitación sin nombre')}</strong>
      <em>Precio ${escapeHtml(price)}</em>
      <em>${escapeHtml(room.tipo || 'Sin tipo')} · ${active ? 'Activa' : 'Inactiva'}</em>
    </span>
    <span class="house-room-stats">
      <small>${availableBeds} libres</small>
      <small>${occupiedBeds} ocupadas</small>
      <small>${totalBeds} camas</small>
    </span>
  </button>`;
}

function getActiveTenantsForAssignment(detail, room) {
  const occupantsInRoom = new Set(getRoomOccupants(room, detail.tenants).map((tenant) => String(tenant.id_inquilino)));
  const currentTenants = getCurrentTenantAssignments(detail.allTenants || detail.tenants || []);
  const uniqueTenants = new Map();
  currentTenants.forEach((tenant) => {
    if (tenant.id_inquilino) uniqueTenants.set(String(tenant.id_inquilino), tenant);
  });
  return Array.from(uniqueTenants.values())
    .filter((tenant) => tenant.activo === true || Number(tenant.activo) === 1 || String(tenant.activo).toLowerCase() === 'true')
    .filter((tenant) => !occupantsInRoom.has(String(tenant.id_inquilino)))
    .sort((left, right) => getTenantDisplayName(left).localeCompare(getTenantDisplayName(right), 'es'));
}

function renderTenantAssignmentSelect(room, bedIndex, tenants) {
  return `<label class="house-bed-assign">Asignar inquilino
    <select data-action="assign-tenant-bed" data-room-id="${escapeHtml(room.id_habitacion)}" data-bed-index="${bedIndex}">
      <option value="">Selecciona</option>
      ${tenants.map((tenant) => `<option value="${escapeHtml(tenant.id_inquilino)}">${escapeHtml(getTenantDisplayName(tenant))}</option>`).join('')}
    </select>
  </label>`;
}

function renderRoomBeds(room, occupants, detail) {
  if (!room) {
    return '<p class="empty-detail">Selecciona una habitación.</p>';
  }

  const totalBeds = Number(room.numero_camas || 0);
  const assignmentTenants = getActiveTenantsForAssignment(detail, room);
  const beds = Array.from({ length: Math.max(totalBeds, occupants.length) }, (_, index) => {
    const occupant = occupants[index];
    const assigning = detail.assigningRoomId
      && String(detail.assigningRoomId) === String(room.id_habitacion)
      && Number(detail.assigningBedIndex) === index;
    return `<div class="house-bed-item ${occupant ? 'occupied' : 'available'} ${assigning ? 'active' : ''}" ${!occupant ? `data-action="show-bed-tenant-select" data-room-id="${escapeHtml(room.id_habitacion)}" data-bed-index="${index}"` : ''}>
      <span>Cama ${index + 1}</span>
      <strong>${occupant ? escapeHtml(getTenantDisplayName(occupant)) : 'Libre'}</strong>
      ${occupant?.fecha_entrada ? `<small>Entrada ${escapeHtml(formatDateDisplay(occupant.fecha_entrada))}</small>` : ''}
      ${!occupant && assigning ? renderTenantAssignmentSelect(room, index, assignmentTenants) : ''}
    </div>`;
  });

  return beds.length
    ? `<div class="house-bed-list">${beds.join('')}</div>`
    : '<p class="empty-detail">Esta habitación no tiene camas configuradas.</p>';
}

function renderHouseDetail() {
  const detail = state.activeHouseDetail;
  if (!detailPanel || !detail) return;
  const selectedRoom = detail.rooms.find((room) => String(room.id_habitacion) === String(detail.selectedRoomId))
    || detail.rooms[0]
    || null;
  const currentTenants = getCurrentTenantAssignments(detail.tenants);
  const selectedOccupants = selectedRoom ? getRoomOccupants(selectedRoom, currentTenants) : [];
  const totalBeds = detail.rooms.reduce((sum, room) => sum + Number(room.numero_camas || 0), 0);
  const occupiedBeds = detail.rooms.reduce((sum, room) => sum + getRoomOccupants(room, currentTenants).length, 0);
  const roomInlineForm = state.activeResource === resources.rooms && ['create', 'update'].includes(state.resourceAction)
    ? renderRoomInlineForm(state.editingRoomForm || {})
    : '';
  const houseDetailCloseButton = state.activeResource === resources.rooms
    ? ''
    : '<button class="detail-close-button" data-action="close-detail" type="button" aria-label="Cerrar">&times;</button>';

  detailPanel.innerHTML = `${roomInlineForm}<div class="detail-header">
    <div>
      <p class="eyebrow">Vivienda</p>
      <h3>${escapeHtml(detail.houseName)}</h3>
    </div>
    ${houseDetailCloseButton}
  </div>
  <div class="house-detail-window">
    <section class="house-detail-pane">
      <div class="house-detail-pane-header">
        <h4>Habitaciones</h4>
        <span>${Math.max(totalBeds - occupiedBeds, 0)} libres · ${occupiedBeds} ocupadas · ${totalBeds} camas</span>
      </div>
      <div class="house-detail-room-list">
        ${detail.rooms.length
          ? detail.rooms.map((room) => renderHouseRoomButton(room, getRoomOccupants(room, currentTenants), selectedRoom?.id_habitacion)).join('')
          : '<p class="empty-detail">Esta vivienda no tiene habitaciones.</p>'}
      </div>
    </section>
    <section class="house-detail-pane">
      <div class="house-detail-pane-header">
        <h4>${escapeHtml(selectedRoom?.nombre || 'Camas')}</h4>
        ${selectedRoom ? `<span>${selectedOccupants.length}/${Number(selectedRoom.numero_camas || 0)} ocupadas</span>` : ''}
      </div>
      ${renderRoomBeds(selectedRoom, selectedOccupants, detail)}
    </section>
  </div>`;
}

async function loadHouseDetail(houseId, houseName, selectedRoomId = '') {
  if (!houseId || !detailPanel) return;

  state.roomsSelectedHouseId = String(houseId);
  tableWrap?.classList.add('hidden');
  splitLayout?.classList.add('table-full-width');
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = '<p class="detail-loading">Cargando habitaciones...</p>';

  const [roomsPayload, tenantsPayload] = await Promise.all([
    request(`${resources.rooms.endpoint}?page=1&limit=500&id_vivienda=${encodeURIComponent(houseId)}`),
    request(`${getResourceEndpoint(resources.tenants)}?page=1&limit=500`),
  ]);
  const rooms = getRows(roomsPayload).filter((room) => String(room.id_vivienda) === String(houseId));
  const allTenants = getRows(tenantsPayload);
  const tenants = allTenants.filter((tenant) => String(tenant.id_vivienda || '') === String(houseId));

  state.activeHouseDetail = {
    houseId,
    houseName,
    rooms,
    tenants,
    allTenants,
    selectedRoomId: selectedRoomId || rooms[0]?.id_habitacion || '',
    assigningRoomId: null,
    assigningBedIndex: null,
  };
  renderHouseDetail();
  if (state.activeResource === resources.rooms) renderRoomsSectionActions();
}

async function openHouseTenants(row) {
  const houseId = row.dataset.houseId;
  const houseName = row.dataset.houseName || 'Vivienda sin nombre';
  await loadHouseDetail(houseId, houseName);
}

async function openRoomsSectionHouseDetail() {
  if (state.activeResource !== resources.rooms) return;
  const houses = getRoomActionHouseOptions();
  const selectedHouse = state.roomsSelectedHouseId
    ? houses.find((house) => String(house.id_vivienda) === String(state.roomsSelectedHouseId))
    : null;
  if (!selectedHouse) {
    tableWrap?.classList.add('hidden');
    detailPanel?.classList.add('hidden');
    if (detailPanel) detailPanel.innerHTML = '';
    renderRoomsSectionActions();
    return;
  }
  const houseId = selectedHouse.id_vivienda;
  const houseName = selectedHouse.nombre || selectedHouse.direccion || 'Vivienda sin nombre';
  await loadHouseDetail(houseId, houseName);
}

async function assignTenantToRoom(tenantId, roomId) {
  const detail = state.activeHouseDetail;
  if (!tenantId || !roomId || !detail) return;
  const tenant = await request(`/api/tenant/${tenantId}`);
  if (tenant.id_habitacion) {
    await request(`/api/tenant/${tenantId}/change-room`, {
      method: 'POST',
      body: JSON.stringify({
        id_habitacion: roomId,
        fecha_cambio: inputDateToDisplay(todayInputValue()),
      }),
    });
    showToast('Cambio de habitación guardado');
    await loadHouseDetail(detail.houseId, detail.houseName, roomId);
    return;
  }

  const data = new FormData();
  [
    'nombre',
    'apellido1',
    'apellido2',
    'email',
    'telefono',
    'nacionalidad',
    'identificacion',
    'numero_documento',
  ].forEach((key) => data.set(key, tenant[key] || ''));
  const entryDate = inputDateToDisplay(todayInputValue());
  data.set('id_habitacion', roomId);
  data.set('fecha_entrada', entryDate);
  data.set('fecha_salida', '');
  const result = await request(`/api/tenant/${tenantId}/full`, {
    method: 'PUT',
    body: data,
  });
  await createTenantDepositExpense({
    result,
    roomId,
    entryDate,
    amount: getDefaultDepositAmount(),
  });
  showToast('Inquilino asignado');
  await loadHouseDetail(detail.houseId, detail.houseName, roomId);
}

async function runResourceMenuAction(section, action) {
  if (!getResourceActionConfig(section, action)) return;
  if (section === 'houses' && action === 'update' && state.activeHouseRecordId) {
    await openActiveHouseEditForm();
    return;
  }
  if (section === 'houses' && action === 'delete' && state.activeHouseRecordId) {
    await deactivateActiveHouseRecord();
    return;
  }
  state.resourceAction = action;
  state.editingTenantFull = null;
  state.tenantHouseFilter = null;
  state.collapsedNavGroups[section] = false;
  if (searchInput) searchInput.value = '';
  await loadSection(section);
}

async function login(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = formDataToObject(form);
  const response = await request('/api/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }, false);
  setSession(response);
  form.reset();
  renderAuth();
  showToast('Sesión iniciada');
  await loadSection('dashboard');
}

async function logout() {
  try {
    if (state.refreshToken) {
      await request('/api/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: state.refreshToken }),
      }, false);
    }
  } catch {
    // La sesión local se borra igualmente si el token ya no es válido.
  }
  clearSession();
  state.userMenuOpen = false;
  renderAuth();
}

function bindEvents() {
  if (apiBaseInput) apiBaseInput.value = state.apiBase;

  ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'pointerdown'].forEach((eventName) => {
    document.addEventListener(eventName, handleUserActivity, { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) handleUserActivity();
  });

  apiBaseInput?.addEventListener('change', async () => {
    state.apiBase = DEFAULT_API_BASE;
    apiBaseInput.value = state.apiBase;
    localStorage.setItem(STORAGE_KEYS.apiBase, state.apiBase);
    await checkHealth();
  });

  defaultDepositInput?.addEventListener('change', () => {
    const value = Math.max(0, parseMoneyValue(defaultDepositInput.value));
    localStorage.setItem(STORAGE_KEYS.defaultDeposit, value.toFixed(2));
    defaultDepositInput.value = value.toFixed(2);
    showToast('Fianza por defecto actualizada');
  });

  minimumMonthlyDaysInput?.addEventListener('change', () => {
    const value = Math.min(31, Math.max(1, Number.parseInt(minimumMonthlyDaysInput.value, 10) || DEFAULT_MINIMUM_MONTHLY_DAYS));
    localStorage.setItem(STORAGE_KEYS.minimumMonthlyDays, String(value));
    minimumMonthlyDaysInput.value = value;
    showToast('Mensualidad mínima actualizada');
  });

  [
    '#statisticsPeriodType',
    '#statisticsMonth',
    '#statisticsYear',
    '#statisticsCompareMonth',
    '#statisticsCompareYear',
  ].forEach((selector) => {
    $(selector)?.addEventListener('change', () => {
      renderStatisticsChart().catch((error) => showToast(error.message, 'error'));
    });
  });

  $('#loginForm')?.addEventListener('submit', (event) => {
    login(event).catch((error) => showToast(error.message, 'error'));
  });

  logoutButton?.addEventListener('click', () => logout());
  roleBadge?.addEventListener('click', (event) => {
    event.stopPropagation();
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;

    if (actionButton.dataset.action === 'toggle-user-menu') {
      state.userMenuOpen = !state.userMenuOpen;
      renderUserBadge(Boolean(state.token));
      return;
    }

    if (actionButton.dataset.action === 'logout-user-menu') {
      logout().catch((error) => showToast(error.message, 'error'));
    }
  });
  document.addEventListener('click', (event) => {
    if (!state.userMenuOpen || roleBadge?.contains(event.target)) return;
    state.userMenuOpen = false;
    renderUserBadge(Boolean(state.token));
  });
  document.addEventListener('click', (event) => {
    if (!state.activeExpenseDetailRow && !state.activePaymentDetailRow) return;
    if (resourceForm?.contains(event.target)) return;
    if (event.target.closest('tr[data-action="open-expense-detail"], tr[data-action="open-payment-detail"], tr[data-action="open-deposit-detail"]')) return;

    if (state.activeExpenseDetailRow) closeExpenseDetail();
    if (state.activePaymentDetailRow) closePaymentDetail();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !state.userMenuOpen) return;
    state.userMenuOpen = false;
    renderUserBadge(Boolean(state.token));
  });
  $('#refreshButton')?.addEventListener('click', () => loadSection().catch((error) => showToast(error.message, 'error')));

  mainNav?.querySelectorAll('.nav-link').forEach((button) => {
    button.addEventListener('click', () => {
      state.tenantHouseFilter = null;
      state.resourceAction = null;
      state.editingTenantFull = null;
      const section = button.dataset.section;
      if (section === 'rooms') {
        state.roomsSelectedHouseId = '';
        state.activeHouseDetail = null;
        state.editingRoomForm = null;
        state.roomFormLocked = false;
      }
      if (resourceMenuActions[section]) {
        collapseAllNavGroups(section);
        state.collapsedNavGroups[section] = !isNavGroupCollapsed(section);
        updateNavigation();
      } else {
        collapseAllNavGroups();
        updateNavigation();
      }
      loadSection(section).catch((error) => showToast(error.message, 'error'));
    });
  });

  adminNav?.addEventListener('click', (event) => {
    const logoutAction = event.target.closest('[data-action="admin-logout"]');
    if (logoutAction) {
      logout().catch((error) => showToast(error.message, 'error'));
      return;
    }

    const sectionButton = event.target.closest('[data-admin-section]');
    if (!sectionButton) return;
    const adminSection = sectionButton.dataset.adminSection;
    if (!canAccessAdminMenuSection(adminSection)) {
      adminView?.classList.add('hidden');
      showToast('No tienes permisos para acceder al menú administrador', 'error');
      return;
    }
    if (adminSection === 'rooms') {
      state.roomsSelectedHouseId = '';
      state.activeHouseDetail = null;
      state.editingRoomForm = null;
      state.roomFormLocked = false;
      state.resourceAction = null;
    }
    loadSection(adminSection).catch((error) => showToast(error.message, 'error'));
  });

  document.querySelectorAll('.nav-sublink').forEach((button) => {
    button.addEventListener('click', () => {
      runResourceMenuAction(button.dataset.section, button.dataset.resourceAction)
        .catch((error) => showToast(error.message, 'error'));
    });
  });

  resourceForm?.addEventListener('submit', (event) => {
    submitResource(event).catch((error) => showToast(error.message, 'error'));
  });

  dashboardView?.addEventListener('click', (event) => {
    const card = event.target.closest('[data-dashboard-section]');
    if (!card) return;
    state.resourceAction = null;
    state.tenantHouseFilter = null;
    state.editingTenantFull = null;
    collapseAllNavGroups();
    updateNavigation();
    loadSection(card.dataset.dashboardSection).catch((error) => showToast(error.message, 'error'));
  });

  resourceForm?.addEventListener('click', (event) => {
    if (event.target.id === 'cancelEditButton') {
      state.editingId = null;
      if (state.activeDepositDetailId) {
        state.activeDepositDetailId = null;
        resourceForm.classList.add('hidden');
        resourceForm.classList.remove('expense-create-form', 'deposit-detail-form');
        resourceForm.innerHTML = '';
        tableWrap?.classList.remove('hidden');
        splitLayout?.classList.add('table-full-width');
        splitLayout?.classList.remove('tenant-create-layout');
        return;
      }
      if (state.activeExpenseDetailRow) {
        closeExpenseDetail();
      } else if (state.activePaymentDetailRow) {
        closePaymentDetail();
      } else if (isTenantFullFormMode()) {
        resourceForm.reset();
        renderTenantCreateForm(state.editingTenantFull);
      } else if (isTenantStayMode()) {
        state.resourceAction = null;
        state.editingTenantFull = null;
        state.tenantStayReadiness = null;
        resourceForm.classList.add('hidden');
        tableWrap?.classList.remove('hidden');
        splitLayout?.classList.add('table-full-width');
        splitLayout?.classList.remove('tenant-create-layout');
        renderTenantSectionActions();
      } else if (isHouseCreateMode()) {
        resourceForm.reset();
        renderHouseForm();
      } else if (state.activeSection === 'houses' && state.resourceAction === 'update') {
        state.resourceAction = null;
        resourceForm.classList.add('hidden');
        tableWrap?.classList.remove('hidden');
        splitLayout?.classList.add('table-full-width');
        splitLayout?.classList.remove('tenant-create-layout');
        renderHouseSectionActions();
      } else if (isAdminMenuMode() && state.activeSection === 'owners') {
        state.resourceAction = null;
        resourceForm.classList.add('hidden');
        resourceForm.innerHTML = '';
        splitLayout?.classList.add('table-full-width');
      } else if (isAdminMenuMode() && state.activeSection === 'houses') {
        state.resourceAction = null;
        resourceForm.classList.add('hidden');
        resourceForm.innerHTML = '';
        splitLayout?.classList.add('table-full-width');
      } else if (isAdminMenuMode() && state.activeSection === 'rooms') {
        state.resourceAction = null;
        resourceForm.classList.add('hidden');
        resourceForm.innerHTML = '';
        splitLayout?.classList.add('table-full-width');
      } else if (state.activeSection === 'rooms') {
        state.resourceAction = null;
        resourceForm.classList.add('hidden');
        resourceForm.innerHTML = '';
        splitLayout?.classList.add('table-full-width');
        detailPanel?.classList.remove('hidden');
        renderRoomsSectionActions();
      } else if (isAdminMenuMode() && state.activeSection === 'tenants') {
        state.resourceAction = null;
        resourceForm.classList.add('hidden');
        resourceForm.innerHTML = '';
        splitLayout?.classList.add('table-full-width');
      } else if (isAdminMenuMode() && state.activeSection === 'payments') {
        state.resourceAction = null;
        resourceForm.classList.add('hidden');
        resourceForm.innerHTML = '';
        splitLayout?.classList.add('table-full-width');
      } else if (isAdminMenuMode() && state.activeSection === 'expenses') {
        state.resourceAction = null;
        resourceForm.classList.add('hidden');
        resourceForm.innerHTML = '';
        splitLayout?.classList.add('table-full-width');
      } else if (isAdminMenuMode() && state.activeSection === 'liquidations') {
        state.resourceAction = null;
        resourceForm.classList.add('hidden');
        resourceForm.innerHTML = '';
        splitLayout?.classList.add('table-full-width');
      } else {
        renderForm();
      }
    }

    const actionButton = event.target.closest('button[data-action]');
    if (actionButton?.dataset.action === 'add-room-change') {
      addTenantRoomChangeForm();
    }
    if (actionButton?.dataset.action === 'remove-room-change') {
      actionButton.closest('[data-room-change-item]')?.remove();
      renumberTenantRoomChangeForms();
    }
    if (actionButton?.dataset.action === 'toggle-billing-calendar') {
      const calendar = resourceForm.querySelector('[data-billing-calendar]');
      const hidden = calendar?.classList.toggle('hidden');
      actionButton.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    }
    if (actionButton?.dataset.action === 'change-billing-month') {
      updateBillingCalendar(actionButton.dataset.month);
    }
    if (actionButton?.dataset.action === 'select-billing-date') {
      const { start, end } = getBillingCalendarState();
      const selectedDate = actionButton.dataset.date;
      const selected = parseInputDate(selectedDate);
      const currentStart = parseInputDate(start);
      const currentEnd = parseInputDate(end);
      if (!currentStart || !currentEnd || start !== end || selected < currentStart) {
        updateBillingPeriod(selectedDate, selectedDate);
      } else {
        updateBillingPeriod(start, selectedDate);
        const calendar = resourceForm.querySelector('[data-billing-calendar]');
        const trigger = resourceForm.querySelector('[data-action="toggle-billing-calendar"]');
        calendar?.classList.add('hidden');
        trigger?.setAttribute('aria-expanded', 'false');
      }
    }
    if (actionButton?.dataset.action === 'apply-avatar-crop') {
      applyTenantAvatarCrop().catch((error) => showToast(error.message, 'error'));
    }
    if (actionButton?.dataset.action === 'cancel-avatar-crop') {
      cancelTenantAvatarCrop();
    }
    if (actionButton?.dataset.action === 'cancel-expense-detail') {
      cancelExpenseRow(actionButton.dataset.id, actionButton.dataset.endpoint).catch((error) => showToast(error.message, 'error'));
    }
    if (actionButton?.dataset.action === 'apply-payment-detail') {
      applyPaymentDetail().catch((error) => showToast(error.message, 'error'));
    }
    if (actionButton?.dataset.action === 'apply-payment-refund') {
      applyPaymentRefund().catch((error) => showToast(error.message, 'error'));
    }
    if (actionButton?.dataset.action === 'accept-room-price') {
      acceptHouseRoomPrice(Number(actionButton.dataset.roomIndex)).catch((error) => showToast(error.message, 'error'));
    }
    if (actionButton?.dataset.action === 'accept-managed-room-price') {
      acceptManagedRoomPrice(Number(actionButton.dataset.roomIndex)).catch((error) => showToast(error.message, 'error'));
    }
  });

  resourceForm?.addEventListener('change', (event) => {
    const movementType = event.target.closest('[data-deposit-movement-type]');
    if (movementType) {
      const root = movementType.closest('.expense-create-form') || resourceForm;
      const isCompensation = movementType.value === 'compensacion';
      const pickerButton = root.querySelector('[data-action="open-deposit-payment-modal"]');
      root.querySelector('[data-deposit-payment-field]')?.classList.add('hidden');
      pickerButton?.classList.toggle('hidden', !isCompensation);
      root.querySelector('[data-deposit-payment-modal]')?.classList.toggle('hidden', !isCompensation);
      if (!isCompensation) {
        const paymentSelect = root.querySelector('[name="id_pago_inquilino_movimiento"]');
        if (paymentSelect) paymentSelect.value = '';
        if (pickerButton) pickerButton.textContent = 'Seleccionar pago pendiente';
        root.querySelectorAll('[data-action="select-deposit-payment"]').forEach((button) => button.classList.remove('active'));
      }
      return;
    }

    if (
      (event.target.name === 'precio_habitacion' || event.target.name === 'fecha_precio_desde')
      && state.activePaymentDetailRow
    ) {
      updatePaymentRoomPricePreview();
      return;
    }
    if (event.target.name === 'forma_pago' && state.activePaymentDetailRow) {
      updatePaymentAmountMode();
      return;
    }
    if (event.target.name === 'tipo_devolucion' && state.activePaymentDetailRow) {
      updatePaymentRefundMode();
      return;
    }
    if (event.target.matches('[data-tenant-house-select]') && (isTenantFullFormMode() || isTenantStayMode())) {
      updateTenantRoomOptionsForHouse();
      return;
    }
    if (event.target.matches('[data-admin-tenant-house-select]') && isAdminMenuMode() && state.activeSection === 'tenants') {
      const roomSelect = resourceForm.querySelector('select[name="id_habitacion"]');
      if (roomSelect) {
        roomSelect.innerHTML = `<option value="">Sin asignar</option>${getAdminTenantRoomOptions(event.target.value)}`;
      }
      return;
    }
    if (
      isTenantFullEditMode()
      && (event.target.name === 'change_id_habitacion' || event.target.name === 'fecha_cambio')
    ) {
      updateTenantRoomChangePreviews();
      return;
    }
    if (event.target.name === 'gasto_de' && isExpenseCreateMode()) {
      const isTenantExpense = event.target.value === 'inquilino';
      const houseField = resourceForm.querySelector('[data-expense-house-field]');
      const houseSelect = houseField?.querySelector('select');
      const tenantField = resourceForm.querySelector('[data-expense-tenant-field]');
      const tenantSelect = tenantField?.querySelector('select');
      houseField?.classList.toggle('hidden', isTenantExpense);
      tenantField?.classList.toggle('hidden', !isTenantExpense);
      if (houseSelect) {
        houseSelect.required = !isTenantExpense;
        if (isTenantExpense) houseSelect.value = '';
      }
      if (tenantSelect) {
        tenantSelect.required = isTenantExpense;
        if (!isTenantExpense) tenantSelect.value = '';
      }
      return;
    }
    if (event.target.matches('[data-expense-concept-select]')) {
      const customConcept = resourceForm.querySelector('[data-expense-custom-concept]');
      const customInput = customConcept?.querySelector('input');
      const showCustomConcept = event.target.value === 'otros';
      customConcept?.classList.toggle('hidden', !showCustomConcept);
      if (customInput) {
        customInput.required = showCustomConcept;
        if (!showCustomConcept) customInput.value = '';
      }
      return;
    }
    if (isHouseEditMode() && /^room_(precio|fecha_precio_desde)_\d+$/.test(event.target.name || '')) {
      const index = event.target.name.match(/^room_precio_(\d+)$/)?.[1];
      const dateInput = index !== undefined
        ? resourceForm.querySelector(`[name="room_fecha_precio_desde_${index}"]`)
        : null;
      if (dateInput && !dateInput.value) {
        showToast('Indica la fecha desde la que se aplica el precio', 'error');
        dateInput.focus();
        dateInput.showPicker?.();
        return;
      }
      return;
    }
    const managedRoomMatch = event.target.name?.match(/^managed_room_(nombre|tipo|numero_camas)_(\d+)$/);
    if (state.activeResource === resources.rooms && managedRoomMatch) {
      saveManagedRoomDetails(Number(managedRoomMatch[2])).catch((error) => showToast(error.message, 'error'));
      return;
    }
    if (isHouseEditMode()) {
      scheduleHouseAutoSave();
      return;
    }
    if (event.target.name !== 'avatar') return;
    const file = event.target.files?.[0];
    if (!file) return;
    openTenantAvatarCropper(file);
  });

  resourceForm?.addEventListener('input', (event) => {
    if (
      (event.target.name === 'precio_habitacion' || event.target.name === 'fecha_precio_desde')
      && state.activePaymentDetailRow
    ) {
      updatePaymentRoomPricePreview();
      return;
    }
    if (event.target.id === 'houseRoomCount') {
      return;
    }
    if (isHouseEditMode() && /^room_(precio|fecha_precio_desde)_\d+$/.test(event.target.name || '')) {
      return;
    }
    if (isHouseEditMode()) {
      scheduleHouseAutoSave();
      return;
    }
    if (event.target.id !== 'tenantAvatarZoom' || !tenantAvatarCrop) return;
    tenantAvatarCrop.zoom = Number(event.target.value) || 1;
    clampTenantAvatarCropOffset();
    updateTenantAvatarCropTransform();
  });

  resourceForm?.addEventListener('focusout', (event) => {
    if (event.target.matches('[data-normalize-case="first-upper"]')) {
      event.target.value = normalizeFirstUpperRestLower(event.target.value);
    }
  });

  resourceForm?.addEventListener('pointerdown', (event) => {
    if (!event.target.closest('[data-avatar-crop-frame]') || !tenantAvatarCrop) return;
    tenantAvatarCrop.dragging = true;
    tenantAvatarCrop.startX = event.clientX;
    tenantAvatarCrop.startY = event.clientY;
    tenantAvatarCrop.startOffsetX = tenantAvatarCrop.offsetX;
    tenantAvatarCrop.startOffsetY = tenantAvatarCrop.offsetY;
    event.target.closest('[data-avatar-crop-frame]').setPointerCapture(event.pointerId);
  });

  resourceForm?.addEventListener('pointermove', (event) => {
    if (!tenantAvatarCrop?.dragging) return;
    tenantAvatarCrop.offsetX = tenantAvatarCrop.startOffsetX + event.clientX - tenantAvatarCrop.startX;
    tenantAvatarCrop.offsetY = tenantAvatarCrop.startOffsetY + event.clientY - tenantAvatarCrop.startY;
    clampTenantAvatarCropOffset();
    updateTenantAvatarCropTransform();
  });

  resourceForm?.addEventListener('pointerup', () => {
    if (tenantAvatarCrop) tenantAvatarCrop.dragging = false;
  });

  detailPanel?.addEventListener('click', (event) => {
    const closeRoomFormButton = event.target.closest('button[data-action="close-room-form"]');
    if (closeRoomFormButton) {
      state.resourceAction = null;
      state.editingId = null;
      state.editingRoomForm = null;
      state.roomFormLocked = false;
      renderHouseDetail();
      renderRoomsSectionActions();
      return;
    }

    const tenantReceiptPaymentRow = event.target.closest('tr[data-action="open-tenant-receipt-payment"]');
    if (tenantReceiptPaymentRow) {
      openTenantReceiptPaymentDetail(tenantReceiptPaymentRow.dataset)
        .catch((error) => showToast(error.message, 'error'));
      return;
    }

    const tenantDetailToggle = event.target.closest('[data-action="toggle-tenant-detail-columns"]');
    if (tenantDetailToggle) {
      const columns = detailPanel.querySelector('[data-tenant-detail-columns]');
      const toggleButton = tenantDetailToggle.matches('button')
        ? tenantDetailToggle
        : tenantDetailToggle.querySelector('button[data-action="toggle-tenant-detail-columns"]');
      const collapsed = columns?.classList.toggle('is-collapsed') || false;
      toggleButton?.classList.toggle('is-collapsed', collapsed);
      toggleButton?.setAttribute('aria-expanded', String(!collapsed));
      toggleButton?.setAttribute(
        'aria-label',
        collapsed ? 'Mostrar datos de ficha' : 'Ocultar datos de ficha'
      );
      return;
    }

    const tenantRoomHistoryToggle = event.target.closest('[data-action="toggle-tenant-room-history"]');
    if (tenantRoomHistoryToggle) {
      const history = detailPanel.querySelector('[data-tenant-room-history]');
      const toggleButton = tenantRoomHistoryToggle.matches('button')
        ? tenantRoomHistoryToggle
        : tenantRoomHistoryToggle.querySelector('button[data-action="toggle-tenant-room-history"]');
      const collapsed = history?.classList.toggle('is-collapsed') || false;
      toggleButton?.classList.toggle('is-collapsed', collapsed);
      toggleButton?.setAttribute('aria-expanded', String(!collapsed));
      toggleButton?.setAttribute(
        'aria-label',
        collapsed ? 'Mostrar cambios de habitación' : 'Ocultar cambios de habitación'
      );
      return;
    }

    const tenantMonthlyDocumentsToggle = event.target.closest('[data-action="toggle-tenant-monthly-documents"]');
    if (tenantMonthlyDocumentsToggle) {
      const documents = detailPanel.querySelector('[data-tenant-monthly-documents]');
      const toggleButton = tenantMonthlyDocumentsToggle.matches('button')
        ? tenantMonthlyDocumentsToggle
        : tenantMonthlyDocumentsToggle.querySelector('button[data-action="toggle-tenant-monthly-documents"]');
      const collapsed = documents?.classList.toggle('is-collapsed') || false;
      toggleButton?.classList.toggle('is-collapsed', collapsed);
      toggleButton?.setAttribute('aria-expanded', String(!collapsed));
      toggleButton?.setAttribute(
        'aria-label',
        collapsed ? 'Mostrar recibos mensuales y gastos' : 'Ocultar recibos mensuales y gastos'
      );
      return;
    }

    const activateHouseButton = event.target.closest('button[data-action="activate-house-detail"]');
    if (activateHouseButton) {
      activateHouseFromDetail(activateHouseButton.dataset.houseId)
        .catch((error) => showToast(error.message || 'No se pudo activar la vivienda', 'error'));
      return;
    }

    const button = event.target.closest('button[data-action="close-detail"]');
    if (button) {
      if (state.activeResource === resources.rooms) return;
      clearDetailPanel();
    }
    const roomButton = event.target.closest('button[data-action="select-house-room"]');
    if (roomButton && state.activeHouseDetail) {
      state.activeHouseDetail.selectedRoomId = roomButton.dataset.roomId;
      state.activeHouseDetail.assigningRoomId = null;
      state.activeHouseDetail.assigningBedIndex = null;
      renderHouseDetail();
      if (state.activeResource === resources.rooms) renderRoomsSectionActions();
      return;
    }
    const bedItem = event.target.closest('[data-action="show-bed-tenant-select"]');
    if (bedItem && state.activeHouseDetail) {
      state.activeHouseDetail.assigningRoomId = bedItem.dataset.roomId;
      state.activeHouseDetail.assigningBedIndex = Number(bedItem.dataset.bedIndex);
      renderHouseDetail();
      return;
    }
    const editTenantButton = event.target.closest('button[data-action="edit-tenant-detail"]');
    if (editTenantButton) {
      editTenantFromDetail(editTenantButton.dataset.id).catch((error) => showToast(error.message, 'error'));
      return;
    }
    const createTenantButton = event.target.closest('button[data-action="create-tenant-detail"]');
    if (createTenantButton) {
      createTenantFromDetail().catch((error) => showToast(error.message || 'No se pudo preparar el inquilino', 'error'));
      return;
    }
    const deleteTenantButton = event.target.closest('button[data-action="delete-tenant-detail"]');
    if (deleteTenantButton) {
      deleteTenantFromDetail(deleteTenantButton.dataset.id).catch((error) => showToast(error.message || 'No se pudo eliminar el inquilino', 'error'));
      return;
    }

    const addHouseOwnerButton = event.target.closest('button[data-action="add-house-owner"]');
    if (addHouseOwnerButton) {
      addHouseOwnerAssignment(addHouseOwnerButton.closest('[data-house-owner-manager]'))
        .catch((error) => showToast(error.message || 'No se pudo asociar el propietario', 'error'));
      return;
    }
    const updateHouseOwnerButton = event.target.closest('button[data-action="update-house-owner"]');
    if (updateHouseOwnerButton) {
      updateHouseOwnerAssignment(
        updateHouseOwnerButton.closest('[data-house-owner-manager]'),
        updateHouseOwnerButton.dataset.ownerHouseId
      ).catch((error) => showToast(error.message || 'No se pudo actualizar el porcentaje', 'error'));
      return;
    }
    const removeHouseOwnerButton = event.target.closest('button[data-action="remove-house-owner"]');
    if (removeHouseOwnerButton) {
      removeHouseOwnerAssignment(
        removeHouseOwnerButton.closest('[data-house-owner-manager]'),
        removeHouseOwnerButton.dataset.ownerHouseId
      ).catch((error) => showToast(error.message || 'No se pudo quitar el propietario', 'error'));
      return;
    }
    const documentButton = event.target.closest('button[data-action]');
    if (documentButton) handleDocumentPreviewAction(documentButton.dataset.action, documentButton.dataset.id);
  });

  resourceForm?.addEventListener('click', (event) => {
    const openDepositPaymentModalButton = event.target.closest('button[data-action="open-deposit-payment-modal"]');
    if (openDepositPaymentModalButton) {
      const root = openDepositPaymentModalButton.closest('.expense-create-form') || resourceForm;
      root.querySelector('[data-deposit-payment-modal]')?.classList.remove('hidden');
      return;
    }

    const closeDepositPaymentModalButton = event.target.closest('[data-action="close-deposit-payment-modal"]');
    if (closeDepositPaymentModalButton) {
      const root = closeDepositPaymentModalButton.closest('.expense-create-form') || resourceForm;
      root.querySelector('[data-deposit-payment-modal]')?.classList.add('hidden');
      return;
    }

    const depositPaymentButton = event.target.closest('button[data-action="select-deposit-payment"]');
    if (depositPaymentButton) {
      const root = depositPaymentButton.closest('.expense-create-form') || resourceForm;
      const paymentSelect = root.querySelector('[name="id_pago_inquilino_movimiento"]');
      const amountInput = root.querySelector('[name="importe_movimiento_fianza"]');
      const pickerButton = root.querySelector('[data-action="open-deposit-payment-modal"]');
      const amount = parseMoneyValue(depositPaymentButton.dataset.paymentAmount || 0);
      if (paymentSelect) paymentSelect.value = depositPaymentButton.dataset.paymentId || '';
      if (amountInput && amount > 0) amountInput.value = amount.toFixed(2);
      if (pickerButton) pickerButton.textContent = `Pago seleccionado: ${depositPaymentButton.dataset.paymentLabel || depositPaymentButton.dataset.paymentId || ''}`;
      root.querySelectorAll('[data-action="select-deposit-payment"]').forEach((button) => {
        button.classList.toggle('active', button === depositPaymentButton);
      });
      root.querySelector('[data-deposit-payment-modal]')?.classList.add('hidden');
      return;
    }

    const depositMovementButton = event.target.closest('button[data-action="apply-deposit-movement"]');
    if (depositMovementButton) {
      applyDepositMovement(depositMovementButton).catch((error) => showToast(error.message, 'error'));
      return;
    }
  });

  detailPanel?.addEventListener('submit', (event) => {
    const roomForm = event.target.closest('[data-room-inline-form]');
    if (!roomForm) return;
    event.preventDefault();
    submitAdminRoomForm(roomForm)
      .catch((error) => showToast(error.message || 'No se pudo guardar la habitación', 'error'));
  });

  detailPanel?.addEventListener('focusout', (event) => {
    if (!event.target.matches('[data-normalize-case="first-upper"]')) return;
    event.target.value = normalizeFirstUpper(event.target.value);
  });

  detailPanel?.addEventListener('change', (event) => {
    const movementType = event.target.closest('[data-deposit-movement-type]');
    if (movementType) {
      const root = movementType.closest('.expense-create-form') || movementType.closest('.tenant-file') || resourceForm || detailPanel;
      const isCompensation = movementType.value === 'compensacion';
      const pickerButton = root.querySelector('[data-action="open-deposit-payment-modal"]');
      root.querySelector('[data-deposit-payment-field]')?.classList.add('hidden');
      pickerButton?.classList.toggle('hidden', !isCompensation);
      root.querySelector('[data-deposit-payment-modal]')?.classList.toggle('hidden', !isCompensation);
      if (!isCompensation) {
        const paymentSelect = root.querySelector('[name="id_pago_inquilino_movimiento"]');
        if (paymentSelect) paymentSelect.value = '';
        if (pickerButton) pickerButton.textContent = 'Seleccionar pago pendiente';
        root.querySelectorAll('[data-action="select-deposit-payment"]').forEach((button) => button.classList.remove('active'));
      }
      return;
    }

    if (event.target.dataset.action !== 'assign-tenant-bed') return;
    assignTenantToRoom(event.target.value, event.target.dataset.roomId)
      .catch((error) => showToast(error.message, 'error'));
  });

  resourceDocumentActions?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    if (button.dataset.action === 'house-resource-action') {
      runResourceMenuAction('houses', button.dataset.resourceAction)
        .catch((error) => showToast(error.message, 'error'));
      return;
    }
    if (button.dataset.action === 'tenant-resource-action') {
      runTenantSectionAction(button.dataset.resourceAction)
        .catch((error) => showToast(error.message || 'No se pudo ejecutar la acción', 'error'));
      return;
    }
    if (button.dataset.action === 'room-resource-action') {
      runRoomsSectionAction(button.dataset.resourceAction)
        .catch((error) => showToast(error.message || 'No se pudo ejecutar la acción', 'error'));
      return;
    }
    if (button.dataset.action === 'close-detail') {
      clearDetailPanel();
      return;
    }
    if (button.dataset.action === 'edit-tenant-detail') {
      editTenantFromDetail(button.dataset.id).catch((error) => showToast(error.message, 'error'));
      return;
    }
    if (button.dataset.action === 'generate-admin-liquidation') {
      loadAdminLiquidationOptions()
        .then(() => renderAdminLiquidationGenerationForm())
        .catch((error) => showToast(error.message || 'No se pudo preparar la liquidación', 'error'));
      return;
    }
    handleDocumentPreviewAction(button.dataset.action, button.dataset.id);
  });

  resourceDocumentActions?.addEventListener('change', async (event) => {
    const houseStatusFilter = event.target.closest('[data-house-status-filter]');
    if (houseStatusFilter && state.activeSection === 'houses' && !isAdminMenuMode()) {
      state.houseStatusFilter = houseStatusFilter.value;
      state.activeHouseRecordId = null;
      try {
        await loadRows();
        renderHouseSectionActions();
      } catch (error) {
        showToast(error.message || 'No se pudieron cargar las viviendas', 'error');
        renderHouseSectionActions();
      }
      return;
    }

    const roomHouseSelector = event.target.closest('[data-room-house-selector]');
    if (roomHouseSelector && state.activeSection === 'rooms') {
      const selectedOption = roomHouseSelector.selectedOptions?.[0];
      state.roomsSelectedHouseId = roomHouseSelector.value;
      state.activeHouseDetail = null;
      state.resourceAction = null;
      state.editingId = null;
      state.editingRoomForm = null;
      state.roomFormLocked = false;
      if (!roomHouseSelector.value) {
        tableWrap?.classList.add('hidden');
        detailPanel?.classList.add('hidden');
        if (detailPanel) detailPanel.innerHTML = '';
        renderRoomsSectionActions();
        return;
      }
      await loadHouseDetail(roomHouseSelector.value, selectedOption?.textContent || 'Vivienda sin nombre');
      renderRoomsSectionActions();
      return;
    }

    if (!isAdminMenuMode()) return;
    const userFilter = event.target.closest('[data-admin-user-filter]');
    if (state.activeSection === 'users' && userFilter) {
      state.adminUserFilters[userFilter.dataset.adminUserFilter] = userFilter.value;
      fetchAdminUsers().catch((error) => showToast(error.message || 'No se pudieron cargar los usuarios', 'error'));
      return;
    }
    const tenantFilter = event.target.closest('[data-admin-tenant-filter]');
    if (state.activeSection === 'tenants' && tenantFilter) {
      const key = tenantFilter.dataset.adminTenantFilter;
      state.adminTenantFilters[key] = tenantFilter.value;
      if (key === 'id_vivienda') state.adminTenantFilters.id_habitacion = '';
      renderAdminTenantFilters();
      fetchAdminTenants().catch((error) => showToast(error.message || 'No se pudieron cargar los inquilinos', 'error'));
      return;
    }
    const ownerFilter = event.target.closest('[data-admin-owner-filter]');
    if (state.activeSection === 'owners' && ownerFilter) {
      state.adminOwnerFilters[ownerFilter.dataset.adminOwnerFilter] = ownerFilter.value;
      fetchAdminOwners().catch((error) => showToast(error.message || 'No se pudieron cargar los propietarios', 'error'));
      return;
    }
    const houseFilter = event.target.closest('[data-admin-house-filter]');
    if (state.activeSection === 'houses' && houseFilter) {
      state.adminHouseFilters[houseFilter.dataset.adminHouseFilter] = houseFilter.value;
      fetchAdminHouses().catch((error) => showToast(error.message || 'No se pudieron cargar las viviendas', 'error'));
      return;
    }
    const roomFilter = event.target.closest('[data-admin-room-filter]');
    if (state.activeSection === 'rooms' && roomFilter) {
      state.adminRoomFilters[roomFilter.dataset.adminRoomFilter] = roomFilter.value;
      fetchAdminRooms().catch((error) => showToast(error.message || 'No se pudieron cargar las habitaciones', 'error'));
      return;
    }
    const paymentFilter = event.target.closest('[data-admin-payment-filter]');
    if (state.activeSection === 'payments' && paymentFilter) {
      const key = paymentFilter.dataset.adminPaymentFilter;
      state.adminPaymentFilters[key] = key === 'includeFuture' ? Boolean(paymentFilter.checked) : paymentFilter.value;
      fetchAdminPayments().catch((error) => showToast(error.message || 'No se pudieron cargar los pagos', 'error'));
      return;
    }
    const expenseFilter = event.target.closest('[data-admin-expense-filter]');
    if (state.activeSection === 'expenses' && expenseFilter) {
      state.adminExpenseFilters[expenseFilter.dataset.adminExpenseFilter] = expenseFilter.value;
      fetchAdminExpenses().catch((error) => showToast(error.message || 'No se pudieron cargar los gastos', 'error'));
      return;
    }
    const liquidationFilter = event.target.closest('[data-admin-liquidation-filter]');
    if (state.activeSection === 'liquidations' && liquidationFilter) {
      state.adminLiquidationFilters[liquidationFilter.dataset.adminLiquidationFilter] = liquidationFilter.value;
      fetchAdminLiquidations().catch((error) => showToast(error.message || 'No se pudieron cargar las liquidaciones', 'error'));
    }
  });

  resourceDocumentActions?.addEventListener('input', (event) => {
    if (!isAdminMenuMode() || !['users', 'owners', 'houses', 'rooms', 'tenants', 'payments', 'expenses'].includes(state.activeSection)) return;
    const userFilter = event.target.closest('[data-admin-user-filter]');
    if (state.activeSection === 'users' && userFilter) {
      state.adminUserFilters[userFilter.dataset.adminUserFilter] = userFilter.value;
      fetchAdminUsers().catch((error) => showToast(error.message || 'No se pudieron cargar los usuarios', 'error'));
      return;
    }
    const ownerFilter = event.target.closest('[data-admin-owner-filter]');
    if (state.activeSection === 'owners' && ownerFilter) {
      state.adminOwnerFilters[ownerFilter.dataset.adminOwnerFilter] = ownerFilter.value;
      fetchAdminOwners().catch((error) => showToast(error.message || 'No se pudieron cargar los propietarios', 'error'));
      return;
    }
    const houseFilter = event.target.closest('[data-admin-house-filter]');
    if (state.activeSection === 'houses' && houseFilter) {
      state.adminHouseFilters[houseFilter.dataset.adminHouseFilter] = houseFilter.value;
      fetchAdminHouses().catch((error) => showToast(error.message || 'No se pudieron cargar las viviendas', 'error'));
      return;
    }
    const roomFilter = event.target.closest('[data-admin-room-filter]');
    if (state.activeSection === 'rooms' && roomFilter) {
      state.adminRoomFilters[roomFilter.dataset.adminRoomFilter] = roomFilter.value;
      fetchAdminRooms().catch((error) => showToast(error.message || 'No se pudieron cargar las habitaciones', 'error'));
      return;
    }
    const tenantFilter = event.target.closest('[data-admin-tenant-filter]');
    if (state.activeSection === 'tenants' && tenantFilter) {
      state.adminTenantFilters[tenantFilter.dataset.adminTenantFilter] = tenantFilter.value;
      fetchAdminTenants().catch((error) => showToast(error.message || 'No se pudieron cargar los inquilinos', 'error'));
      return;
    }
    const paymentFilter = event.target.closest('[data-admin-payment-filter]');
    if (state.activeSection === 'payments' && paymentFilter) {
      state.adminPaymentFilters[paymentFilter.dataset.adminPaymentFilter] = paymentFilter.value;
      fetchAdminPayments().catch((error) => showToast(error.message || 'No se pudieron cargar los pagos', 'error'));
      return;
    }
    const expenseFilter = event.target.closest('[data-admin-expense-filter]');
    if (state.activeSection === 'expenses' && expenseFilter) {
      state.adminExpenseFilters[expenseFilter.dataset.adminExpenseFilter] = expenseFilter.value;
      fetchAdminExpenses().catch((error) => showToast(error.message || 'No se pudieron cargar los gastos', 'error'));
      return;
    }
    const liquidationFilter = event.target.closest('[data-admin-liquidation-filter]');
    if (state.activeSection === 'liquidations' && liquidationFilter) {
      state.adminLiquidationFilters[liquidationFilter.dataset.adminLiquidationFilter] = liquidationFilter.value;
      fetchAdminLiquidations().catch((error) => showToast(error.message || 'No se pudieron cargar las liquidaciones', 'error'));
    }
  });

  tableBody?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      const houseEditRow = event.target.closest('tr[data-action="edit-house"]');
      if (houseEditRow) {
        editRow(houseEditRow.dataset.id).catch((error) => showToast(error.message, 'error'));
        return;
      }
      const houseDetailRow = event.target.closest('tr[data-action="open-house-detail"]');
      if (houseDetailRow) {
        openHouseDetail(houseDetailRow.dataset.id).catch((error) => showToast(error.message || 'No se pudo cargar la vivienda', 'error'));
        return;
      }
      const liquidationRow = event.target.closest('tr[data-action="open-liquidation-detail"]');
      if (liquidationRow) openLiquidationDetail(liquidationRow).catch((error) => showToast(error.message, 'error'));
      const tenantRow = event.target.closest('tr[data-action="select-tenant"]');
      if (tenantRow) {
        openTenantDetail(tenantRow).catch((error) => showToast(error.message || 'No se pudo cargar el inquilino', 'error'));
        return;
      }
      const expenseRow = event.target.closest('tr[data-action="open-expense-detail"]');
      if (expenseRow) openExpenseDetail(expenseRow.dataset.id, expenseRow.dataset.endpoint);
      const depositRow = event.target.closest('tr[data-action="open-deposit-detail"]');
      if (depositRow) openDepositDetail(depositRow.dataset.id).catch((error) => showToast(error.message, 'error'));
      const paymentRow = event.target.closest('tr[data-action="open-payment-detail"]');
      if (paymentRow) openPaymentDetail(paymentRow.dataset.paymentKey);
      return;
    }
    if (button.dataset.action === 'view-admin-user') {
      openAdminUserDetail(button.dataset.id).catch((error) => showToast(error.message || 'No se pudo cargar el usuario', 'error'));
      return;
    }
    if (button.dataset.action === 'toggle-admin-user-active') {
      toggleAdminUserActive(button.dataset.id, button.dataset.active).catch((error) => showToast(error.message || 'No se pudo actualizar el usuario', 'error'));
      return;
    }
    if (button.dataset.action === 'view-admin-tenant') {
      openAdminTenantDetail(button.dataset.id).catch((error) => showToast(error.message || 'No se pudo cargar el inquilino', 'error'));
      return;
    }
    if (button.dataset.action === 'toggle-admin-tenant-active') {
      toggleAdminTenantActive(button.dataset.id, button.dataset.active).catch((error) => showToast(error.message || 'No se pudo actualizar el inquilino', 'error'));
      return;
    }
    if (button.dataset.action === 'view-admin-owner') {
      openAdminOwnerDetail(button.dataset.id).catch((error) => showToast(error.message || 'No se pudo cargar el propietario', 'error'));
      return;
    }
    if (button.dataset.action === 'toggle-admin-owner-active') {
      toggleAdminOwnerActive(button.dataset.id, button.dataset.active).catch((error) => showToast(error.message || 'No se pudo actualizar el propietario', 'error'));
      return;
    }
    if (button.dataset.action === 'view-admin-house') {
      openAdminHouseDetail(button.dataset.id).catch((error) => showToast(error.message || 'No se pudo cargar la vivienda', 'error'));
      return;
    }
    if (button.dataset.action === 'toggle-admin-house-active') {
      toggleAdminHouseActive(button.dataset.id, button.dataset.active).catch((error) => showToast(error.message || 'No se pudo actualizar la vivienda', 'error'));
      return;
    }
    if (button.dataset.action === 'view-admin-room') {
      openAdminRoomDetail(button.dataset.id).catch((error) => showToast(error.message || 'No se pudo cargar la habitación', 'error'));
      return;
    }
    if (button.dataset.action === 'toggle-admin-room-active') {
      toggleAdminRoomActive(button.dataset.id, button.dataset.active).catch((error) => showToast(error.message || 'No se pudo actualizar la habitación', 'error'));
      return;
    }
    if (button.dataset.action === 'view-admin-payment') {
      openAdminPaymentDetail(button.dataset.id).catch((error) => showToast(error.message || 'No se pudo cargar el pago', 'error'));
      return;
    }
    if (button.dataset.action === 'cancel-admin-payment') {
      cancelAdminPayment(button.dataset.id).catch((error) => showToast(error.message || 'No se pudo anular el pago', 'error'));
      return;
    }
    if (button.dataset.action === 'view-admin-expense') {
      openAdminExpenseDetail(button.dataset.id).catch((error) => showToast(error.message || 'No se pudo cargar el gasto', 'error'));
      return;
    }
    if (button.dataset.action === 'cancel-admin-expense') {
      cancelAdminExpense(button.dataset.id).catch((error) => showToast(error.message || 'No se pudo anular el gasto', 'error'));
      return;
    }
    if (button.dataset.action === 'view-admin-liquidation') {
      openAdminLiquidationDetail(button.dataset.id).catch((error) => showToast(error.message || 'No se pudo cargar la liquidación', 'error'));
      return;
    }
    if (button.dataset.action === 'toggle-admin-liquidation-state') {
      toggleAdminLiquidationState(button.dataset.id, button.dataset.state).catch((error) => showToast(error.message || 'No se pudo actualizar la liquidación', 'error'));
      return;
    }
    if (button.dataset.action === 'edit') editRow(button.dataset.id).catch((error) => showToast(error.message, 'error'));
    if (button.dataset.action === 'delete') deleteRow(button.dataset.id).catch((error) => showToast(error.message, 'error'));
    handleDocumentPreviewAction(button.dataset.action, button.dataset.id);
  });

  searchInput?.addEventListener('input', () => {
    clearDetailPanel();
    if (isAdminMenuMode() && state.activeSection === 'users') {
      renderAdminUsersTable();
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'owners') {
      renderAdminOwnersTable(state.adminOwnerHouseRows);
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'tenants') {
      renderAdminTenantsTable();
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'houses') {
      renderAdminHousesTable(state.adminHouseOwnerRows, state.adminHouseRoomRows);
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'rooms') {
      renderAdminRoomsTable(state.adminRoomTenantRows);
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'payments') {
      renderAdminPaymentsTable();
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'expenses') {
      renderAdminExpensesTable();
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'liquidations') {
      renderAdminLiquidationsTable();
      return;
    }
    renderTable();
  });
  monthFilter?.addEventListener('change', () => {
    state.liquidationMonthFilter = monthFilter.value;
    renderTable();
  });
  expenseApplyFilter?.addEventListener('click', () => {
    state.expenseTypeFilter = expenseTypeFilter?.value || '';
    state.paymentStatusFilter = paymentStatusFilter?.value || (isPaymentResource(state.activeResource) ? 'pendientes' : '');
    state.expenseHouseFilter = expenseHouseFilter?.value || '';
    state.expenseStartDateFilter = expenseStartDateFilter?.value || '';
    state.expenseEndDateFilter = expenseEndDateFilter?.value || '';
    clearDetailPanel();
    renderTable();
  });
  paymentStatusFilter?.addEventListener('change', () => {
    state.paymentStatusFilter = paymentStatusFilter.value || 'pendientes';
    clearDetailPanel();
    renderTable();
  });
  accountingPeriodFilter?.addEventListener('click', (event) => {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) return;

    if (actionButton.dataset.action === 'toggle-accounting-calendar') {
      const calendar = accountingPeriodFilter.querySelector('[data-accounting-calendar]');
      const hidden = calendar?.classList.toggle('hidden');
      actionButton.setAttribute('aria-expanded', hidden ? 'false' : 'true');
      return;
    }

    if (actionButton.dataset.action === 'change-accounting-month') {
      updateAccountingCalendar(actionButton.dataset.month);
      return;
    }

    if (actionButton.dataset.action === 'select-accounting-date') {
      const { start, end } = getAccountingCalendarState();
      const selectedDate = actionButton.dataset.date;
      const selected = parseInputDate(selectedDate);
      const currentStart = parseInputDate(start);
      const currentEnd = parseInputDate(end);
      if (!currentStart || !currentEnd || start !== end || selected < currentStart) {
        updateAccountingPeriod(selectedDate, selectedDate);
      } else {
        updateAccountingPeriod(start, selectedDate);
        const calendar = accountingPeriodFilter.querySelector('[data-accounting-calendar]');
        const trigger = accountingPeriodFilter.querySelector('[data-action="toggle-accounting-calendar"]');
        calendar?.classList.add('hidden');
        trigger?.setAttribute('aria-expanded', 'false');
      }
    }
  });
  tenantSortFilter?.addEventListener('change', () => {
    state.tenantSortFilter = tenantSortFilter.value;
    clearDetailPanel();
    renderTable();
  });
  $('#newButton')?.addEventListener('click', () => {
    state.editingId = null;
    state.resourceAction = 'create';
    if (isAdminMenuMode() && state.activeSection === 'users') {
      resourceForm?.classList.remove('hidden');
      tableWrap?.classList.remove('hidden');
      splitLayout?.classList.add('table-full-width');
      detailPanel?.classList.add('hidden');
      renderForm();
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'tenants') {
      openAdminTenantForm().catch((error) => showToast(error.message || 'No se pudo preparar el inquilino', 'error'));
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'owners') {
      openAdminOwnerForm().catch((error) => showToast(error.message || 'No se pudo preparar el propietario', 'error'));
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'houses') {
      openAdminHouseForm().catch((error) => showToast(error.message || 'No se pudo preparar la vivienda', 'error'));
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'rooms') {
      openAdminRoomForm().catch((error) => showToast(error.message || 'No se pudo preparar la habitación', 'error'));
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'payments') {
      openAdminPaymentForm().catch((error) => showToast(error.message || 'No se pudo preparar el pago', 'error'));
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'expenses') {
      openAdminExpenseForm().catch((error) => showToast(error.message || 'No se pudo preparar el gasto', 'error'));
      return;
    }
    if (isAdminMenuMode() && state.activeSection === 'liquidations') {
      openAdminLiquidationForm().catch((error) => showToast(error.message || 'No se pudo preparar la liquidación', 'error'));
      return;
    }
    if (state.activeSection === 'rooms') {
      openAdminRoomForm().catch((error) => showToast(error.message || 'No se pudo preparar la habitación', 'error'));
      return;
    }
    updateNavigation();
    renderForm();
  });
}

bindEvents();
renderAuth();
checkHealth();
if (state.token) {
  loadSection('dashboard').catch((error) => {
    showToast(error.message, 'error');
    clearSession();
    renderAuth();
  });
}

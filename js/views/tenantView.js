const tenantDetailLabels = {
  nombre: 'Nombre',
  apellido1: 'Primer apellido',
  apellido2: 'Segundo apellido',
  email: 'Email',
  telefono: 'Teléfono',
  nacionalidad: 'Nacionalidad',
  documento_identificacion: 'Identificación',
  fecha_entrada: 'Fecha entrada',
  fecha_salida: 'Fecha salida',
  id_habitacion: 'Habitación',
  apellidos: 'Apellidos',
  nombre_habitacion: 'Habitación',
  tipo_habitacion: 'Tipo habitación',
  precio: 'Precio',
  id_vivienda: 'Vivienda',
  nombre_vivienda: 'Vivienda',
  direccion: 'Dirección',
  localidad: 'Localidad',
  ciudad: 'Ciudad',
  codigo_postal: 'Código postal',
  created_at: 'Creado',
  updated_at: 'Actualizado',
  comentario: 'Comentario',
};

const hiddenTenantDetailFields = new Set([
  'id_inquilino',
  'id_usuario',
  'contrato_firmado_archivo',
  'documento_archivo',
  'numero_documento',
  'id_habitacion_inquilino',
  'id_vivienda',
  'id_habitacion',
  'avatar_archivo',
  'activo',
  'identificacion',
  'has_password',
  'precio',
  'precios_habitacion',
]);

const tenantPersonalFields = [
  'nombre',
  'apellidos',
  'email',
  'telefono',
  'nacionalidad',
  'documento_identificacion',
  'comentario',
];

const tenantHousingFields = [
  'nombre_vivienda',
  'direccion',
  'localidad',
  'ciudad',
  'codigo_postal',
  'nombre_habitacion',
  'tipo_habitacion',
  'fecha_entrada',
  'fecha_salida',
  'created_at',
  'updated_at',
];

const tenantDocumentStatusLabels = {
  pagado: 'Pagado',
  pendiente: 'No pagado',
  no_pagado: 'No pagado',
  nopagado: 'No pagado',
  fraccionado: 'Fraccionado',
  parcial: 'Fraccionado',
  cancelado: 'Cancelado',
};

const spanishMonthNames = [
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

function renderTenantDetailField([key, value]) {
  const label = tenantDetailLabels[key] || key;
  const formattedValue = formatDisplayValue(key, value);
  const displayValue = formattedValue === null || formattedValue === undefined || formattedValue === '' ? '—' : formattedValue;
  return `<div class="tenant-detail-row">
    <dt>${escapeHtml(label)}</dt>
    <dd>${escapeHtml(displayValue)}</dd>
  </div>`;
}

function normalizeTenantDocumentStatus(row) {
  const rawStatus = String(row.estado || row.status || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (rawStatus && tenantDocumentStatusLabels[rawStatus]) return rawStatus;

  const paid = Number(row.importe_pagado || row.pagado || 0);
  const total = getTenantDocumentNumericAmount(row);
  if (paid > 0 && total > 0 && paid < total) return 'fraccionado';
  if (row.fecha_pago || paid >= total && total > 0) return 'pagado';
  return 'pendiente';
}

function renderTenantDocumentStatus(row) {
  const status = normalizeTenantDocumentStatus(row);
  const label = tenantDocumentStatusLabels[status] || status || 'No pagado';
  return `<span class="tenant-document-status ${escapeHtml(status)}">${escapeHtml(label)}</span>`;
}

function getTenantDocumentNumericAmount(row) {
  const value = [
    row.importe_asignado,
    row.importe_total,
    row.importe,
    row.total,
    row.precio,
  ].find((item) => item !== undefined && item !== null && item !== '');
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function getTenantDocumentMonth(row) {
  const month = row.mes || row.month;
  const year = row.anio || row.year;
  if (month && year) return `${month}/${year}`;
  if (row.fecha || row.fecha_inicio || row.fecha_pago) return formatDisplayValue('fecha', row.fecha || row.fecha_inicio || row.fecha_pago);
  return '—';
}

function getTenantDocumentConcept(row) {
  return row.concepto || row.tipo || row.descripcion || '—';
}

function getTenantDocumentAmount(row) {
  return formatMoney(getTenantDocumentNumericAmount(row));
}

function parseTenantDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const text = String(value).trim();
  if (text.includes('T')) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const displayMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (displayMatch) return new Date(Number(displayMatch[3]), Number(displayMatch[2]) - 1, Number(displayMatch[1]));

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTenantMonthKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function getTenantRowMonthKey(row) {
  const month = Number(row.mes || row.month);
  const year = Number(row.anio || row.year);
  if (month && year) return getTenantMonthKey(year, month);

  const date = parseTenantDate(row.fecha || row.fecha_inicio || row.fecha_pago || row.created_at);
  return date ? getTenantMonthKey(date.getFullYear(), date.getMonth() + 1) : '';
}

function getTenantMonthLabel(month) {
  return `${spanishMonthNames[month.month - 1]} ${month.year}`;
}

function getTenantRowReferenceDate(row, useMonthEnd = false) {
  const month = Number(row.mes || row.month);
  const year = Number(row.anio || row.year);
  if (month && year) {
    return useMonthEnd
      ? new Date(year, month, 0)
      : new Date(year, month - 1, 1);
  }

  return parseTenantDate(
    row.fecha || row.fecha_inicio || row.fecha_pago || row.fecha_fin || row.created_at
  );
}

function getTenantCompletedMonths(tenant, payments, expenses) {
  const fallbackRows = payments.concat(expenses);
  if (!fallbackRows.length) return [];

  const firstRowDate = fallbackRows
    .map((row) => getTenantRowReferenceDate(row))
    .filter(Boolean)
    .sort((left, right) => left - right)[0];
  const lastRowDate = fallbackRows
    .map((row) => getTenantRowReferenceDate(row, true))
    .filter(Boolean)
    .sort((left, right) => right - left)[0];
  const start = firstRowDate;
  const end = lastRowDate || firstRowDate;
  const months = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    months.push({
      year,
      month,
      key: getTenantMonthKey(year, month),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

function getRowsForTenantMonth(rows, month) {
  return rows.filter((row) => {
    const start = parseTenantDate(row.fecha_inicio);
    const end = parseTenantDate(row.fecha_fin) || start;
    if (start) {
      const monthStart = new Date(month.year, month.month - 1, 1);
      const monthEnd = new Date(month.year, month.month, 0);
      return start <= monthEnd && end >= monthStart;
    }

    const rowMonthKey = getTenantRowMonthKey(row);
    if (rowMonthKey) return rowMonthKey === month.key;
    return false;
  });
}

function addTenantDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getTenantMonthRangeForReceipt(month) {
  return {
    start: new Date(month.year, month.month - 1, 1),
    end: new Date(month.year, month.month, 0),
  };
}

function getTenantInclusiveDayCount(startDate, endDate) {
  if (!startDate || !endDate || endDate < startDate) return 0;
  return Math.floor((endDate - startDate) / 86400000) + 1;
}

function tenantOccupiesReceiptDay(tenant, day, fallbackEnd) {
  const start = parseTenantDate(tenant.fecha_entrada) || parseTenantDate(tenant.created_at);
  const end = parseTenantDate(tenant.fecha_salida) || fallbackEnd;
  return Boolean(start && end && day >= start && day <= end);
}

function parseTenantRoomPriceHistory(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getTenantRoomPriceForDay(tenants = [], day, fallbackPrice = 0) {
  const history = tenants
    .flatMap((tenant) => parseTenantRoomPriceHistory(tenant.precios_habitacion))
    .map((price) => ({
      precio: Number(price.precio || 0),
      start: parseTenantDate(price.fecha_inicio),
      end: parseTenantDate(price.fecha_fin),
    }))
    .filter((price) => price.precio > 0 && price.start)
    .sort((left, right) => left.start - right.start);

  const segment = history.find((price) => (
    day >= price.start
    && (!price.end || day <= price.end)
  ));

  return segment?.precio || Number(fallbackPrice || 0);
}

function getTenantReceiptRoomMates(tenant, allTenants = []) {
  const roomId = String(tenant.id_habitacion || '');
  const tenants = allTenants
    .filter((row) => String(row.id_habitacion || '') === roomId)
    .filter((row) => row.id_inquilino);
  const hasCurrentTenant = tenants.some((row) => String(row.id_inquilino) === String(tenant.id_inquilino));
  return hasCurrentTenant ? tenants : tenants.concat(tenant);
}

function calculateTenantMonthlyReceipt(tenant, month, allTenants = []) {
  const fallbackRoomPrice = Number(tenant.precio || 0);
  const monthRange = getTenantMonthRangeForReceipt(month);
  const monthDays = getTenantInclusiveDayCount(monthRange.start, monthRange.end);
  const roomTenants = getTenantReceiptRoomMates(tenant, allTenants);
  let amount = 0;
  let days = 0;
  let sharedDays = 0;

  if (!monthDays || fallbackRoomPrice <= 0) {
    return { amount: 0, days: 0, sharedDays: 0, monthDays };
  }

  for (let day = new Date(monthRange.start); day <= monthRange.end; day = addTenantDays(day, 1)) {
    const occupants = roomTenants.filter((row) => tenantOccupiesReceiptDay(row, day, monthRange.end));
    const currentTenantOccupies = occupants.some((row) => String(row.id_inquilino) === String(tenant.id_inquilino));
    if (!currentTenantOccupies || !occupants.length) continue;

    const roomPrice = getTenantRoomPriceForDay(roomTenants, day, fallbackRoomPrice);
    const dailyRoomPrice = roomPrice / monthDays;
    amount += dailyRoomPrice / occupants.length;
    days += 1;
    if (occupants.length > 1) sharedDays += 1;
  }

  if (days >= monthDays && sharedDays === 0) {
    amount = Array.from({ length: monthDays }, (_, index) => addTenantDays(monthRange.start, index))
      .reduce((total, day) => total + (getTenantRoomPriceForDay(roomTenants, day, fallbackRoomPrice) / monthDays), 0);
  }

  return { amount, days, sharedDays, monthDays };
}

function getTenantMonthlyPaymentStatus(paymentRows) {
  if (!paymentRows.length) return 'pendiente';

  const statuses = paymentRows.map(normalizeTenantDocumentStatus);
  if (statuses.includes('fraccionado') || statuses.includes('parcial')) return 'fraccionado';
  if (statuses.every((status) => status === 'pagado')) return 'pagado';
  if (statuses.some((status) => status === 'pagado')) return 'fraccionado';
  return 'pendiente';
}

function buildTenantMonthlyBreakdown(tenant, rentPayments, expenseRows, allTenants = []) {
  return getTenantCompletedMonths(tenant, rentPayments, expenseRows).map((month) => {
    const monthPayments = getRowsForTenantMonth(rentPayments, month);
    const monthExpenses = getRowsForTenantMonth(expenseRows, month);
    const assignedPaymentAmount = monthPayments.reduce((total, row) => total + getTenantDocumentNumericAmount(row), 0);
    const paymentDays = monthPayments.reduce((total, row) => total + Number(row.dias_ocupacion || 0), 0);
    const paidAmount = monthPayments.reduce((total, row) => total + getTenantDocumentPaidAmount(row), 0);
    const rentReceiptRows = monthPayments.map((row) => ({ ...row, receiptType: 'Mensualidad' }));
    const receipts = rentReceiptRows
      .concat(getTenantExpenseReceiptRows(monthExpenses).map((row) => ({ ...row, receiptType: 'Gasto' })))
      .sort((left, right) => {
        const dateDiff = getTenantReceiptSortTime(left) - getTenantReceiptSortTime(right);
        if (dateDiff !== 0) return dateDiff;
        return Number(left.id_pago_inquilino || left.id_gasto || 0) - Number(right.id_pago_inquilino || right.id_gasto || 0);
      });

    return {
      ...month,
      label: getTenantMonthLabel(month),
      payment: {
        concepto: monthPayments.map(getTenantDocumentConcept).filter(Boolean).join(', '),
        importe: formatMoney(assignedPaymentAmount),
        pagado: formatMoney(paidAmount),
        estado: getTenantMonthlyPaymentStatus(monthPayments),
        dias: paymentDays,
        dias_mes: 0,
        dias_compartidos: 0,
      },
      expenses: monthExpenses,
      receipts,
    };
  });
}

function filterTenantDocumentRows(rows, tenantId) {
  const rowsWithTenantId = rows.filter((row) => row.id_inquilino !== undefined && row.id_inquilino !== null);
  if (rowsWithTenantId.length) {
    return rowsWithTenantId.filter((row) => String(row.id_inquilino) === String(tenantId));
  }

  return getCurrentRole() === 'inquilino' ? rows : [];
}

function summarizeTenantDocumentAmounts(rows) {
  const summary = rows.reduce((totals, row) => {
    const status = normalizeTenantDocumentStatus(row);
    totals[status] = (totals[status] || 0) + getTenantDocumentNumericAmount(row);
    return totals;
  }, {});

  return ['pagado', 'pendiente', 'fraccionado'].map((status) => ({
    status,
    label: tenantDocumentStatusLabels[status],
    amount: formatMoney(summary[status] || 0),
  }));
}

function renderTenantExpenseRows(rows) {
  if (!rows.length) return '<p class="empty-detail">No hay registros.</p>';

  return `<div class="tenant-document-expenses">
    ${rows.map((row) => `<div class="tenant-document-row">
      <strong>${escapeHtml(getTenantDocumentConcept(row))}</strong>
      <span>${escapeHtml(getTenantDocumentAmount(row))} €</span>
      ${renderTenantDocumentStatus(row)}
    </div>`).join('')}
  </div>`;
}

function renderTenantDocumentSummary(rows) {
  return `<div class="tenant-document-summary">
    ${summarizeTenantDocumentAmounts(rows).map((item) => `<span>
      ${escapeHtml(item.label)}
      <strong>${escapeHtml(item.amount)} €</strong>
    </span>`).join('')}
  </div>`;
}

function renderTenantMonthlyPaymentSummary(months) {
  const rows = months.map((month) => ({
    estado: month.payment.estado,
    importe: month.payment.importe,
  }));
  return renderTenantDocumentSummary(rows);
}

function getTenantDocumentPaidAmount(row) {
  const paid = Number(row.importe_pagado || row.pagado || 0);
  if (Number.isFinite(paid) && paid > 0) return paid;
  return normalizeTenantDocumentStatus(row) === 'pagado' ? getTenantDocumentNumericAmount(row) : 0;
}

function getTenantMonthlyAmounts(month) {
  const rentAmount = Number(month.payment.importe || 0);
  const expenseAmount = month.expenses.reduce((total, row) => total + getTenantDocumentNumericAmount(row), 0);
  const rows = [{
    estado: month.payment.estado,
    importe_asignado: rentAmount,
    importe_pagado: month.payment.pagado,
  }].concat(month.expenses);

  const paid = rows.reduce((total, row) => total + getTenantDocumentPaidAmount(row), 0);
  const pending = rows
    .filter((row) => ['pendiente', 'fraccionado', 'parcial'].includes(normalizeTenantDocumentStatus(row)))
    .reduce((total, row) => total + getTenantDocumentNumericAmount(row), 0);
  const total = rentAmount + expenseAmount;

  return {
    rentAmount,
    expenseAmount,
    paid,
    unpaid: Math.max(total - paid, 0),
    pending,
    total,
  };
}

function renderTenantMonthlyBreakdown(months) {
  if (!months.length) return '<p class="empty-detail">No hay meses cumplidos.</p>';

  return `<div class="tenant-monthly-table-wrap">
    ${months.map((month) => {
      const amounts = getTenantMonthlyAmounts(month);
      return `<details class="tenant-monthly-detail">
        <summary>
          <strong>${escapeHtml(month.label)}</strong>
          <span>Recibos: ${escapeHtml(formatMoney(amounts.rentAmount))} €</span>
          <span>Gastos: ${escapeHtml(formatMoney(amounts.expenseAmount))} €</span>
	          <span>Pagado: ${escapeHtml(formatMoney(amounts.paid))} €</span>
	          <span>No pagado: ${escapeHtml(formatMoney(amounts.unpaid))} €</span>
	          <span>Pendiente: ${escapeHtml(formatMoney(amounts.pending))} €</span>
	          <span>Total: ${escapeHtml(formatMoney(amounts.total))} €</span>
        </summary>
        ${renderTenantReceiptRows(month.receipts)}
      </details>`;
    }).join('')}
  </div>`;
}

function getTenantReceiptPeriod(row) {
  const month = Number(row.mes || row.month);
  const year = Number(row.anio || row.year);
  if (month && year) return `${String(month).padStart(2, '0')}/${year}`;
  return formatDisplayValue('fecha', row.fecha_recibo || row.fecha || row.fecha_inicio || row.fecha_pago) || '—';
}

function getTenantReceiptSortTime(row) {
  const month = Number(row.mes || row.month);
  const year = Number(row.anio || row.year);
  if (month && year) return new Date(year, month - 1, 1).getTime();
  return parseTenantDate(row.fecha_recibo || row.fecha || row.fecha_inicio || row.fecha_pago || row.created_at)?.getTime() || 0;
}

function getTenantReceiptPaidAmount(row) {
  const paid = Number(row.importe_pagado || row.pagado || 0);
  return Number.isFinite(paid) ? paid : 0;
}

function getTenantReceiptPendingAmount(row) {
  return Math.max(getTenantDocumentNumericAmount(row) - getTenantReceiptPaidAmount(row), 0);
}

function getTenantExpenseReceiptRows(rows = []) {
  const grouped = new Map();
  const receipts = [];

  rows.forEach((row) => {
    const expenseKey = row.id_gasto || row.expense_id;
    if (!expenseKey) {
      receipts.push(row);
      return;
    }

    const key = String(expenseKey);
    const current = grouped.get(key);
    const amount = getTenantDocumentNumericAmount(row);
    const paid = getTenantReceiptPaidAmount(row);

    if (!current) {
      grouped.set(key, {
        ...row,
        importe_asignado: amount,
        importe_pagado: paid,
      });
      return;
    }

    current.importe_asignado = Math.max(getTenantDocumentNumericAmount(current), amount);
    current.importe_pagado = getTenantReceiptPaidAmount(current) + paid;
    current.estado = getTenantReceiptPaidAmount(current) + 0.009 >= getTenantDocumentNumericAmount(current)
      ? 'pagado'
      : 'parcial';
    current.fecha_pago = current.fecha_pago || row.fecha_pago;
  });

  return receipts.concat(Array.from(grouped.values()));
}

function getTenantReceiptPaymentKey(row = {}) {
  if (row.payment_key) return row.payment_key;
  const month = Number(row.mes || row.month);
  const year = Number(row.anio || row.year);
  const monthKey = month && year ? `${year}-${String(month).padStart(2, '0')}` : '';
  if (row.receiptType === 'Mensualidad') {
    if (row.id_habitacion_inquilino && row.id_inquilino && monthKey) {
      return `rent-${row.id_habitacion_inquilino}-${row.id_inquilino}-${monthKey}`;
    }
    if (row.id_pago_inquilino) return `rent-payment-${row.id_pago_inquilino}`;
    if (row.id_inquilino && monthKey) return `rent-payment-${row.id_inquilino}-${row.id_habitacion_inquilino || ''}-${monthKey}`;
    return '';
  }
  if (row.receiptType !== 'Gasto') return '';
  const expenseId = row.expense_id || row.id_gasto;
  const tenantId = row.id_inquilino;
  return expenseId && tenantId ? `expense-${expenseId}-${tenantId}` : '';
}

function getTenantReceiptPaymentAttributes(row = {}) {
  const paymentKey = getTenantReceiptPaymentKey(row);
  const month = row.mes || row.month || '';
  const year = row.anio || row.year || '';
  const attributes = [
    ['data-action', 'open-tenant-receipt-payment'],
    ['data-payment-key', paymentKey],
    ['data-payment-id', row.id_pago_inquilino || ''],
    ['data-expense-id', row.expense_id || row.id_gasto || ''],
    ['data-tenant-id', row.id_inquilino || ''],
    ['data-room-assignment-id', row.id_habitacion_inquilino || ''],
    ['data-month', month],
    ['data-year', year],
    ['data-receipt-type', row.receiptType || ''],
    ['data-concept', getTenantDocumentConcept(row)],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');

  return attributes.length > 1
    ? ` class="clickable-row" ${attributes.map(([key, value]) => `${key}="${escapeHtml(value)}"`).join(' ')}`
    : '';
}

function renderTenantReceiptRows(receipts = []) {
  if (!receipts.length) return '<p class="empty-detail">No hay recibos.</p>';

  return `<div class="tenant-monthly-table-wrap">
    <table class="tenant-monthly-table">
      <thead>
        <tr>
          <th>Fecha del recibo</th>
          <th>Tipo</th>
          <th>Concepto</th>
          <th>Importe</th>
          <th>Pagado</th>
          <th>Pendiente</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${receipts.map((row) => {
          const rowAttributes = getTenantReceiptPaymentAttributes(row);
          return `<tr${rowAttributes}>
	          <td>${escapeHtml(getTenantReceiptPeriod(row))}</td>
	          <td>${escapeHtml(row.receiptType)}</td>
	          <td><strong>${escapeHtml(getTenantDocumentConcept(row))}</strong></td>
	          <td>${escapeHtml(formatMoney(getTenantDocumentNumericAmount(row)))} €</td>
	          <td>${escapeHtml(formatMoney(getTenantReceiptPaidAmount(row)))} €</td>
	          <td>${escapeHtml(formatMoney(getTenantReceiptPendingAmount(row)))} €</td>
	          <td>${renderTenantDocumentStatus(row)}</td>
	        </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

function getTenantPaymentRows(receipts = []) {
  return receipts.filter((row) => getTenantReceiptPaidAmount(row) !== 0 || row.fecha_pago);
}

function renderTenantPaymentRows(receipts = []) {
  const payments = getTenantPaymentRows(receipts);
  if (!payments.length) return '<p class="empty-detail">No hay pagos aplicados en este periodo.</p>';

  return `<div class="tenant-monthly-table-wrap">
    <h5>Pagos del periodo</h5>
    <table class="tenant-monthly-table">
      <thead>
        <tr>
          <th>Fecha de pago</th>
          <th>Tipo</th>
          <th>Concepto</th>
          <th>Importe pagado</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${payments.map((row) => `<tr>
          <td>${escapeHtml(formatDisplayValue('fecha_pago', row.fecha_pago) || 'Sin fecha')}</td>
          <td>${escapeHtml(row.receiptType)}</td>
          <td><strong>${escapeHtml(getTenantDocumentConcept(row))}</strong></td>
          <td>${escapeHtml(formatMoney(getTenantReceiptPaidAmount(row)))} €</td>
          <td>${renderTenantDocumentStatus(row)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function isTenantCurrentStayActive(tenant = {}) {
  if (tenant.asignacion_activa !== undefined && tenant.asignacion_activa !== null) {
    return Number(tenant.asignacion_activa) === 1 || tenant.asignacion_activa === true;
  }

  if (tenant.activo !== undefined && tenant.activo !== null) {
    return Number(tenant.activo) === 1 || tenant.activo === true;
  }

  if (tenant.fecha_salida) {
    const exitDate = parseTenantDate(tenant.fecha_salida);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Boolean(exitDate && exitDate >= today);
  }

  return Boolean(tenant.id_habitacion || tenant.id_habitacion_inquilino);
}

function renderTenantDocumentActions(tenant) {
  const id = tenant?.id_inquilino;
  const hasDocument = Boolean(tenant?.documento_archivo);
  const hasContract = Boolean(tenant?.id_habitacion && tenant?.id_vivienda);
  const hasSignedContract = Boolean(tenant?.contrato_firmado_archivo);

  return `<div class="tenant-document-actions">
    <button class="button ${hasDocument ? 'primary' : 'ghost'}" data-action="preview-tenant-document" data-id="${escapeHtml(id)}" type="button" ${hasDocument ? '' : 'disabled'}>Ver documento</button>
    <button class="button ${hasContract ? 'primary' : 'ghost'}" data-action="preview-contract" data-id="${escapeHtml(id)}" type="button" ${hasContract ? '' : 'disabled'}>Ver contrato</button>
    <button class="button ${hasSignedContract ? 'primary' : 'ghost'}" data-action="preview-signed-contract" data-id="${escapeHtml(id)}" type="button" ${hasSignedContract ? '' : 'disabled'}>Ver firmado</button>
  </div>`;
}

function renderTenantDocumentsSection(tenant, payments, expenses, allTenants = []) {
  const rentPayments = payments.filter((row) => row.tipo !== 'gasto');
  const tenantExpensePayments = payments.filter((row) => row.tipo === 'gasto');
  const expenseRows = tenantExpensePayments.length ? tenantExpensePayments : expenses;
  const months = buildTenantMonthlyBreakdown(tenant, rentPayments, expenseRows, allTenants);
  return `<section class="tenant-documents-section">
    <div class="tenant-room-history-header" data-action="toggle-tenant-monthly-documents">
      <h4>Recibos mensuales y gastos</h4>
      <button class="tenant-detail-toggle is-collapsed" data-action="toggle-tenant-monthly-documents" type="button" aria-label="Mostrar recibos mensuales y gastos" aria-expanded="false">
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <div class="tenant-monthly-documents is-collapsed" data-tenant-monthly-documents>
      ${renderTenantMonthlyBreakdown(months)}
    </div>
  </section>`;
}

function getTenantRoomHistoryRows(tenant, rows = []) {
  const tenantId = String(tenant?.id_inquilino || '');
  const unique = new Map();
  const sourceRows = rows
    .filter((row) => String(row.id_inquilino || '') === tenantId)
    .concat(tenant || {});

  sourceRows.forEach((row) => {
    if (!row?.id_habitacion && !row?.nombre_habitacion && !row?.fecha_entrada && !row?.fecha_salida) return;
    const key = row.id_habitacion_inquilino
      || [row.id_habitacion, row.fecha_entrada, row.fecha_salida].join('|');
    unique.set(String(key), row);
  });

  return Array.from(unique.values()).sort((left, right) => {
    const leftDate = parseTenantDate(left.fecha_entrada)?.getTime() || 0;
    const rightDate = parseTenantDate(right.fecha_entrada)?.getTime() || 0;
    if (leftDate !== rightDate) return leftDate - rightDate;
    return Number(left.id_habitacion_inquilino || 0) - Number(right.id_habitacion_inquilino || 0);
  });
}

function renderTenantRoomHistorySection(tenant, rows = []) {
  const history = getTenantRoomHistoryRows(tenant, rows);
  if (!history.length) return '';

  const list = history.map((row, index) => {
    const room = [row.nombre_vivienda, row.nombre_habitacion || row.nombre, row.tipo_habitacion || row.tipo]
      .filter(Boolean)
      .join(' · ') || 'Habitación sin nombre';
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
  }).join('');

  return `<section class="tenant-documents-section tenant-room-history-section">
    <div class="tenant-room-history-header" data-action="toggle-tenant-room-history">
      <h4>Cambios de habitación</h4>
      <button class="tenant-detail-toggle is-collapsed" data-action="toggle-tenant-room-history" type="button" aria-label="Mostrar cambios de habitación" aria-expanded="false">
        <span aria-hidden="true">×</span>
      </button>
    </div>
    <div class="tenant-room-change-list is-collapsed" data-tenant-room-history>${list}</div>
  </section>`;
}

async function getTenantDocumentRows(resource, tenantId, tenant = null) {
  try {
    const payload = await request(getResourceEndpoint(resource));
    const rows = getRows(payload);
    if (resource === resources.expenses && tenant?.id_vivienda) {
      return rows.filter((row) => String(row.id_vivienda) === String(tenant.id_vivienda));
    }
    return filterTenantDocumentRows(rows, tenantId);
  } catch {
    return [];
  }
}

async function getTenantFinancialRows(tenantId, tenant = null) {
  const [payments, expenses] = await Promise.all([
    getTenantDocumentRows(resources.payments, tenantId, tenant),
    getTenantDocumentRows(resources.expenses, tenantId, tenant),
  ]);
  return { payments, expenses };
}

function renderTenantDetailSection(title, fields) {
  return `<section class="tenant-detail-section">
    <div class="tenant-detail-section-header">
      <h4>${escapeHtml(title)}</h4>
    </div>
    <dl class="tenant-detail-list">
      ${fields.length ? fields.map(renderTenantDetailField).join('') : '<p class="empty-detail">Sin datos.</p>'}
    </dl>
  </section>`;
}

function getTenantInitials(tenant) {
  const source = [tenant?.nombre, tenant?.apellido1].filter(Boolean);
  const initials = source.length
    ? source.map((part) => String(part)[0]).join('')
    : String(tenant?.email || 'IN').slice(0, 2);
  return initials.toUpperCase();
}

function getTenantAvatarUrl(tenant) {
  if (!tenant?.avatar_archivo) return '';
  const version = encodeURIComponent(tenant.updated_at || tenant.avatar_archivo || Date.now());
  return `/mijornalrooms/${tenant.avatar_archivo}?v=${version}`;
}

async function openTenantDetail(row) {
  const id = row.dataset.id;
  if (!id || !detailPanel) return;

  state.activeTenantDetailId = id;
  if (tableWrap) tableWrap.classList.add('hidden');
  updateTenantSortFilterVisibility();
  if (typeof renderTenantSectionActions === 'function') renderTenantSectionActions();
  detailPanel.classList.remove('hidden');
  detailPanel.innerHTML = '<p class="detail-loading">Cargando inquilino...</p>';

  const tenant = await request(`/api/tenant/${id}`);
  const { payments, expenses } = await getTenantFinancialRows(id, tenant);
  let tenantAssignmentRows = typeof state !== 'undefined' && Array.isArray(state.tenantAssignmentRows)
    ? state.tenantAssignmentRows
    : [];
  try {
    tenantAssignmentRows = getRows(await request('/api/room-tenant?page=1&limit=100'));
    if (typeof state !== 'undefined') state.tenantAssignmentRows = tenantAssignmentRows;
  } catch {
    tenantAssignmentRows = tenantAssignmentRows.filter((item) => String(item.id_inquilino || '') === String(id));
  }
  const tenantContextRows = typeof state !== 'undefined' && Array.isArray(state.rows) && state.rows.length
    ? state.rows
    : [tenant];
  const tenantWithDisplayFields = {
    ...tenant,
    apellidos: [tenant.apellido1, tenant.apellido2].filter(Boolean).join(' '),
    documento_identificacion: [tenant.identificacion, tenant.numero_documento].filter(Boolean).join(' '),
  };
  const visibleEntries = Object.entries(tenantWithDisplayFields || {}).filter(([key]) => (
    !hiddenTenantDetailFields.has(key) && key !== 'apellido1' && key !== 'apellido2'
  ));
  const visibleByKey = new Map(visibleEntries);
  const takeFields = (keys) => keys.filter((key) => visibleByKey.has(key)).map((key) => [key, visibleByKey.get(key)]);
  const assignedFields = new Set([...tenantPersonalFields, ...tenantHousingFields]);
  const personalFields = takeFields(tenantPersonalFields);
  const housingFields = takeFields(tenantHousingFields).concat(
    visibleEntries.filter(([key]) => !assignedFields.has(key))
  );
  const fullName = [tenant.nombre, tenant.apellido1, tenant.apellido2].filter(Boolean).join(' ') || `Inquilino #${id}`;
  const fallbackAvatar = escapeHtml(getTenantInitials(tenant));
  const isActiveTenant = isTenantCurrentStayActive(tenant);
  const statusLabel = isActiveTenant ? 'Activo' : 'Desactivado';
  const statusClass = isActiveTenant ? 'is-active' : 'is-inactive';

  detailPanel.innerHTML = `<article class="tenant-file">
    <div class="tenant-file-header" data-action="toggle-tenant-detail-columns">
      <div class="tenant-file-identity">
        <div class="tenant-file-avatar-zone">
          <span class="tenant-file-avatar" data-tenant-detail-avatar data-avatar-user-id="${escapeHtml(tenant.id_usuario || '')}">${fallbackAvatar}</span>
          <span class="tenant-status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div>
          <p class="eyebrow">Ficha de inquilino</p>
          <h3>${escapeHtml(fullName)}</h3>
          <p>${escapeHtml(tenant.email || '')}</p>
        </div>
      </div>
      <button class="tenant-detail-toggle is-collapsed" data-action="toggle-tenant-detail-columns" type="button" aria-label="Mostrar datos de ficha" aria-expanded="false">
        <span aria-hidden="true">×</span>
      </button>
    </div>
    ${renderTenantDocumentActions(tenant)}
    <div class="tenant-detail-columns is-collapsed" data-tenant-detail-columns>
      ${renderTenantDetailSection('Datos personales', personalFields)}
      ${renderTenantDetailSection('Vivienda y contrato', housingFields)}
    </div>
    ${renderTenantDocumentsSection(tenant, payments, expenses, tenantContextRows)}
    ${renderTenantRoomHistorySection(tenant, tenantAssignmentRows)}
  </article>`;

  if (tenant.id_usuario && tenant.avatar_archivo && typeof loadUserAvatarInto === 'function') {
    loadUserAvatarInto(detailPanel.querySelector('[data-tenant-detail-avatar]'), tenant.id_usuario, '', tenant.avatar_archivo)
      .catch(() => {});
  }
}

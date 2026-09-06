let appData = { products: {}, branches: {} };
let salesData = [];
let returnData = [];
let branchChartInstance = null;
let itemChartInstance = null;
let html5QrCode = null;

// Initialize Database on Page Load
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('data.json');
    appData = await res.json();
    
    populateBrandDropdown();
    updateBranchSlicer(); // Dynamically populate branches based on brand selection
    initCharts();
  } catch (err) {
    console.error("Failed loading data database:", err);
  }
});

// Brand Dropdown Initialization
function populateBrandDropdown() {
  const bSelect = document.getElementById('driverBrand');
  bSelect.innerHTML = '';
  Object.keys(appData.branches).forEach(brand => {
    bSelect.innerHTML += `<option value="${brand}">${brand}</option>`;
  });
  
  // Re-filter branch slicer whenever brand changes
  bSelect.addEventListener('change', () => {
    updateBranchSlicer();
    // Refresh barcode lookup price if a barcode is already scanned
    const currentBarcode = document.getElementById('scannedBarcode').value;
    if (currentBarcode) lookupBarcodeDetails(currentBarcode);
  });
}

// Branch Slicer Filtering Logic
function updateBranchSlicer() {
  const selectedBrand = document.getElementById('driverBrand').value;
  const brSelect = document.getElementById('driverBranch');
  brSelect.innerHTML = '';

  const branchList = appData.branches[selectedBrand] || [];
  branchList.forEach(branch => {
    brSelect.innerHTML += `<option value="${branch}">${branch}</option>`;
  });
}

// Navigation Tab Switcher
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active-nav'));
  
  document.getElementById(`tab-${tabId}`).classList.remove('hidden');
  document.getElementById(`btn-${tabId}`).classList.add('active-nav');
}

// Camera Scanner Implementation
function startScanner() {
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("reader");
  }
  
  html5QrCode.start(
    { facingMode: "environment" }, 
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedBarcode) => {
      document.getElementById('scannedBarcode').value = decodedBarcode;
      lookupBarcodeDetails(decodedBarcode);
      html5QrCode.stop();
    }
  ).catch(err => alert("Camera permission or initialization error: " + err));
}

// Dynamic Barcode & Price Lookup Function
function lookupBarcodeDetails(barcode) {
  const selectedBrand = document.getElementById('driverBrand').value;
  const product = appData.products[barcode];

  if (product) {
    // Dynamic price selection: Canteen vs Trolley channel pricing
    const price = (selectedBrand === 'Canteen') ? product.canteenPrice : product.trolleyPrice;
    
    document.getElementById('itemName').value = product.name;
    document.getElementById('unitPrice').value = price.toFixed(3);
    document.getElementById('rspPrice').value = price.toFixed(3);
  } else {
    alert("Barcode not found in database! Please check barcode number.");
    document.getElementById('itemName').value = "Unknown Item";
    document.getElementById('unitPrice').value = "0.000";
    document.getElementById('rspPrice').value = "0.000";
  }
}

// Driver Return Entry Submission
document.getElementById('driverForm').addEventListener('submit', (e) => {
  e.preventDefault();
  
  const barcode = document.getElementById('scannedBarcode').value || "7517846597753"; 
  const itemName = document.getElementById('itemName').value || "Beef Stroganoff with Penne Pasta";
  const qty = parseInt(document.getElementById('returnQty').value) || 1;
  const unitPrice = parseFloat(document.getElementById('unitPrice').value) || 0;
  const rsp = parseFloat(document.getElementById('rspPrice').value) || 0;

  const totalAmount = qty * unitPrice;
  const totalRspAmount = qty * rsp;

  const returnEntry = {
    returnDate: document.getElementById('returnDate').value,
    productionDate: document.getElementById('productionDate').value,
    invoiceNo: document.getElementById('retInvoiceNo').value,
    brand: document.getElementById('driverBrand').value,
    branchName: document.getElementById('driverBranch').value,
    barcodeNo: barcode,
    itemName: itemName,
    unitPrice: unitPrice,
    rsp: rsp,
    totalAmount: totalAmount,
    totalRspAmount: totalRspAmount
  };

  returnData.push(returnEntry);
  updateReturnTable();
  updateAnalytics();
  alert("Return entry logged successfully!");
  e.target.reset();
});

// Excel File Parser (Sales Hub)
function handleExcelUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    salesData = json.map(row => ({
      date: row.Date || new Date().toISOString().split('T')[0],
      invoiceNo: row['Invoice No'] || 'INV-000',
      accountName: row['Account Name'] || 'General Account',
      brand: row.Brand || 'Canteen',
      barcodeNo: row['Barcode No'] || '00000000',
      itemName: row['Item Name'] || 'Sample Item',
      unitPrice: parseFloat(row['Unit Price'] || 0),
      rsp: parseFloat(row.RSP || 0),
      totalAmount: parseFloat(row['Total Amount'] || 0),
      totalRspAmount: parseFloat(row['Total RSP Amount'] || 0)
    }));

    updateSalesTable();
    updateAnalytics();
  };
  reader.readAsArrayBuffer(file);
}

// Table Rendering Functions
function updateSalesTable() {
  const tbody = document.getElementById('salesTableBody');
  tbody.innerHTML = salesData.map(row => `
    <tr class="border-b bg-white hover:bg-gray-50">
      <td class="px-4 py-3">${row.date}</td>
      <td class="px-4 py-3">${row.invoiceNo}</td>
      <td class="px-4 py-3">${row.accountName}</td>
      <td class="px-4 py-3">${row.brand}</td>
      <td class="px-4 py-3">${row.barcodeNo}</td>
      <td class="px-4 py-3">${row.itemName}</td>
      <td class="px-4 py-3">KWD ${row.unitPrice.toFixed(3)}</td>
      <td class="px-4 py-3">KWD ${row.rsp.toFixed(3)}</td>
      <td class="px-4 py-3">KWD ${row.totalAmount.toFixed(3)}</td>
      <td class="px-4 py-3">KWD ${row.totalRspAmount.toFixed(3)}</td>
    </tr>
  `).join('');
}

function updateReturnTable() {
  const tbody = document.getElementById('returnTableBody');
  tbody.innerHTML = returnData.map(row => `
    <tr class="border-b bg-white hover:bg-gray-50">
      <td class="px-4 py-3">${row.returnDate}</td>
      <td class="px-4 py-3 font-semibold text-amber-600">${row.productionDate}</td>
      <td class="px-4 py-3">${row.invoiceNo}</td>
      <td class="px-4 py-3">${row.brand}</td>
      <td class="px-4 py-3 font-medium text-slate-800">${row.branchName}</td>
      <td class="px-4 py-3">${row.barcodeNo}</td>
      <td class="px-4 py-3">${row.itemName}</td>
      <td class="px-4 py-3">KWD ${row.unitPrice.toFixed(3)}</td>
      <td class="px-4 py-3 font-semibold text-indigo-600">KWD ${row.rsp.toFixed(3)}</td>
      <td class="px-4 py-3">KWD ${row.totalAmount.toFixed(3)}</td>
      <td class="px-4 py-3">KWD ${row.totalRspAmount.toFixed(3)}</td>
    </tr>
  `).join('');
}

// Export Table Data to Excel
function exportToExcel(tableId, filename) {
  const table = document.getElementById(tableId);
  const wb = XLSX.utils.table_to_book(table, { sheet: "Data" });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Analytics Charts & KPI Computation
function initCharts() {
  const ctx1 = document.getElementById('branchChart').getContext('2d');
  branchChartInstance = new Chart(ctx1, {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'Returns Value (KWD)', data: [], backgroundColor: '#ef4444' }] }
  });

  const ctx2 = document.getElementById('itemChart').getContext('2d');
  itemChartInstance = new Chart(ctx2, {
    type: 'doughnut',
    data: { labels: [], datasets: [{ data: [], backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'] }] }
  });
}

function updateAnalytics() {
  const totalSales = salesData.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalReturns = returnData.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const returnRate = totalSales > 0 ? ((totalReturns / totalSales) * 100).toFixed(1) : 0;

  document.getElementById('kpi-sales').innerText = `KWD ${totalSales.toFixed(3)}`;
  document.getElementById('kpi-returns').innerText = `KWD ${totalReturns.toFixed(3)}`;
  document.getElementById('kpi-rate').innerText = `${returnRate}%`;

  // Aggregate return values per Branch Name
  const branchTotals = {};
  returnData.forEach(r => {
    branchTotals[r.branchName] = (branchTotals[r.branchName] || 0) + r.totalAmount;
  });

  // Aggregate return values per Item Name
  const itemTotals = {};
  returnData.forEach(r => {
    itemTotals[r.itemName] = (itemTotals[r.itemName] || 0) + r.totalAmount;
  });

  // Top Performing/Highest Return Branch
  const topBranch = Object.keys(branchTotals).reduce((a, b) => branchTotals[a] > branchTotals[b] ? a : b, 'N/A');
  document.getElementById('kpi-top-branch').innerText = topBranch;

  // Render Charts
  branchChartInstance.data.labels = Object.keys(branchTotals);
  branchChartInstance.data.datasets[0].data = Object.values(branchTotals);
  branchChartInstance.update();

  itemChartInstance.data.labels = Object.keys(itemTotals);
  itemChartInstance.data.datasets[0].data = Object.values(itemTotals);
  itemChartInstance.update();
}

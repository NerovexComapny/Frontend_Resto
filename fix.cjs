const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/manager/DashboardPage.jsx',
  'src/pages/manager/MenuManagementPage.jsx',
  'src/pages/manager/TablesPage.jsx',
  'src/pages/manager/OrdersPage.jsx',
  'src/pages/manager/StaffPage.jsx',
  'src/pages/manager/ReportsPage.jsx',
  'src/pages/waiter/WaiterOrdersPage.jsx',
  'src/pages/cashier/CashierPage.jsx',
  'src/pages/kitchen/KitchenDisplayPage.jsx',
  'src/pages/auth/LoginPage.jsx',
  'src/pages/client/MenuPage.jsx'
];

files.forEach(f => {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;

  if (content.includes('require(')) {
    content = content.replace(/const\s+(.*?)\s*=\s*require\((.*?)\)(.*?);/g, 'import $1 from $2;');
    changed = true;
  }
  if (content.includes('module.exports =')) {
    content = content.replace(/module\.exports = (.*?);/g, 'export default $1;');
    changed = true;
  }
  
  if (f.startsWith('src/pages/manager/')) {
    if (content.includes('ManagerLayout') && !content.includes('../../layouts/ManagerLayout')) {
      content = content.replace(/import\s+ManagerLayout\s+from\s+['"].*?layouts\/ManagerLayout['"];?/g, 'import ManagerLayout from \'../../layouts/ManagerLayout\';');
      changed = true;
    }
  }

  // Ensure api and useAuthStore are correctly imported
  if (content.includes('useAuthStore') && !content.includes('../../store/authStore')) {
     content = content.replace(/import\s+useAuthStore\s+from\s+['"].*?store\/authStore['"];?/g, 'import useAuthStore from \'../../store/authStore\';');
     changed = true;
  }
  
  if (content.includes('api') && content.includes('/services/api') && !content.includes('../../services/api')) {
     content = content.replace(/import\s+api\s+from\s+['"].*?services\/api['"];?/g, 'import api from \'../../services/api\';');
     changed = true;
  }
  
  if (changed) {
    console.log('Fixed', f);
    fs.writeFileSync(p, content);
  }
});

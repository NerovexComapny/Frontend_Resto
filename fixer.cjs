const fs = require('fs');

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
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf-8');
    let changed = false;

    // 1. & 2. require / module.exports
    if (content.includes('require(')) {
      content = content.replace(/const\s+(.*?)\s*=\s*require\(['"](.*?)['"]\);?/g, 'import $1 from \'$2\';');
      changed = true;
    }
    if (content.includes('module.exports')) {
      content = content.replace(/module\.exports\s*=\s*(.*?);?/g, 'export default $1;');
      changed = true;
    }

    // 3. Import ManagerLayout correctly from ../../layouts/ManagerLayout
    if (content.includes('ManagerLayout') && f.includes('/manager/')) {
      content = content.replace(/import ManagerLayout from ['"].*?['"];?/g, "import ManagerLayout from '../../layouts/ManagerLayout';");
      changed = true;
    }

    // 4. Import useAuthStore correctly from ../../store/authStore
    if (content.includes('useAuthStore')) {
      content = content.replace(/import useAuthStore from ['"].*?['"];?/g, "import useAuthStore from '../../store/authStore';");
      changed = true;
    }

    // 5. Import api correctly from ../../services/api
    if (content.includes('import api from')) {
      content = content.replace(/import api from ['"].*?['"];?/g, "import api from '../../services/api';");
      changed = true;
    }

    if (changed) {
      console.log('Fixed', f);
      fs.writeFileSync(f, content);
    } else {
      console.log('Checked OK', f);
    }
  } else {
    console.log('MISSING', f);
  }
});

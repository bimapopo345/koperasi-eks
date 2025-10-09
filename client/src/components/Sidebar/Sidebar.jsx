import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const Sidebar = () => {
  const location = useLocation();
  const authStatus = useSelector((state) => state.auth.status);

  const menuItems = [
    {
      name: "Dashboard",
      icon: "📊",
      path: "/dashboard",
    },
    {
      name: "Simpanan",
      icon: "💰",
      path: "/simpanan",
      children: [
        {
          name: "Setoran",
          path: "/simpanan/setoran",
        },
        {
          name: "Penarikan",
          path: "/simpanan/penarikan",
        },
      ],
    },
    {
      name: "Master Data",
      icon: "📋",
      path: "/master",
      children: [
        {
          name: "Anggota",
          path: "/master/anggota",
        },
        {
          name: "Produk Simpanan",
          path: "/master/produk",
        },
      ],
    },
    {
      name: "Laporan",
      icon: "📈",
      path: "/laporan",
      children: [
        {
          name: "Transaksi",
          path: "/laporan/transaksi",
        },
        {
          name: "Keuangan",
          path: "/laporan/keuangan",
        },
      ],
    },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  const renderMenuItems = (items) => {
    return items.map((item) => (
      <div key={item.name}>
        <Link
          to={item.path}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
            isActive(item.path)
              ? "bg-indigo-600 text-white"
              : "text-gray-300 hover:bg-gray-800 hover:text-white"
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          <span className="font-medium">{item.name}</span>
        </Link>
        {item.children && (
          <div className="ml-4 mt-1">
            {item.children.map((child) => (
              <Link
                key={child.name}
                to={child.path}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive(child.path)
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <span className="text-sm">{child.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    ));
  };

  if (!authStatus) return null;

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-6">Menu</h2>
        <nav className="space-y-1">{renderMenuItems(menuItems)}</nav>
      </div>
    </aside>
  );
};

export default Sidebar;

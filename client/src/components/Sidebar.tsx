import React from 'react';
import { Link, useLocation } from 'wouter';
import { BarChart3, ClipboardList, PieChart, Settings, ChartLine, User } from 'lucide-react';

const Sidebar = () => {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/', 
      icon: <BarChart3 className="h-5 w-5" />,
      active: isActive('/')
    },
    { 
      name: 'Trades', 
      path: '/trades', 
      icon: <ClipboardList className="h-5 w-5" />,
      active: isActive('/trades')
    },
    { 
      name: 'Analytics', 
      path: '/analytics', 
      icon: <PieChart className="h-5 w-5" />,
      active: isActive('/analytics')
    },
    { 
      name: 'Settings', 
      path: '/settings', 
      icon: <Settings className="h-5 w-5" />,
      active: isActive('/settings')
    },
  ];

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 bg-gray-800">
        <div className="flex items-center h-16 px-4 bg-gray-900">
          <div className="flex items-center">
            <ChartLine className="h-6 w-6 text-blue-500 mr-2" />
            <span className="text-white font-semibold text-lg">TradeSnap</span>
          </div>
        </div>
        <div className="flex flex-col flex-grow overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a className={`flex items-center px-2 py-2 text-sm font-medium rounded-md group ${
                  item.active
                    ? 'text-white bg-gray-700'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}>
                  <div className={`mr-3 ${item.active ? 'text-gray-300' : 'text-gray-400'}`}>
                    {item.icon}
                  </div>
                  {item.name}
                </a>
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex-shrink-0 p-4 border-t border-gray-700">
          <div className="flex items-center">
            <div>
              <div className="rounded-full h-9 w-9 flex items-center justify-center bg-gray-600 text-white">
                <User className="h-5 w-5" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">John Trader</p>
              <p className="text-xs font-medium text-gray-400">View profile</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

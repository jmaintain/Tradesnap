import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface PerformanceCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  textColor?: string;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({
  title,
  value,
  icon,
  iconBgColor,
  textColor = 'text-gray-900',
}) => {
  return (
    <Card className="overflow-hidden shadow">
      <CardContent className="p-0">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${iconBgColor} rounded-md p-3`}>
              {icon}
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                <dd className={`flex items-center text-lg font-semibold ${textColor}`}>
                  {value}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceCard;

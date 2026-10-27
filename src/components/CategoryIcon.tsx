/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Utensils, 
  Home, 
  Car, 
  Briefcase, 
  Tv, 
  Activity, 
  CircleEllipsis,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Settings,
  X,
  Plus,
  Trash2,
  Edit2,
  Search,
  Calendar,
  Sparkles,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Moon,
  Sun,
  User,
  PieChart,
  LogOut,
  Download,
  Upload,
  ChevronRight,
  Filter,
  Coffee,
  Zap,
  Shirt,
  GraduationCap,
  Wifi,
  CreditCard
} from 'lucide-react';

interface CategoryIconProps {
  category: string;
  className?: string;
  size?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = '', size = 20 }) => {
  switch (category) {
    case 'Oziq-ovqat':
      return <Utensils className={className} size={size} />;
    case 'Ijara':
    case 'Ijara va Uy':
      return <Home className={className} size={size} />;
    case 'Transport':
      return <Car className={className} size={size} />;
    case 'Kafe va Restoran':
      return <Coffee className={className} size={size} />;
    case 'Kommunal to\'lovlar':
      return <Zap className={className} size={size} />;
    case 'Kiyim-kechak':
      return <Shirt className={className} size={size} />;
    case 'Sog\'liq':
      return <Activity className={className} size={size} />;
    case 'Ta\'lim va Kitoblar':
      return <GraduationCap className={className} size={size} />;
    case 'Telefon va Internet':
      return <Wifi className={className} size={size} />;
    case 'Ko\'ngilochar':
      return <Tv className={className} size={size} />;
    case 'Kredit va Qarz':
      return <CreditCard className={className} size={size} />;
    case 'Maosh':
      return <Briefcase className={className} size={size} />;
    default:
      return <CircleEllipsis className={className} size={size} />;
  }
};

export const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'Oziq-ovqat':
      return {
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-600 dark:text-amber-400',
        progress: 'bg-amber-500'
      };
    case 'Ijara':
    case 'Ijara va Uy':
      return {
        bg: 'bg-purple-500/10 dark:bg-purple-500/20',
        text: 'text-purple-600 dark:text-purple-400',
        progress: 'bg-purple-500'
      };
    case 'Transport':
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        progress: 'bg-emerald-500'
      };
    case 'Kafe va Restoran':
      return {
        bg: 'bg-orange-500/10 dark:bg-orange-500/20',
        text: 'text-orange-600 dark:text-orange-400',
        progress: 'bg-orange-500'
      };
    case 'Kommunal to\'lovlar':
      return {
        bg: 'bg-sky-500/10 dark:bg-sky-500/20',
        text: 'text-sky-600 dark:text-sky-400',
        progress: 'bg-sky-500'
      };
    case 'Kiyim-kechak':
      return {
        bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
        text: 'text-indigo-600 dark:text-indigo-400',
        progress: 'bg-indigo-500'
      };
    case 'Sog\'liq':
      return {
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        text: 'text-rose-600 dark:text-rose-400',
        progress: 'bg-rose-500'
      };
    case 'Ta\'lim va Kitoblar':
      return {
        bg: 'bg-teal-500/10 dark:bg-teal-500/20',
        text: 'text-teal-600 dark:text-teal-400',
        progress: 'bg-teal-500'
      };
    case 'Telefon va Internet':
      return {
        bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
        text: 'text-cyan-600 dark:text-cyan-400',
        progress: 'bg-cyan-500'
      };
    case 'Ko\'ngilochar':
      return {
        bg: 'bg-pink-500/10 dark:bg-pink-500/20',
        text: 'text-pink-600 dark:text-pink-400',
        progress: 'bg-pink-500'
      };
    case 'Kredit va Qarz':
      return {
        bg: 'bg-slate-500/10 dark:bg-slate-500/20',
        text: 'text-slate-600 dark:text-slate-400',
        progress: 'bg-slate-500'
      };
    case 'Maosh':
      return {
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        text: 'text-blue-600 dark:text-blue-400',
        progress: 'bg-blue-500'
      };
    default:
      return {
        bg: 'bg-gray-500/10 dark:bg-gray-500/20',
        text: 'text-gray-600 dark:text-gray-400',
        progress: 'bg-gray-500'
      };
  }
};

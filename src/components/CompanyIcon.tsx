import React from 'react';
import {
  SiGoogle,
  SiAmazon,
  SiMeta,
  SiApple,
  SiNetflix,
  SiNvidia,
  SiTesla,
  SiUber,
  SiAirbnb,
  SiAdobe,
  SiSalesforce,
  SiOracle,
  SiIntel,
  SiCisco,
  SiPaypal,
  SiSpotify,
  SiTiktok, // For ByteDance
  SiLinkedin,
  SiZoom,
} from 'react-icons/si';
import { 
  Building2, 
  Square, 
  MessageCircle,
  DollarSign,
  CreditCard,
  Globe,
  Database,
  Server,
  Cloud,
  ShoppingBag,
  Briefcase,
  TrendingUp,
  Users,
  Package,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface CompanyIconProps {
  company: string;
  size?: number;
  className?: string;
}

const CompanyIcon: React.FC<CompanyIconProps> = ({ 
  company, 
  size = 20, 
  className = "" 
}) => {
  const { isDark } = useTheme();

  const getCompanyIcon = (companyName: string) => {
    const normalizedName = companyName.toLowerCase().replace(/\s+/g, '');
    
    const iconMap: Record<string, { 
      icon: React.ComponentType<any>; 
      color: string;
      darkColor?: string; // Optional dark mode color
      name: string; 
    }> = {
      'google': { 
        icon: SiGoogle, 
        color: '#4285F4', 
        name: 'Google' 
      },
      'amazon': { 
        icon: SiAmazon, 
        color: '#FF9900', 
        name: 'Amazon' 
      },
      'meta': { 
        icon: SiMeta, 
        color: '#1877F2', 
        name: 'Meta' 
      },
      'microsoft': { 
        icon: Building2,
        color: '#00A4EF', 
        name: 'Microsoft' 
      },
      'ms': { 
        icon: Building2,
        color: '#00A4EF', 
        name: 'Microsoft' 
      },
      'apple': { 
        icon: SiApple, 
        color: '#000000',
        darkColor: '#FFFFFF', 
        name: 'Apple' 
      },
      'netflix': { 
        icon: SiNetflix, 
        color: '#E50914', 
        name: 'Netflix' 
      },
      'nvidia': { 
        icon: SiNvidia, 
        color: '#76B900', 
        name: 'NVIDIA' 
      },
      'tesla': { 
        icon: SiTesla, 
        color: '#CC0000', 
        name: 'Tesla' 
      },
      'uber': { 
        icon: SiUber, 
        color: '#000000',
        darkColor: '#FFFFFF', 
        name: 'Uber' 
      },
      'airbnb': { 
        icon: SiAirbnb, 
        color: '#FF5A5F', 
        name: 'Airbnb' 
      },
      'adobe': { 
        icon: SiAdobe, 
        color: '#FF0000', 
        name: 'Adobe' 
      },
      'salesforce': { 
        icon: SiSalesforce, 
        color: '#00A1E0', 
        name: 'Salesforce' 
      },
      'oracle': { 
        icon: SiOracle, 
        color: '#F80000', 
        name: 'Oracle' 
      },
      'ibm': { 
        icon: Building2, 
        color: '#006699', 
        name: 'IBM' 
      },
      'intel': { 
        icon: SiIntel, 
        color: '#0071C5', 
        name: 'Intel' 
      },
      'cisco': { 
        icon: SiCisco, 
        color: '#1BA0D7', 
        name: 'Cisco' 
      },
      'paypal': { 
        icon: SiPaypal, 
        color: '#003087', 
        name: 'PayPal' 
      },
      'spotify': { 
        icon: SiSpotify, 
        color: '#1ED760', 
        name: 'Spotify' 
      },
      'bytedance': { 
        icon: SiTiktok, 
        color: '#000000',
        darkColor: '#FFFFFF', 
        name: 'TikTok' 
      },
      'zoom': { 
        icon: SiZoom, 
        color: '#2D8CFF', 
        name: 'Zoom' 
      },
      'atlassian': { 
        icon: Briefcase, 
        color: '#0052CC', 
        name: 'Atlassian' 
      },
      'bloomberg': { 
        icon: TrendingUp, 
        color: '#000000',
        darkColor: '#FFFFFF',
        name: 'Bloomberg' 
      },
      'booking.com': { 
        icon: Building2, 
        color: '#003580', 
        name: 'Booking.com' 
      },
      'booking': { 
        icon: Building2, 
        color: '#003580', 
        name: 'Booking.com' 
      },
      'canva': { 
        icon: Package, 
        color: '#00C4CC', 
        name: 'Canva' 
      },
      'coinbase': { 
        icon: DollarSign, 
        color: '#0052FF', 
        name: 'Coinbase' 
      },
      'databricks': { 
        icon: Database, 
        color: '#FF3621', 
        name: 'Databricks' 
      },
      'datadog': { 
        icon: Server, 
        color: '#632CA6', 
        name: 'Datadog' 
      },
      'doordash': { 
        icon: ShoppingBag, 
        color: '#FF3008', 
        name: 'DoorDash' 
      },
      'dropbox': { 
        icon: Cloud, 
        color: '#0061FF', 
        name: 'Dropbox' 
      },
      'ebay': { 
        icon: ShoppingBag, 
        color: '#E53238', 
        name: 'eBay' 
      },
      'facebook': { 
        icon: Users, 
        color: '#1877F2', 
        name: 'Facebook' 
      },
      'flipkart': { 
        icon: ShoppingBag, 
        color: '#2874F0', 
        name: 'Flipkart' 
      },
      'linkedin': { 
        icon: SiLinkedin, 
        color: '#0077B5', 
        name: 'LinkedIn' 
      },
      'lyft': { 
        icon: Building2, 
        color: '#FF00BF', 
        name: 'Lyft' 
      },
      'notion': { 
        icon: Briefcase, 
        color: '#000000',
        darkColor: '#FFFFFF',
        name: 'Notion' 
      },
      'pinterest': { 
        icon: Globe, 
        color: '#BD081C', 
        name: 'Pinterest' 
      },
      'revolut': { 
        icon: CreditCard, 
        color: '#0075EB', 
        name: 'Revolut' 
      },
      'roblox': { 
        icon: Package, 
        color: '#000000',
        darkColor: '#FFFFFF',
        name: 'Roblox' 
      },
      'square': { 
        icon: Square, 
        color: '#3E4348', 
        name: 'Square' 
      },
      'stripe': { 
        icon: CreditCard, 
        color: '#635BFF', 
        name: 'Stripe' 
      },
      'twitch': { 
        icon: Globe, 
        color: '#9146FF', 
        name: 'Twitch' 
      },
      'twitter': { 
        icon: MessageCircle, 
        color: '#1DA1F2', 
        name: 'Twitter/X' 
      },
      'x': { 
        icon: MessageCircle, 
        color: '#000000',
        darkColor: '#FFFFFF',
        name: 'X (Twitter)' 
      },
      'visa': { 
        icon: CreditCard, 
        color: '#1A1F71', 
        name: 'Visa' 
      },
      // Aliases for common variations
      'faang': { 
        icon: Building2, // FAANG is a group, use generic icon
        color: '#6B7280',
        darkColor: '#9CA3AF',
        name: 'FAANG' 
      },
      'capitalone': { 
        icon: Building2, 
        color: '#004977', 
        name: 'Capital One' 
      },
      // Handle PayPal capitalization variations (already defined above, but ensure consistency)
      // Note: 'paypal' is already defined above, this is just for reference
    };

    return iconMap[normalizedName] || { 
      icon: Building2, 
      color: '#6B7280',
      darkColor: '#9CA3AF',
      name: companyName 
    };
  };

  const companyData = getCompanyIcon(company);
  const IconComponent = companyData.icon;
  
  // Use dark color if available and in dark mode, otherwise use regular color
  const iconColor = isDark && companyData.darkColor ? companyData.darkColor : companyData.color;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-sm hover:bg-secondary/50 p-1 transition-colors bg-background/50 border border-border/20 ${className}`}
      title={companyData.name}
    >
      <IconComponent 
        size={size}
        style={{ color: iconColor }}
        className="drop-shadow-sm"
      />
    </div>
  );
};

export default CompanyIcon;

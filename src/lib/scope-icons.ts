import {
  Ban,
  Clock,
  Eye,
  KeyRound,
  LogIn,
  type LucideIcon,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";

const SCOPE_ICONS: Record<string, LucideIcon> = {
  openid: LogIn,
  profile: User,
  name: User,
  email: Mail,
  address: MapPin,
  phone: Phone,
  offline_access: Clock,
  grant_management_query: Eye,
  grant_management_revoke: Ban,
};

export const scopeIcon = (name: string): LucideIcon => SCOPE_ICONS[name] ?? KeyRound;
